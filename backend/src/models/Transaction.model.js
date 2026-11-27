import mongoose from 'mongoose';
import { PAYMENT_STATUS, TRANSACTION_STATUS, TRANSACTION_TRANSITIONS } from './constants.js';
import { enforceTransitions } from './transitions.js';
const { ObjectId } = mongoose.Schema.Types;

const round2 = (n) => Math.round(n * 100) / 100;
export const DEFAULT_COMMISSION_RATE = 5;

const transactionSchema = new mongoose.Schema(
  {
    productId: { type: ObjectId, ref: 'Product', required: true, immutable: true },
    buyerId: { type: ObjectId, ref: 'User', required: true, immutable: true },
    sellerId: { type: ObjectId, ref: 'User', required: true, immutable: true },
    interestId: { type: ObjectId, ref: 'Interest' }, // the accepted interest this sale came from
    // Money fields are frozen at creation: a later commission-rate change never rewrites history
    amount: { type: Number, required: true, min: 0, immutable: true },
    commissionRate: { type: Number, required: true, min: 0, max: 100, immutable: true }, // % snapshot at creation
    commissionAmount: { type: Number, min: 0, immutable: true },
    sellerAmount: { type: Number, min: 0, immutable: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUS, default: 'PENDING' },
    transactionStatus: { type: String, enum: TRANSACTION_STATUS, default: 'PENDING' },
    paymentRef: { type: String, trim: true }, // payment gateway order/payment id
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    refundedAt: { type: Date },
  },
  { timestamps: true }
);

enforceTransitions(transactionSchema, 'transactionStatus', TRANSACTION_TRANSITIONS, 'Transaction');

// Derive money fields server-side (only on create, since they are immutable afterwards)
transactionSchema.pre('validate', function () {
  if (this.isNew) {
    this.commissionAmount = round2((this.amount * this.commissionRate) / 100);
    this.sellerAmount = round2(this.amount - this.commissionAmount);
  }
  const s = this.transactionStatus;
  if (s === 'COMPLETED' && this.paymentStatus !== 'SUCCESS')
    this.invalidate('transactionStatus', 'A transaction can only be COMPLETED after paymentStatus is SUCCESS');
  if (s === 'COMPLETED' && !this.completedAt) this.completedAt = new Date();
  if (s === 'CANCELLED' && !this.cancelledAt) this.cancelledAt = new Date();
  if (s === 'REFUNDED' && !this.refundedAt) this.refundedAt = new Date();
});

// Create a transaction with the CURRENT global commission rate snapshotted into it
transactionSchema.statics.createWithCurrentRate = async function (data, options = {}) {
  const Settings = mongoose.model('Settings');
  const commissionRate = Number(await Settings.get('commissionRate', DEFAULT_COMMISSION_RATE));
  const [doc] = await this.create([{ ...data, commissionRate }], options);
  return doc;
};

transactionSchema.index({ buyerId: 1, createdAt: -1 });
transactionSchema.index({ sellerId: 1, createdAt: -1 });
transactionSchema.index({ transactionStatus: 1, completedAt: -1 }); // revenue analytics (COMPLETED over time)
transactionSchema.index({ createdAt: -1, transactionStatus: 1 }); // transactions by status within a date range
transactionSchema.index({ paymentRef: 1 }, { unique: true, partialFilterExpression: { paymentRef: { $type: 'string' } } });
// Only one active (non-cancelled) transaction per product
transactionSchema.index(
  { productId: 1 },
  { unique: true, partialFilterExpression: { transactionStatus: { $in: ['PENDING', 'COMPLETED'] } } }
);

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
