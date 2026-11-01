import mongoose from 'mongoose';
import { CATEGORIES, CONDITIONS, PRODUCT_STATUS, URL_REGEX } from './constants.js';

const productSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category: { type: String, enum: CATEGORIES, required: true },
    brand: { type: String, trim: true, default: 'Generic', maxlength: 50 },
    originalPrice: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    age: { type: Number, required: true, min: 0, max: 240 }, // months
    condition: { type: String, enum: CONDITIONS, required: true },
    images: {
      type: [{ type: String, match: [URL_REGEX, 'Images must be Cloudinary URLs, not raw files'] }],
      validate: { validator: (a) => a.length >= 1 && a.length <= 5, message: '1–5 images required' },
    },
    location: { type: String, required: true, trim: true },
    status: { type: String, enum: PRODUCT_STATUS, default: 'AVAILABLE' },
    suspicionScore: { type: Number, min: 0, max: 100, default: 0 },
  },
  { timestamps: true }
);

// ---- Indexes (Week 3) ----
// Full-text search: title weighted highest
productSchema.index(
  { title: 'text', description: 'text', brand: 'text' },
  { weights: { title: 10, brand: 5, description: 1 }, name: 'product_text_search' }
);
// Default marketplace feed: AVAILABLE, newest first (ESR: Equality → Sort → Range)
productSchema.index({ status: 1, createdAt: -1 });
// Filter combos
productSchema.index({ status: 1, category: 1, price: 1 }); // category + price range / price sort
productSchema.index({ status: 1, condition: 1, location: 1 }); // condition + location
// Seller's "My Listings"
productSchema.index({ sellerId: 1, status: 1, createdAt: -1 });

productSchema.pre('validate', function () {
  if (this.price > this.originalPrice * 3) this.invalidate('price', 'Price looks unrealistic vs original price');
});

const Product = mongoose.model('Product', productSchema);
export default Product;
