// Node → FastAPI bridge for the AI features. The browser never calls the ML service directly.
// Every AI endpoint answers 503 "AI service unavailable" when the ML service is down; the rest of the
// marketplace is unaffected.
import Product from '../models/Product.model.js';
import AiPrediction from '../models/AiPrediction.model.js';
import { callMl, toPriceFeatures } from '../services/mlClient.js';
import { pricePredictionSchema, productIdBodySchema, validationError } from '../utils/validation.js';

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

export { sendAiError, pricePrediction, priceFairness };
