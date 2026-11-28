// Node → FastAPI bridge for the AI features. The browser never calls the ML service directly.
// Every AI endpoint answers 503 "AI service unavailable" when the ML service is down; the rest of the
// marketplace is unaffected.
import Product from '../models/Product.model.js';
import AiPrediction from '../models/AiPrediction.model.js';
import AiFlag from '../models/AiFlag.model.js';
import { callMl, toPriceFeatures } from '../services/mlClient.js';
import { runFraudCheck } from '../services/fraudCheck.service.js';
import {
  pricePredictionSchema,
  productIdBodySchema,
  aiFlagQuerySchema,
  reviewAiFlagSchema,
  validationError,
} from '../utils/validation.js';
import { paginated, rejectInvalidId } from '../utils/http.js';

// Turns errors from callMl (503 / 502) into JSON responses; anything else goes to the error handler
function sendAiError(res, err, next) {
  if (err.status === 503 || err.status === 502) return res.status(err.status).json({ success: false, message: err.message });
  return next(err);
}

// POST /api/ai/price-prediction (logged in) — suggested price for a listing the seller is about to create
async function pricePrediction(req, res, next) {
  const parsed = pricePredictionSchema.safeParse(req.body ?? {});
  if (!parsed.success) return validationError(res, parsed.error);
  const features = toPriceFeatures(parsed.data);

  try {
    const started = Date.now();
    const ai = await callMl('/predict-price', features);
    // Logged for AI analytics; never awaited and never throws (see AiPrediction.log)
    AiPrediction.log({
      sellerId: req.user._id,
      endpoint: 'predict-price',
      inputFeatures: { ...parsed.data },
      predictedPrice: ai.predictedPrice,
      fairPriceRange: ai.fairPriceRange,
      modelVersion: ai.modelVersion,
      latencyMs: Date.now() - started,
    });
    return res.json({
      success: true,
      predictedPrice: ai.predictedPrice,
      fairPriceRange: ai.fairPriceRange,
      currency: ai.currency || 'INR',
      modelVersion: ai.modelVersion,
      dataNote: ai.dataNote,
    });
  } catch (err) {
    return sendAiError(res, err, next);
  }
}

// POST /api/ai/price-fairness { productId } (public) — is this listing's price fair?
// The listed price and features are read from the database, never from the request.
async function priceFairness(req, res, next) {
  const parsed = productIdBodySchema.safeParse(req.body ?? {});
  if (!parsed.success) return validationError(res, parsed.error);

  try {
    const product = await Product.findById(parsed.data.productId).lean();
    if (!product || product.status === 'REMOVED') return res.status(404).json({ success: false, message: 'Product not found' });
    if (!(product.price > 0) || !(product.originalPrice > 0)) {
      return res.status(422).json({ success: false, message: 'A fair-price check needs a price and original price above ₹0' });
    }

    const started = Date.now();
    const ai = await callMl('/price-fairness', { ...toPriceFeatures(product), listedPrice: product.price });
    AiPrediction.log({
      productId: product._id,
      sellerId: product.sellerId,
      endpoint: 'price-fairness',
      inputFeatures: {
        category: product.category,
        brand: product.brand,
        originalPrice: product.originalPrice,
        age: product.age,
        condition: product.condition,
        location: product.location,
      },
      predictedPrice: ai.predictedPrice,
      fairPriceRange: ai.fairPriceRange,
      listedPrice: product.price,
      fairnessLabel: ai.label,
      modelVersion: ai.modelVersion,
      latencyMs: Date.now() - started,
    });
    return res.json({
      success: true,
      productId: product._id,
      label: ai.label, // GOOD DEAL | FAIR | SLIGHTLY HIGH | OVERPRICED
      listedPrice: ai.listedPrice,
      predictedPrice: ai.predictedPrice,
      deviationPercent: ai.deviationPercent,
      fairPriceRange: ai.fairPriceRange,
      modelVersion: ai.modelVersion,
    });
  } catch (err) {
    return sendAiError(res, err, next);
  }
}

// POST /api/ai/suspicion-score { productId } (ADMIN) — run the fraud check now and return the score
async function suspicionScore(req, res, next) {
  const parsed = productIdBodySchema.safeParse(req.body ?? {});
  if (!parsed.success) return validationError(res, parsed.error);
  try {
    const { score, flag, features } = await runFraudCheck(parsed.data.productId);
    return res.json({ success: true, score, flagged: Boolean(flag), flagId: flag?._id ?? null, features });
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ success: false, message: err.message });
    return sendAiError(res, err, next);
  }
}

// ---- Admin AI flag queue (mounted under /api/admin; the router already requires ADMIN) ----
const FLAG_POPULATE = [
  { path: 'productId', select: { title: 1, price: 1, originalPrice: 1, category: 1, status: 1, suspicionScore: 1, images: { $slice: 1 } } },
  { path: 'sellerId', select: 'name email createdAt' },
  { path: 'reviewedBy', select: 'name' },
];

// GET /api/admin/ai-flags?adminDecision=&page=&limit= — riskiest first
async function listAiFlags(req, res, next) {
  const parsed = aiFlagQuerySchema.safeParse(req.query);
  if (!parsed.success) return validationError(res, parsed.error);
  const { adminDecision, page, limit } = parsed.data;
  const filter = adminDecision ? { adminDecision } : {};
  try {
    const [items, total] = await Promise.all([
      AiFlag.find(filter)
        .sort({ suspicionScore: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate(FLAG_POPULATE)
        .lean(),
      AiFlag.countDocuments(filter),
    ]);
    return res.json(paginated(items, total, page, limit));
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/ai-flags/:id/review { adminDecision CONFIRMED|DISMISSED, adminNote?, removeListing? }
// The AI never removes anything by itself: only this admin action can.
async function reviewAiFlag(req, res, next) {
  if (rejectInvalidId(req, res, 'flag')) return;
  const parsed = reviewAiFlagSchema.safeParse(req.body ?? {});
  if (!parsed.success) return validationError(res, parsed.error);
  const { adminDecision, adminNote, removeListing } = parsed.data;

  try {
    const flag = await AiFlag.findById(req.params.id);
    if (!flag) return res.status(404).json({ success: false, message: 'Flag not found' });
    if (flag.adminDecision !== 'PENDING') {
      return res.status(409).json({ success: false, message: `This flag was already ${flag.adminDecision.toLowerCase()}` });
    }

    flag.adminDecision = adminDecision;
    flag.reviewedBy = req.user._id;
    if (adminNote !== undefined) flag.adminNote = adminNote;
    await flag.save(); // sets reviewedAt

    let listingRemoved = false;
    if (removeListing) {
      const product = await Product.findById(flag.productId);
      if (product && product.status !== 'REMOVED') {
        product.status = 'REMOVED';
        await product.save();
        listingRemoved = true;
      }
    }
    await flag.populate(FLAG_POPULATE);
    return res.json({ success: true, flag, listingRemoved });
  } catch (err) {
    next(err);
  }
}

export { sendAiError, pricePrediction, priceFairness, suspicionScore, listAiFlags, reviewAiFlag };
