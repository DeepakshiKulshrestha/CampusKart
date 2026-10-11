import mongoose from 'mongoose';
import { INTEREST_STATUS } from './constants.js';
const { ObjectId } = mongoose.Schema.Types;

const interestSchema = new mongoose.Schema(
  {
    productId: { type: ObjectId, ref: 'Product', required: true },
    buyerId: { type: ObjectId, ref: 'User', required: true },
    sellerId: { type: ObjectId, ref: 'User', required: true }, // denormalized for fast seller inbox
    message: { type: String, trim: true, maxlength: 500, default: '' },
    status: { type: String, enum: INTEREST_STATUS, default: 'PENDING' },
  },
  { timestamps: true }
);

interestSchema.index({ productId: 1, buyerId: 1 }, { unique: true }); // one interest per buyer per product
interestSchema.index({ sellerId: 1, status: 1, createdAt: -1 }); // seller inbox
interestSchema.index({ buyerId: 1, createdAt: -1 }); // buyer's sent interests

interestSchema.pre('validate', function () {
  if (this.buyerId && this.sellerId && this.buyerId.equals(this.sellerId))
    this.invalidate('buyerId', 'Cannot express interest in your own product');
});

const Interest = mongoose.model('Interest', interestSchema);
export default Interest;
