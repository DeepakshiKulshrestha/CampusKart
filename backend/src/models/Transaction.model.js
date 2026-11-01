import mongoose from 'mongoose';
import { PAYMENT_STATUS, TRANSACTION_STATUS } from './constants.js';
const { ObjectId } = mongoose.Schema.Types;

const round2 = (n) => Math.round(n * 100) / 100;

const transactionSchema = new mongoose.Schema(
  {
    productId: { type: ObjectId, ref: 'Product', required: true },
    buyerId: { type: ObjectId, ref: 'User', required: true },
    sellerId: { type: ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    commissionRate: { type: Number, required: true, min: 0, max: 100 }, // snapshot at creation time
    commissionAmount: { type: Number, min: 0 },
    sellerAmount: { type: Number, min: 0 },
    paymentStatus: { type: String, enum: PAYMENT_STATUS, default: 'PENDING' },
    transactionStatus: { type: String, enum: TRANSACTION_STATUS, default: 'PENDING' },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// Always derive money fields server-side — never trust client values
transactionSchema.pre('validate', function () {
  this.commissionAmount = round2((this.amount * this.commissionRate) / 100);
  this.sellerAmount = round2(this.amount - this.commissionAmount);
  if (this.transactionStatus === 'COMPLETED' && !this.completedAt) this.completedAt = new Date();
});

transactionSchema.index({ buyerId: 1, createdAt: -1 });
transactionSchema.index({ sellerId: 1, createdAt: -1 });
transactionSchema.index({ transactionStatus: 1, completedAt: -1 }); // revenue analytics
// Only one active (non-cancelled) transaction per product
transactionSchema.index(
  { productId: 1 },
  { unique: true, partialFilterExpression: { transactionStatus: { $in: ['PENDING', 'COMPLETED'] } } }
);

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
