// Admin-only endpoints. Every route in routes/adminRoutes.js runs protect + authorize('ADMIN') first.
import Settings from '../models/Settings.model.js';
import Transaction from '../models/Transaction.model.js';
import User from '../models/User.model.js';
import Product from '../models/Product.model.js';
import { DEFAULT_COMMISSION_RATE } from '../models/Transaction.model.js';
import * as analytics from '../services/analytics.service.js';
import { callMl } from '../services/mlClient.js';
import {
  commissionSchema,
  adminTransactionQuerySchema,
  analyticsQuerySchema,
  adminUserQuerySchema,
  restrictUserSchema,
  adminProductQuerySchema,
  removeProductSchema,
  validationError,
} from '../utils/validation.js';
import { paginated, rejectInvalidId } from '../utils/http.js';

const { resolveRange } = analytics;
// Search text is used inside a regex, so special characters must be escaped
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// analytics.service throws errors with status 400 for bad ranges
const sendRangeError = (res, err) => res.status(400).json({ success: false, message: err.message });

// GET /api/admin/commission
async function getCommission(req, res, next) {
  try {
    const doc = await Settings.findOne({ key: 'commissionRate' }).populate('updatedBy', 'name email').lean();
    return res.json({
      success: true,
      commissionRate: doc ? doc.value : DEFAULT_COMMISSION_RATE,
      isDefault: !doc,
      updatedAt: doc?.updatedAt ?? null,
      updatedBy: doc?.updatedBy ?? null,
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/commission { commissionRate } — only affects transactions created from now on
async function updateCommission(req, res, next) {
  const parsed = commissionSchema.safeParse(req.body ?? {});
  if (!parsed.success) return validationError(res, parsed.error);
  try {
    const doc = await Settings.set('commissionRate', parsed.data.commissionRate, req.user._id);
    return res.json({ success: true, commissionRate: doc.value, updatedAt: doc.updatedAt });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/transactions?range=&from=&to=&status=&page=&limit=
async function getAdminTransactions(req, res, next) {
  const parsed = adminTransactionQuerySchema.safeParse(req.query);
  if (!parsed.success) return validationError(res, parsed.error);
  const { range = 'all', from, to, status, page, limit } = parsed.data;

  let r;
  try {
    r = resolveRange({ range, from, to });
  } catch (err) {
    if (err.status === 400) return sendRangeError(res, err);
    return next(err);
  }

  const filter = { createdAt: r.from ? { $gte: r.from, $lte: r.to } : { $lte: r.to } };
  if (status) filter.transactionStatus = status;

  try {
    const [items, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate([
          { path: 'productId', select: 'title category price status' },
          { path: 'buyerId', select: 'name email' },
          { path: 'sellerId', select: 'name email' },
        ])
        .lean(),
      Transaction.countDocuments(filter),
    ]);
    return res.json(paginated(items, total, page, limit, { range: r.range, from: r.from, to: r.to }));
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/dashboard
async function getDashboard(req, res, next) {
  try {
    return res.json({ success: true, metrics: await analytics.getDashboardMetrics() });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/analytics/:report?range=&from=&to=  — one handler for the four analytics reports
const REPORTS = {
  summary: async (q) => ({ summary: await analytics.getSalesSummary(q) }),
  'sales-over-time': (q) => analytics.getSalesOverTime(q),
  'transactions-by-status': async (q) => ({ items: await analytics.getTransactionsByStatus(q) }),
  'top-categories': async (q) => ({ items: await analytics.getTopCategories(q) }),
  // Price-model accuracy on real sales, AI flags and search analytics (blueprint Module 10)
  ai: async (q) => ({ ai: await analytics.getAiAnalytics(q) }),
};

function analyticsHandler(report) {
  return async (req, res, next) => {
    const parsed = analyticsQuerySchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, parsed.error);
    // Drop keys the client left out so the service defaults apply (e.g. range = month)
    const query = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined));
    try {
      return res.json({ success: true, ...(await REPORTS[report](query)) });
    } catch (err) {
      if (err.status === 400) return sendRangeError(res, err);
      next(err);
    }
  };
}

// GET /api/admin/users?search=&role=&page=&limit=
async function listUsers(req, res, next) {
  const parsed = adminUserQuerySchema.safeParse(req.query);
  if (!parsed.success) return validationError(res, parsed.error);
  const { search, role, page, limit } = parsed.data;

  const filter = {};
  if (role) filter.role = role;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }

  try {
    const [items, total] = await Promise.all([
      // passwordHash is select:false on the model, so it is never loaded here
      User.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).select('-__v').lean(),
      User.countDocuments(filter),
    ]);
    return res.json(paginated(items, total, page, limit));
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/users/:id/restrict { isRestricted }
async function restrictUser(req, res, next) {
  if (rejectInvalidId(req, res, 'user')) return;
  const parsed = restrictUserSchema.safeParse(req.body ?? {});
  if (!parsed.success) return validationError(res, parsed.error);

  try {
    if (req.user._id.equals(req.params.id)) {
      return res.status(403).json({ success: false, message: 'You cannot restrict your own account' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admin accounts cannot be restricted' });
    }

    user.isRestricted = parsed.data.isRestricted;
    await user.save();
    return res.json({ success: true, user }); // toJSON strips passwordHash
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/products?status=&search=&page=&limit= — every listing, including SOLD and REMOVED
async function listProducts(req, res, next) {
  const parsed = adminProductQuerySchema.safeParse(req.query);
  if (!parsed.success) return validationError(res, parsed.error);
  const { search, status, page, limit } = parsed.data;

  const filter = {};
  if (status) filter.status = status;
  if (search) filter.title = new RegExp(escapeRegex(search), 'i');

  try {
    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select({ title: 1, price: 1, category: 1, condition: 1, status: 1, suspicionScore: 1, sellerId: 1, createdAt: 1, images: { $slice: 1 } })
        .populate('sellerId', 'name email')
        .lean(),
      Product.countDocuments(filter),
    ]);
    return res.json(paginated(items, total, page, limit));
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/products/:id/remove { reason? } — soft delete by an admin
async function removeProduct(req, res, next) {
  if (rejectInvalidId(req, res, 'product')) return;
  const parsed = removeProductSchema.safeParse(req.body ?? {});
  if (!parsed.success) return validationError(res, parsed.error);

  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (product.status === 'REMOVED') {
      return res.status(409).json({ success: false, message: 'This listing is already removed' });
    }
    product.status = 'REMOVED';
    await product.save();
    // The Product model has no field for the reason, so it is only logged
    console.log(`[admin] ${req.user.email} removed product ${product._id}${parsed.data.reason ? `: ${parsed.data.reason}` : ''}`);
    return res.json({ success: true, message: 'Listing removed', product: { _id: product._id, title: product.title, status: product.status } });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/model-metrics — the price model's validation metrics, straight from the ML service
async function getModelMetrics(req, res, next) {
  try {
    return res.json({ success: true, metrics: await callMl('/model-metrics') });
  } catch (err) {
    if (err.status === 503 || err.status === 502) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
}

export {
  getModelMetrics,
  sendRangeError,
  getCommission,
  updateCommission,
  getAdminTransactions,
  getDashboard,
  analyticsHandler,
  listUsers,
  restrictUser,
  listProducts,
  removeProduct,
};
