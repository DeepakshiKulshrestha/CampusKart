// Week 3: confirm only Cloudinary URLs are stored — no raw files/base64/buffers in Mongo
import 'dotenv/config';
import { connectDB, disconnectDB } from '../config/db.js';
import { Product, User } from '../models/index.js';
import { URL_REGEX } from '../models/constants.js';

(async () => {
  await connectDB();
  const bad = [];
  for await (const p of Product.find({}, { images: 1, title: 1 }).lean().cursor()) {
    if (!Array.isArray(p.images) || p.images.length === 0) bad.push([p._id, 'no images']);
    for (const img of p.images || [])
      if (typeof img !== 'string' || !URL_REGEX.test(img)) bad.push([p._id, `invalid image: ${String(typeof img === 'string' ? img : typeof img).slice(0, 60)}`]);
  }
  for await (const u of User.find({ profileImage: { $nin: ['', null] } }, { profileImage: 1 }).lean().cursor())
    if (!URL_REGEX.test(u.profileImage)) bad.push([u._id, `invalid profileImage`]);

  // Catch any binary/base64 sneaking in: avg doc size should be small (<5KB)
  const [stats] = await Product.aggregate([{ $group: { _id: null, avg: { $avg: { $bsonSize: '$$ROOT' } }, max: { $max: { $bsonSize: '$$ROOT' } } } }]);
  console.log(`products avg doc size: ${Math.round(stats?.avg || 0)} B, max: ${stats?.max || 0} B`);
  if ((stats?.max || 0) > 16 * 1024) bad.push(['-', 'a product document exceeds 16KB — possible embedded file']);

  if (bad.length) { console.log(`✗ ${bad.length} problem(s):`); bad.slice(0, 20).forEach((b) => console.log('  ', ...b)); }
  else console.log('✓ All image fields are Cloudinary https URLs; no raw files stored.');
  await disconnectDB();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
