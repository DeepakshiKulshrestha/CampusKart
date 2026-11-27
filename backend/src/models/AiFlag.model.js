import mongoose from 'mongoose';
import { RISK_LEVELS, FLAG_DECISIONS, ADMIN_DECISIONS } from './constants.js';
const { ObjectId } = mongoose.Schema.Types;

// Week 6: listings the fraud model flagged for human review (shape matches the ML service's /suspicion-score response)
const riskFactorSchema = new mongoose.Schema(
  { feature: { type: String, required: true }, value: mongoose.Schema.Types.Mixed, reason: { type: String, required: true } },
  { _id: false }
);

const aiFlagSchema = new mongoose.Schema(
  {
    productId: { type: ObjectId, ref: 'Product', required: true, immutable: true },
    sellerId: { type: ObjectId, ref: 'User' },
    suspicionScore: { type: Number, required: true, min: 0, max: 100 },
    anomalyScore: { type: Number, min: 0, max: 100 },
    riskLevel: { type: String, enum: RISK_LEVELS, required: true },
    riskFactors: { type: [riskFactorSchema], default: [] },
    modelDecision: { type: String, enum: FLAG_DECISIONS, default: 'FLAG_FOR_REVIEW' },
    model: { type: String, trim: true },
    modelVersion: { type: String, required: true, trim: true },
    adminDecision: { type: String, enum: ADMIN_DECISIONS, default: 'PENDING' },
    adminNote: { type: String, trim: true, maxlength: 1000, default: '' },
    reviewedBy: { type: ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true, collection: 'ai_flags' }
);

aiFlagSchema.index({ adminDecision: 1, suspicionScore: -1 }); // admin review queue, riskiest first
aiFlagSchema.index({ productId: 1, createdAt: -1 });
aiFlagSchema.index({ createdAt: -1 }); // safety analytics over time
// At most one open (PENDING) flag per listing
aiFlagSchema.index({ productId: 1 }, { unique: true, partialFilterExpression: { adminDecision: 'PENDING' }, name: 'one_open_flag_per_product' });

aiFlagSchema.pre('validate', function () {
  if (!this.isNew && this.isModified('adminDecision') && this.adminDecision !== 'PENDING' && !this.reviewedAt) this.reviewedAt = new Date();
});

/**
 * Store a /suspicion-score response. Always updates Product.suspicionScore;
 * creates/updates an open flag only when the model says FLAG_FOR_REVIEW.
 */
aiFlagSchema.statics.recordScore = async function (productId, sellerId, score) {
  const Product = mongoose.model('Product');
  await Product.updateOne({ _id: productId }, { $set: { suspicionScore: score.suspicionScore } });
  if (score.decision !== 'FLAG_FOR_REVIEW') return null;
  const fields = {
    sellerId,
    suspicionScore: score.suspicionScore,
    anomalyScore: score.anomalyScore,
    riskLevel: score.riskLevel,
    riskFactors: score.riskFactors || [],
    modelDecision: score.decision,
    model: score.model,
    modelVersion: score.modelVersion || 'unknown',
  };
  return this.findOneAndUpdate(
    { productId, adminDecision: 'PENDING' },
    { $set: fields },
    { upsert: true, returnDocument: 'after', runValidators: true }
  );
};

const AiFlag = mongoose.model('AiFlag', aiFlagSchema);
export default AiFlag;
