import Product from '../models/Product.model.js';
import { uploadImages, deleteImages } from '../services/cloudinary.js';
import { scheduleFraudCheck } from '../services/fraudCheck.service.js';
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
  myProductsQuerySchema,
  validationError,
} from '../utils/validation.js';
import { OBJECT_ID, paginated } from '../utils/http.js';

// The AI suspicion score is for admins only (blueprint: never shown to the public, and a seller who could
// see it could learn to game it). Admins see it through /api/admin/products and /api/admin/ai-flags.
function withoutScore(doc) {
  const { suspicionScore, ...rest } = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return rest;
}

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  price_asc: { price: 1, createdAt: -1, _id: -1 },
  price_desc: { price: -1, createdAt: -1, _id: -1 },
};

// Sends the response and returns null unless the id is valid, the product exists (not REMOVED) and req.user owns it
async function loadOwnedProduct(req, res) {
  if (!OBJECT_ID.test(req.params.id)) {
    res.status(400).json({ success: false, message: 'Invalid product id' });
    return null;
  }
  const product = await Product.findById(req.params.id);
  if (!product || product.status === 'REMOVED') {
    res.status(404).json({ success: false, message: 'Product not found' });
    return null;
  }
  if (!product.sellerId.equals(req.user._id)) {
    res.status(403).json({ success: false, message: 'You can only modify your own listings' });
    return null;
  }
  return product;
}

// POST /api/products (protected, multipart/form-data, files in field "images")
async function createProduct(req, res, next) {
  const parsed = createProductSchema.safeParse(req.body ?? {});
  if (!parsed.success) return validationError(res, parsed.error);

  const files = req.files || [];
  if (files.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one image is required (field name: images)' });
  }

  let images = [];
  try {
    images = await uploadImages(files);
    const product = await Product.create({ ...parsed.data, images, sellerId: req.user._id });
    res.status(201).json({ success: true, product: withoutScore(product) });
    // AI suspicion check runs after the response is sent; if the ML service is down it is just skipped
    scheduleFraudCheck(product._id);
    return;
  } catch (err) {
    // Don't leave orphaned uploads behind when the product itself is rejected
    if (images.length) await deleteImages(images).catch((e) => console.error('[products] cleanup failed:', e.message));
    if (err.name === 'ValidationError') return res.status(400).json({ success: false, message: err.message });
    next(err);
  }
}

// GET /api/products (public)
async function getProducts(req, res, next) {
  const parsed = productQuerySchema.safeParse(req.query);
  if (!parsed.success) return validationError(res, parsed.error);
  const { search, category, condition, location, minPrice, maxPrice, sort, page, limit } = parsed.data;

  // status is always part of the filter so the compound indexes are used
  const filter = { status: 'AVAILABLE' };
  if (search) filter.$text = { $search: search };
  if (category) filter.category = category;
  if (condition) filter.condition = condition;
  if (location) filter.location = location;
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }

  // A text search ranks by relevance unless the client asked for an explicit sort
  const byRelevance = search && !sort;
  const sortSpec = byRelevance ? { score: { $meta: 'textScore' }, _id: -1 } : SORTS[sort || 'newest'];
  const projection = search ? { score: { $meta: 'textScore' } } : null;

  try {
    const [rows, total] = await Promise.all([
      Product.find(filter, projection)
        .sort(sortSpec)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('sellerId', 'name')
        .lean(),
      Product.countDocuments(filter),
    ]);
    const items = rows.map(({ score, suspicionScore, ...item }) => item);
    return res.json(paginated(items, total, page, limit));
  } catch (err) {
    next(err);
  }
}

// GET /api/products/mine (protected): own listings in any status except REMOVED
async function getMyProducts(req, res, next) {
  const parsed = myProductsQuerySchema.safeParse(req.query);
  if (!parsed.success) return validationError(res, parsed.error);
  const { page, limit } = parsed.data;

  const filter = { sellerId: req.user._id, status: { $ne: 'REMOVED' } };
  try {
    const [items, total] = await Promise.all([
      Product.find(filter)
        .select('-suspicionScore')
        .sort(SORTS.newest)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);
    return res.json(paginated(items, total, page, limit));
  } catch (err) {
    next(err);
  }
}

// GET /api/products/:id (public): SOLD listings stay viewable, REMOVED ones are 404
async function getProductById(req, res, next) {
  if (!OBJECT_ID.test(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid product id' });
  }
  try {
    const product = await Product.findOne({ _id: req.params.id, status: { $ne: 'REMOVED' } })
      .select('-suspicionScore')
      .populate('sellerId', 'name');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    return res.json({ success: true, product });
  } catch (err) {
    next(err);
  }
}

// PUT /api/products/:id (protected, owner only). sellerId, status and images can't be changed here.
async function updateProduct(req, res, next) {
  try {
    const product = await loadOwnedProduct(req, res);
    if (!product) return;

    if (product.status === 'SOLD') {
      return res.status(409).json({ success: false, message: 'Sold listings can no longer be edited' });
    }

    const parsed = updateProductSchema.safeParse(req.body ?? {});
    if (!parsed.success) return validationError(res, parsed.error);

    // Only the keys that were sent: set() with undefined would wipe the field
    const changes = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined));
    product.set(changes);
    await product.save();
    return res.json({ success: true, product: withoutScore(product) });
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ success: false, message: err.message });
    next(err);
  }
}

// DELETE /api/products/:id (protected, owner only): soft delete, the document is kept for transactions/reports
async function deleteProduct(req, res, next) {
  try {
    const product = await loadOwnedProduct(req, res);
    if (!product) return;

    product.status = 'REMOVED';
    await product.save();
    return res.json({ success: true, message: 'Product removed' });
  } catch (err) {
    next(err);
  }
}

// PUT /api/products/:id/sold (protected, owner only)
async function markSold(req, res, next) {
  try {
    const product = await loadOwnedProduct(req, res);
    if (!product) return;

    if (product.status === 'SOLD') {
      return res.status(409).json({ success: false, message: 'Product is already marked as sold' });
    }

    product.status = 'SOLD';
    await product.save();
    return res.json({ success: true, product: withoutScore(product) });
  } catch (err) {
    next(err);
  }
}

export { createProduct, getProducts, getMyProducts, getProductById, updateProduct, deleteProduct, markSold };
