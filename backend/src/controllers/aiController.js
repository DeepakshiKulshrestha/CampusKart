// Node → FastAPI bridge for the AI features. The browser never calls the ML service directly.
// Every AI endpoint answers 503 "AI service unavailable" when the ML service is down; the rest of the
// marketplace is unaffected.
import Product from '../models/Product.model.js';
import AiPrediction from '../models/AiPrediction.model.js';
import AiFlag from '../models/AiFlag.model.js';
import ProductEmbedding from '../models/ProductEmbedding.model.js';
import SearchLog from '../models/SearchLog.model.js';
import { callMl, toPriceFeatures } from '../services/mlClient.js';
import { runFraudCheck } from '../services/fraudCheck.service.js';
import { provider } from '../services/embedding.service.js';
import { semanticProductSearch, toMlCandidates } from '../services/vectorSearch.service.js';
import {
  pricePredictionSchema,
  productIdBodySchema,
  semanticSearchSchema,
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
      inputFeatures: { ...parsed.data, itemType: parsed.data.title }, // stored as itemType (the ML field name)
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
        itemType: product.title,
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

// ---- Semantic search ----
const CANDIDATE_LIMIT = 100;
// Same fields as GET /api/products items, so the frontend can render them with the same card
const RESULT_FIELDS = 'title price originalPrice age condition category brand location status images sellerId createdAt';

// 1. Candidates: real semantic retrieval (product_embeddings + Hugging Face) when it is configured.
//    Otherwise MongoDB $text keyword hits, plus (in `extra`) the newest other listings matching the filters,
//    so the ML service can still find items that match by meaning but share no words with the query.
//    `extra` is only shown if the ML service ranks it; on its own it would just be unrelated listings.
async function findCandidates({ query, category, condition, location, minPrice, maxPrice }) {
  const semanticReady = provider() === 'huggingface' && (await ProductEmbedding.estimatedDocumentCount()) > 0;
  if (semanticReady) {
    try {
      const { engine, products } = await semanticProductSearch({
        query,
        filters: { category, condition, minPrice, maxPrice },
        limit: CANDIDATE_LIMIT,
      });
      // semanticProductSearch has no location filter: apply the marketplace's exact-match rule here
      return { engine, products: location ? products.filter((p) => p.location === location) : products };
    } catch (err) {
      console.warn(`[semantic-search] vector retrieval failed, using keyword fallback: ${err.message}`);
    }
  }

  const base = { status: 'AVAILABLE' };
  if (category) base.category = category;
  if (condition) base.condition = condition;
  if (location) base.location = location;
  if (minPrice !== undefined || maxPrice !== undefined) {
    base.price = {};
    if (minPrice !== undefined) base.price.$gte = minPrice;
    if (maxPrice !== undefined) base.price.$lte = maxPrice;
  }
  const products = await Product.find({ ...base, $text: { $search: query } }, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(CANDIDATE_LIMIT)
    .lean();
  const extra = await Product.find({ ...base, _id: { $nin: products.map((p) => p._id) } })
    .sort({ createdAt: -1 })
    .limit(Math.max(0, CANDIDATE_LIMIT - products.length))
    .lean();
  return { engine: 'keyword-fallback', products, extra };
}

// POST /api/ai/semantic-search (public) { query, category?, condition?, location?, minPrice?, maxPrice?, limit? }
async function semanticSearch(req, res, next) {
  const parsed = semanticSearchSchema.safeParse(req.body ?? {});
  if (!parsed.success) return validationError(res, parsed.error);
  const { query, limit, ...filters } = parsed.data;

  try {
    let { engine, products, extra = [] } = await findCandidates({ query, ...filters });

    // 2. Re-ranking by meaning in the ML service (runs locally there, no token needed).
    //    If it fails, keep the retrieval order and drop the unranked `extra` listings.
    const pool = [...products, ...extra];
    if (pool.length > 1 || extra.length) {
      try {
        const ranked = await callMl('/semantic-search', { query, products: toMlCandidates(pool), limit: Math.min(pool.length, 100) });
        const byId = new Map(pool.map((p) => [String(p._id), p]));
        const reordered = (ranked.results || []).map((r) => byId.get(String(r.id))).filter(Boolean);
        if (reordered.length) {
          products = reordered;
          engine = extra.length ? 'keyword+recent-candidates+ml-rerank' : `${engine}+ml-rerank`;
        }
      } catch {
        // AI service down: keyword order stands, and `engine` ("keyword-fallback") says so honestly
      }
    }

    const top = products.slice(0, limit).map((p) => p._id);
    const docs = await Product.find({ _id: { $in: top }, status: 'AVAILABLE' }).select(RESULT_FIELDS).populate('sellerId', 'name').lean();
    const byId = new Map(docs.map((d) => [String(d._id), d]));
    const results = top.map((id) => byId.get(String(id))).filter(Boolean);

    // 3. Search analytics (never blocks or fails the request)
    SearchLog.log({ query, mode: 'semantic', category: filters.category, resultCount: results.length, userId: req.user?._id });
    return res.json({ success: true, engine, query, results });
  } catch (err) {
    next(err);
  }
}

export { sendAiError, pricePrediction, priceFairness, suspicionScore, listAiFlags, reviewAiFlag, semanticSearch };
