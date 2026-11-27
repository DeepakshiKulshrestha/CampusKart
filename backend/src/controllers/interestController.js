import Interest from '../models/Interest.model.js';
import Product from '../models/Product.model.js';
import Transaction from '../models/Transaction.model.js';
import { INTEREST_TRANSITIONS } from '../models/constants.js';
import { createInterestSchema, interestQuerySchema, updateInterestSchema, validationError } from '../utils/validation.js';
import { paginated, rejectInvalidId, isValidationError } from '../utils/http.js';

// Product card fields + only the first image; people are shown by name only (no emails for students)
const POPULATE = [
  { path: 'productId', select: { title: 1, price: 1, status: 1, images: { $slice: 1 } } },
  { path: 'buyerId', select: 'name' },
  { path: 'sellerId', select: 'name' },
];

// POST /api/products/:id/interest (protected)
async function createInterest(req, res, next) {
  if (rejectInvalidId(req, res, 'product')) return;
  const parsed = createInterestSchema.safeParse(req.body ?? {});
  if (!parsed.success) return validationError(res, parsed.error);

  try {
    const product = await Product.findById(req.params.id);
    if (!product || product.status === 'REMOVED') {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    if (product.sellerId.equals(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You cannot express interest in your own listing' });
    }
    if (product.status !== 'AVAILABLE') {
      return res.status(409).json({ success: false, message: 'This product is no longer available' });
    }

    const interest = await Interest.create({
      productId: product._id,
      buyerId: req.user._id,
      sellerId: product.sellerId, // from the product, never from the request
      message: parsed.data.message ?? '',
    });
    await interest.populate(POPULATE);
    return res.status(201).json({ success: true, interest });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'You have already sent an interest for this product' });
    }
    next(err);
  }
}

// GET /api/interests?role=buyer|seller&status=&page=&limit= (protected)
async function getInterests(req, res, next) {
  const parsed = interestQuerySchema.safeParse(req.query);
  if (!parsed.success) return validationError(res, parsed.error);
  const { role, status, page, limit } = parsed.data;

  const me = req.user._id;
  const filter =
    role === 'buyer' ? { buyerId: me } : role === 'seller' ? { sellerId: me } : { $or: [{ buyerId: me }, { sellerId: me }] };
  if (status) filter.status = status;

  try {
    const [items, total] = await Promise.all([
      Interest.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate(POPULATE)
        .lean(),
      Interest.countDocuments(filter),
    ]);
    return res.json(paginated(items, total, page, limit));
  } catch (err) {
    next(err);
  }
}

// PUT /api/interests/:id { status } (protected)
// Seller: ACCEPTED / REJECTED. Buyer: CANCELLED. Anyone else: 403.
async function updateInterest(req, res, next) {
  if (rejectInvalidId(req, res, 'interest')) return;
  const parsed = updateInterestSchema.safeParse(req.body ?? {});
  if (!parsed.success) return validationError(res, parsed.error);
  const { status } = parsed.data;

  try {
    const interest = await Interest.findById(req.params.id);
    if (!interest) return res.status(404).json({ success: false, message: 'Interest not found' });

    const isSeller = interest.sellerId.equals(req.user._id);
    const isBuyer = interest.buyerId.equals(req.user._id);
    const allowed = (isSeller && ['ACCEPTED', 'REJECTED'].includes(status)) || (isBuyer && status === 'CANCELLED');
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'You are not allowed to make this change' });
    }

    // Same rule the model enforces on save, checked first so we can answer 409 instead of 400
    if (!(INTEREST_TRANSITIONS[interest.status] || []).includes(status)) {
      return res
        .status(409)
        .json({ success: false, message: `Interest cannot change from ${interest.status} to ${status}` });
    }

    if (status === 'ACCEPTED') {
      const product = await Product.findById(interest.productId);
      if (!product || product.status !== 'AVAILABLE') {
        return res.status(409).json({ success: false, message: 'The product is no longer available' });
      }
    }

    if (status === 'CANCELLED' && interest.transactionId) {
      const tx = await Transaction.findById(interest.transactionId);
      if (tx && tx.transactionStatus !== 'CANCELLED') {
        return res
          .status(409)
          .json({ success: false, message: 'This interest already has a transaction; cancel the transaction instead' });
      }
    }

    interest.status = status;
    await interest.save();
    await interest.populate(POPULATE);
    return res.json({ success: true, interest });
  } catch (err) {
    if (isValidationError(err)) return res.status(409).json({ success: false, message: err.message });
    next(err);
  }
}

export { createInterest, getInterests, updateInterest };
