import mongoose from 'mongoose';
import { INTEREST_STATUS, INTEREST_TRANSITIONS } from './constants.js';
import { enforceTransitions } from './transitions.js';
const { ObjectId } = mongoose.Schema.Types;

const interestSchema = new mongoose.Schema(
  {
    productId: { type: ObjectId, ref: 'Product', required: true, immutable: true },
    buyerId: { type: ObjectId, ref: 'User', required: true, immutable: true },
    sellerId: { type: ObjectId, ref: 'User', required: true, immutable: true }, // copy from product.sellerId, never from the request
    message: { type: String, trim: true, maxlength: 500, default: '' },
    status: { type: String, enum: INTEREST_STATUS, default: 'PENDING' },
    respondedAt: { type: Date }, // set when the status first leaves PENDING
    transactionId: { type: ObjectId, ref: 'Transaction' }, // set when an accepted interest becomes a transaction
  },
  { timestamps: true }
);

interestSchema.index({ productId: 1, buyerId: 1 }, { unique: true }); // one interest per buyer per product
interestSchema.index({ sellerId: 1, status: 1, createdAt: -1 }); // seller inbox
interestSchema.index({ buyerId: 1, createdAt: -1 }); // buyer's sent interests
interestSchema.index({ productId: 1, status: 1 }); // "is there an accepted interest for this product?"

enforceTransitions(interestSchema, 'status', INTEREST_TRANSITIONS, 'Interest');

interestSchema.pre('validate', function () {
  if (this.buyerId && this.sellerId && this.buyerId.equals(this.sellerId))
    this.invalidate('buyerId', 'Cannot express interest in your own product');
  if (this.status !== 'PENDING' && !this.respondedAt) this.respondedAt = new Date();
});

const Interest = mongoose.model('Interest', interestSchema);
export default Interest;
