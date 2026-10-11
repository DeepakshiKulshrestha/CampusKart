import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true }, // e.g. "commissionRate"
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

settingsSchema.statics.get = async function (key, fallback = null) {
  const doc = await this.findOne({ key }).lean();
  return doc ? doc.value : fallback;
};
settingsSchema.statics.set = function (key, value, updatedBy) {
  return this.findOneAndUpdate({ key }, { value, updatedBy }, { upsert: true, returnDocument: 'after' });
};

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
