import mongoose from 'mongoose';

// Global key/value settings. Defaults are inserted by `npm run db:settings` (and by the seed).
export const SETTING_DEFAULTS = {
  commissionRate: 5, // % taken from each COMPLETED sale
};
const VALIDATORS = {
  commissionRate: (v) => typeof v === 'number' && v >= 0 && v <= 100,
};

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true }, // e.g. "commissionRate"
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

settingsSchema.statics.get = async function (key, fallback = SETTING_DEFAULTS[key] ?? null) {
  const doc = await this.findOne({ key }).lean();
  return doc ? doc.value : fallback;
};
settingsSchema.statics.set = function (key, value, updatedBy) {
  if (VALIDATORS[key] && !VALIDATORS[key](value)) throw new Error(`Invalid value for setting "${key}": ${value}`);
  return this.findOneAndUpdate({ key }, { value, updatedBy }, { upsert: true, returnDocument: 'after', runValidators: true });
};
// Insert any missing defaults without overwriting values an admin already changed
settingsSchema.statics.ensureDefaults = async function () {
  const ops = Object.entries(SETTING_DEFAULTS).map(([key, value]) => ({
    updateOne: { filter: { key }, update: { $setOnInsert: { key, value } }, upsert: true },
  }));
  const r = await this.bulkWrite(ops);
  return r.upsertedCount;
};

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
