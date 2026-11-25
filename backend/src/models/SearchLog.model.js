import mongoose from 'mongoose';
import { SEARCH_MODES } from './constants.js';

// Week 7 analytics: search volume, zero-result searches, most searched categories. Auto-deleted after 180 days.
const searchLogSchema = new mongoose.Schema(
  {
    query: { type: String, trim: true, maxlength: 500, required: true },
    mode: { type: String, enum: SEARCH_MODES, default: 'keyword' },
    category: String, // filter used, if any
    resultCount: { type: Number, min: 0, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 180 },
  },
  { collection: 'search_logs', versionKey: false }
);
searchLogSchema.index({ mode: 1, createdAt: -1 });

searchLogSchema.statics.log = function (entry) {
  return this.create(entry).catch((e) => console.error('[search_logs] log failed:', e.message));
};

const SearchLog = mongoose.model('SearchLog', searchLogSchema);
export default SearchLog;
