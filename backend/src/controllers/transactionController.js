import crypto from 'crypto';
import Transaction from '../models/Transaction.model.js';
import Interest from '../models/Interest.model.js';
import Product from '../models/Product.model.js';
import AiPrediction from '../models/AiPrediction.model.js';
import {
  createTransactionSchema,
  payTransactionSchema,
  transactionQuerySchema,
  validationError,
} from '../utils/validation.js';
import { paginated, rejectInvalidId, isValidationError, withTransaction } from '../utils/http.js';

const POPULATE = [
  { path: 'productId', select: { title: 1, price: 1, status: 1, category: 1, images: { $slice: 1 } } },
  { path: 'buyerId', select: 'name' },
  { path: 'sellerId', select: 'name' },
];

const isParty = (tx, user) => tx.buyerId.equals(user._id) || tx.sellerId.equals(user._id);

// POST /api/transactions { interestId } (protected): the buyer of an ACCEPTED interest starts the purchase
async function createTransaction(req, res, next) {
  const parsed = createTransactionSchema.safeParse(req.body ?? {});
  if (!parsed.success) return validationError(res, parsed.error);

  try {
    const interest = await Interest.findById(parsed.data.interestId);
    if (!interest) return res.status(404).json({ success: false, message: 'Interest not found' });
    if (!interest.buyerId.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the buyer of this interest can start the purchase' });
    }
    if (interest.status !== 'ACCEPTED') {
      return res.status(409).json({ success: false, message: 'The seller has not accepted this interest' });
    }

    // Re-opening the payment page should not create a second transaction
    if (interest.transactionId) {
      const existing = await Transaction.findById(interest.transactionId);
      if (existing && existing.transactionStatus !== 'CANCELLED') {
        return res.status(409).json({
          success: false,
          message: 'A transaction already exists for this interest',
          transactionId: existing._id,
        });
      }
    }

    const product = await Product.findById(interest.productId);
    if (!product || product.status !== 'AVAILABLE') {
      return res.status(409).json({ success: false, message: 'The product is no longer available' });
    }

    // amount comes from the database; the commission rate is snapshotted by the model
    const tx = await Transaction.createWithCurrentRate({
      productId: product._id,
      buyerId: interest.buyerId,
      sellerId: product.sellerId,
      amount: product.price,
      interestId: interest._id,
    });
    interest.transactionId = tx._id;
    await interest.save();

    await tx.populate(POPULATE);
    return res.status(201).json({ success: true, transaction: tx });
  } catch (err) {
    // Unique index: only one PENDING/COMPLETED transaction per product
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'This product already has an active transaction' });
    }
    next(err);
  }
}

// POST /api/transactions/:id/pay { simulateFailure? } (protected, buyer only)
// Simulated payment: the server decides the result, the client can never mark a payment as successful.
async function payTransaction(req, res, next) {
  if (rejectInvalidId(req, res, 'transaction')) return;
  const parsed = payTransactionSchema.safeParse(req.body ?? {});
  if (!parsed.success) return validationError(res, parsed.error);

  try {
    const tx = await Transaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });
    if (!tx.buyerId.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the buyer can pay for this transaction' });
    }
    if (tx.transactionStatus !== 'PENDING') {
      return res
        .status(409)
        .json({ success: false, message: `This transaction is already ${tx.transactionStatus.toLowerCase()}` });
    }

    if (parsed.data.simulateFailure) {
      tx.paymentStatus = 'FAILED';
      await tx.save();
      await tx.populate(POPULATE);
      return res.status(402).json({ success: false, message: 'Payment failed (simulated). You can try again.', transaction: tx });
    }

    // Everything below succeeds or fails together
    const paid = await withTransaction(async (session) => {
      const doc = await Transaction.findById(tx._id).session(session);
      const product = await Product.findById(doc.productId).session(session);
      if (!product || product.status !== 'AVAILABLE') {
        throw Object.assign(new Error('The product is no longer available'), { status: 409 });
      }

      doc.paymentStatus = 'SUCCESS';
      doc.paymentRef = `SIM-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      doc.transactionStatus = 'COMPLETED';
      await doc.save({ session });

      product.status = 'SOLD';
      await product.save({ session });

      // Other buyers still waiting on this product get an answer
      const pending = await Interest.find({ productId: product._id, status: 'PENDING', _id: { $ne: doc.interestId } }).session(
        session
      );
      for (const interest of pending) {
        interest.status = 'REJECTED';
        await interest.save({ session });
      }
      return doc;
    });

    // Feeds real-world accuracy into AI analytics; never blocks or breaks the payment
    AiPrediction.recordSale(paid.productId, paid.amount).catch((e) => console.error('[transactions] recordSale failed:', e.message));

    await paid.populate(POPULATE);
    return res.json({ success: true, message: 'Payment successful (simulated)', transaction: paid });
  } catch (err) {
    if (err.status === 409) return res.status(409).json({ success: false, message: err.message });
    if (isValidationError(err)) return res.status(409).json({ success: false, message: err.message });
    next(err);
  }
}

// PUT /api/transactions/:id/cancel (protected, buyer or seller, PENDING only)
async function cancelTransaction(req, res, next) {
  if (rejectInvalidId(req, res, 'transaction')) return;
  try {
    const tx = await Transaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });
    if (!isParty(tx, req.user)) {
      return res.status(403).json({ success: false, message: 'You are not part of this transaction' });
    }
    if (tx.transactionStatus !== 'PENDING') {
      return res.status(409).json({ success: false, message: 'Only pending transactions can be cancelled' });
    }

    tx.transactionStatus = 'CANCELLED';
    await tx.save();
    await tx.populate(POPULATE);
    return res.json({ success: true, transaction: tx });
  } catch (err) {
    if (isValidationError(err)) return res.status(409).json({ success: false, message: err.message });
    next(err);
  }
}

// GET /api/transactions?role=buyer|seller&status=&page=&limit= (protected)
async function getTransactions(req, res, next) {
  const parsed = transactionQuerySchema.safeParse(req.query);
  if (!parsed.success) return validationError(res, parsed.error);
  const { role, status, page, limit } = parsed.data;

  const me = req.user._id;
  const filter =
    role === 'buyer' ? { buyerId: me } : role === 'seller' ? { sellerId: me } : { $or: [{ buyerId: me }, { sellerId: me }] };
  if (status) filter.transactionStatus = status;

  try {
    const [items, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate(POPULATE)
        .lean(),
      Transaction.countDocuments(filter),
    ]);
    return res.json(paginated(items, total, page, limit));
  } catch (err) {
    next(err);
  }
}

// GET /api/transactions/:id (protected: buyer, seller or ADMIN)
async function getTransactionById(req, res, next) {
  if (rejectInvalidId(req, res, 'transaction')) return;
  try {
    const tx = await Transaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });
    if (!isParty(tx, req.user) && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'You are not part of this transaction' });
    }
    await tx.populate(POPULATE);
    return res.json({ success: true, transaction: tx });
  } catch (err) {
    next(err);
  }
}

export { createTransaction, payTransaction, cancelTransaction, getTransactions, getTransactionById };
