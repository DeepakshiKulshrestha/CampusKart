import mongoose from 'mongoose';
import { PREDICTION_ENDPOINTS } from './constants.js';
const { ObjectId } = mongoose.Schema.Types;

// Week 5: one document per price prediction served by the ML service (for analytics: predicted vs actual, MAE over time)
const aiPredictionSchema = new mongoose.Schema(
  {
    productId: { type: ObjectId, ref: 'Product' }, // optional: sellers ask for a price before the listing exists
    sellerId: { type: ObjectId, ref: 'User' },
    endpoint: { type: String, enum: PREDICTION_ENDPOINTS, default: 'predict-price' },
    inputFeatures: {
      category: String,
      brand: String,
      originalPrice: Number,
      age: Number, // months
      condition: String,
      location: String,
      itemType: String,
      variant: String,
    },
    predictedPrice: { type: Number, required: true, min: 0 },
    fairPriceRange: { min: { type: Number, min: 0 }, max: { type: Number, min: 0 } },
    listedPrice: { type: Number, min: 0 }, // price-fairness calls only
    fairnessLabel: { type: String, trim: true }, // e.g. FAIR / OVERPRICED / UNDERPRICED as returned by the ML service
    modelVersion: { type: String, required: true, trim: true },
    latencyMs: { type: Number, min: 0 },
    actualSalePrice: { type: Number, min: 0 }, // filled when the product is SOLD: lets admins compute real MAE
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'ai_predictions' }
);

aiPredictionSchema.index({ createdAt: -1 });
aiPredictionSchema.index({ productId: 1, createdAt: -1 });
aiPredictionSchema.index({ modelVersion: 1, createdAt: -1 });

// Never let logging break the user's request: callers can fire-and-forget
aiPredictionSchema.statics.log = function (entry) {
  return this.create(entry).catch((e) => {
    console.error('[ai_predictions] log failed:', e.message);
    return null;
  });
};
// When a product sells, attach the real price to its predictions
aiPredictionSchema.statics.recordSale = function (productId, actualSalePrice) {
  return this.updateMany({ productId, actualSalePrice: { $exists: false } }, { $set: { actualSalePrice } });
};

const AiPrediction = mongoose.model('AiPrediction', aiPredictionSchema);
export default AiPrediction;
