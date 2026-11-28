import Report from '../models/Report.model.js';
import Product from '../models/Product.model.js';
import { REPORT_TRANSITIONS } from '../models/constants.js';
import { createReportSchema, adminReportQuerySchema, reviewReportSchema, validationError } from '../utils/validation.js';
import { paginated, rejectInvalidId, isValidationError } from '../utils/http.js';

// Admins see who is involved, including emails
const ADMIN_POPULATE = [
  { path: 'productId', select: { title: 1, price: 1, status: 1, category: 1, images: { $slice: 1 } } },
  { path: 'reportedBy', select: 'name email' },
  { path: 'sellerId', select: 'name email' },
  { path: 'reviewedBy', select: 'name' },
];

// POST /api/reports { productId, reason, details? } (protected)
// Also mounted as POST /api/products/:id/report (blueprint route), where the id comes from the URL.
async function createReport(req, res, next) {
  const body = { ...(req.body ?? {}) };
  if (req.params.id) body.productId = req.params.id;
  const parsed = createReportSchema.safeParse(body);
  if (!parsed.success) return validationError(res, parsed.error);
  const { productId, reason, details } = parsed.data;

  try {
    const product = await Product.findById(productId);
    if (!product || product.status === 'REMOVED') {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    if (product.sellerId.equals(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You cannot report your own listing' });
    }

    const report = await Report.create({
      productId: product._id,
      reportedBy: req.user._id,
      sellerId: product.sellerId, // from the product, never from the request
      reason,
      details: details ?? '',
    });
    // The reporter gets their own report back without any admin-only fields
    return res.status(201).json({
      success: true,
      report: { _id: report._id, productId: report.productId, reason: report.reason, details: report.details, status: report.status, createdAt: report.createdAt },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'You have already reported this listing' });
    }
    next(err);
  }
}

// GET /api/admin/reports?status=&page=&limit= (ADMIN)
async function listReports(req, res, next) {
  const parsed = adminReportQuerySchema.safeParse(req.query);
  if (!parsed.success) return validationError(res, parsed.error);
  const { status, page, limit } = parsed.data;
  const filter = status ? { status } : {};

  try {
    const [items, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate(ADMIN_POPULATE)
        .lean(),
      Report.countDocuments(filter),
    ]);
    return res.json(paginated(items, total, page, limit));
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/reports/:id { status, adminNote?, removeListing? } (ADMIN)
async function reviewReport(req, res, next) {
  if (rejectInvalidId(req, res, 'report')) return;
  const parsed = reviewReportSchema.safeParse(req.body ?? {});
  if (!parsed.success) return validationError(res, parsed.error);
  const { status, adminNote, removeListing } = parsed.data;

  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    // PENDING → REVIEWED | RESOLVED | DISMISSED, REVIEWED → RESOLVED | DISMISSED (same rule as the model)
    if (!(REPORT_TRANSITIONS[report.status] || []).includes(status)) {
      return res.status(409).json({ success: false, message: `Report cannot change from ${report.status} to ${status}` });
    }

    report.status = status;
    report.reviewedBy = req.user._id;
    if (adminNote !== undefined) report.adminNote = adminNote;
    await report.save();

    let listingRemoved = false;
    if (removeListing) {
      const product = await Product.findById(report.productId);
      if (product && product.status !== 'REMOVED') {
        product.status = 'REMOVED'; // soft delete; transactions and reports still reference it
        await product.save();
        listingRemoved = true;
      }
    }

    await report.populate(ADMIN_POPULATE);
    return res.json({ success: true, report, listingRemoved });
  } catch (err) {
    if (isValidationError(err)) return res.status(409).json({ success: false, message: err.message });
    next(err);
  }
}

export { createReport, listReports, reviewReport };
