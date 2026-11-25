import mongoose from 'mongoose';
import { REPORT_REASONS, REPORT_STATUS, REPORT_TRANSITIONS } from './constants.js';
import { enforceTransitions } from './transitions.js';
const { ObjectId } = mongoose.Schema.Types;

// Report ─▶ Product (what was reported) and ─▶ User twice (who reported, which admin reviewed)
const reportSchema = new mongoose.Schema(
  {
    productId: { type: ObjectId, ref: 'Product', required: true, immutable: true },
    reportedBy: { type: ObjectId, ref: 'User', required: true, immutable: true },
    sellerId: { type: ObjectId, ref: 'User' }, // copied from product.sellerId: lets admins see reports per seller
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, trim: true, maxlength: 1000, default: '' },
    status: { type: String, enum: REPORT_STATUS, default: 'PENDING' },
    adminNote: { type: String, trim: true, maxlength: 1000, default: '' },
    reviewedBy: { type: ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

reportSchema.index({ productId: 1, reportedBy: 1 }, { unique: true }); // no duplicate reports by same user (also serves productId lookups)
reportSchema.index({ status: 1, createdAt: -1 }); // admin moderation queue
reportSchema.index({ sellerId: 1, status: 1 }); // "previous reports" signal for fraud scoring

enforceTransitions(reportSchema, 'status', REPORT_TRANSITIONS, 'Report');

reportSchema.pre('validate', function () {
  if (this.reportedBy && this.sellerId && this.reportedBy.equals(this.sellerId))
    this.invalidate('reportedBy', 'You cannot report your own listing');
  if (!this.isNew && this.isModified('status') && !this.reviewedAt) this.reviewedAt = new Date();
});

// Count of reports against a seller's listings (input for Roshni's /suspicion-score)
reportSchema.statics.countForSeller = function (sellerId) {
  return this.countDocuments({ sellerId, status: { $ne: 'DISMISSED' } });
};

const Report = mongoose.model('Report', reportSchema);
export default Report;
