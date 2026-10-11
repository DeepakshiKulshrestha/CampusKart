import mongoose from 'mongoose';
import { REPORT_REASONS, REPORT_STATUS } from './constants.js';
const { ObjectId } = mongoose.Schema.Types;

const reportSchema = new mongoose.Schema(
  {
    productId: { type: ObjectId, ref: 'Product', required: true },
    reportedBy: { type: ObjectId, ref: 'User', required: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, trim: true, maxlength: 1000, default: '' },
    status: { type: String, enum: REPORT_STATUS, default: 'PENDING' },
    adminNote: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

reportSchema.index({ productId: 1, reportedBy: 1 }, { unique: true }); // no duplicate reports by same user
reportSchema.index({ status: 1, createdAt: -1 }); // admin moderation queue

const Report = mongoose.model('Report', reportSchema);
export default Report;
