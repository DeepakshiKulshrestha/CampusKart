// Admin-only endpoints. Every route in routes/adminRoutes.js runs protect + authorize('ADMIN') first.
import Settings from '../models/Settings.model.js';
import Transaction from '../models/Transaction.model.js';
import { DEFAULT_COMMISSION_RATE } from '../models/Transaction.model.js';
import { resolveRange } from '../services/analytics.service.js';
import { commissionSchema, adminTransactionQuerySchema, validationError } from '../utils/validation.js';
import { paginated } from '../utils/http.js';

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

export { sendRangeError, getCommission, updateCommission, getAdminTransactions };
