// Suspicious-listing scoring (blueprint Module 9). The AI only scores and flags; an admin always decides.
// After a listing is created, scheduleFraudCheck() runs the check in the background so the seller's
// 201 response never waits for (or fails because of) the ML service.
import Product from '../models/Product.model.js';
import User from '../models/User.model.js';
import Report from '../models/Report.model.js';
import Transaction from '../models/Transaction.model.js';
import AiFlag from '../models/AiFlag.model.js';
import AiPrediction from '../models/AiPrediction.model.js';
import { callMl, toPriceFeatures } from './mlClient.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Builds the seller/listing features from the database, asks the ML service for a score and stores it
 * (product.suspicionScore always; an ai_flags document only when the model says FLAG_FOR_REVIEW).
 * Throws err.status = 503 when the ML service is down.
 * @returns {Promise<{ score: object, flag: object|null, features: object }>}
 */
export async function runFraudCheck(productId) {
  const product = await Product.findById(productId).lean();
  if (!product) throw Object.assign(new Error('Product not found'), { status: 404 });
  const seller = await User.findById(product.sellerId).lean();
  const sellerId = product.sellerId;

  // 1. What should this item cost? (also logged, so the real sale price can later be compared with it)
  const started = Date.now();
  const priceFeatures = toPriceFeatures({ ...product, originalPrice: Math.max(product.originalPrice, 1) });
  const prediction = await callMl('/predict-price', priceFeatures);
  AiPrediction.log({
    productId: product._id,
    sellerId,
    endpoint: 'predict-price',
    inputFeatures: { itemType: product.title, category: product.category, brand: product.brand, originalPrice: product.originalPrice, age: product.age, condition: product.condition, location: product.location },
    predictedPrice: prediction.predictedPrice,
    fairPriceRange: prediction.fairPriceRange,
    modelVersion: prediction.modelVersion,
    latencyMs: Date.now() - started,
  });

  // 2. Seller behaviour, all from the database
  const since7Days = new Date(Date.now() - 7 * DAY_MS);
  const [totalListings, listingsLast7Days, previousReports, completedSalesCount, rejectedListingsCount] = await Promise.all([
    Product.countDocuments({ sellerId }),
    Product.countDocuments({ sellerId, createdAt: { $gte: since7Days } }),
    Report.countForSeller(sellerId),
    Transaction.countDocuments({ sellerId, transactionStatus: 'COMPLETED' }),
    AiFlag.countDocuments({ sellerId, adminDecision: 'CONFIRMED' }), // listings an admin confirmed as suspicious
  ]);
  const features = {
    listingId: String(product._id),
    listedPrice: Math.max(product.price, 1), // the ML service needs a price above 0
    predictedFairPrice: Math.max(prediction.predictedPrice, 1),
    accountAgeInDays: seller?.createdAt ? Math.max(0, (Date.now() - new Date(seller.createdAt)) / DAY_MS) : 0,
    totalListings,
    listingsLast7Days,
    previousReports,
    completedSalesCount,
    rejectedListingsCount,
    // accountAgeInDays is still part of the ML contract but the current model ignores it (most honest campus sellers are new).
    // averagePriceDeviation (seller's past pricing pattern) is optional and not tracked yet: left at its default 0
  };

  // 3. Score and store. AiFlag.recordScore updates product.suspicionScore and opens/updates a PENDING flag if needed.
  const score = await callMl('/suspicion-score', features);
  const flag = await AiFlag.recordScore(product._id, sellerId, score);
  return { score, flag, features };
}

/** Fire-and-forget: never throws into the request that created the listing. */
export function scheduleFraudCheck(productId) {
  setImmediate(() => {
    runFraudCheck(productId)
      .then(({ score }) => console.log(`[fraud-check] ${productId}: score ${score.suspicionScore} (${score.riskLevel}, ${score.decision})`))
      .catch((err) => console.warn(`[fraud-check] skipped for ${productId}: ${err.message}`));
  });
}
