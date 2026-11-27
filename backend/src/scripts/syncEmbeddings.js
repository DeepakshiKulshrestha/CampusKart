// Week 6: backfill / repair product embeddings (run after seeding, or on a schedule as a safety net).
//   npm run db:embeddings            → embed products that are missing or out of date
//   npm run db:embeddings -- --all   → re-embed everything
import 'dotenv/config';
import { connectDB, disconnectDB } from '../config/db.js';
import { Product, ProductEmbedding } from '../models/index.js';
import { embedTexts, productText, textHash, modelId, provider } from '../services/embedding.service.js';

const ALL = process.argv.includes('--all');
(async () => {
  if (provider() === 'none') throw new Error('No embedding provider: set HF_TOKEN in .env (or EMBEDDING_PROVIDER=hash for an offline, non-semantic test)');
  await connectDB();
  const existing = new Map((await ProductEmbedding.find({}, { productId: 1, textHash: 1, model: 1 }).lean()).map((e) => [String(e.productId), e]));
  const products = await Product.find({ status: { $ne: 'REMOVED' } }).lean();
  const todo = products.filter((p) => {
    if (ALL) return true;
    const e = existing.get(String(p._id));
    return !e || e.model !== modelId() || e.textHash !== textHash(productText(p));
  });
  console.log(`provider=${provider()} model=${modelId()} products=${products.length} to embed=${todo.length}`);
  let done = 0;
  for (let i = 0; i < todo.length; i += 32) {
    const batch = todo.slice(i, i + 32);
    const texts = batch.map(productText);
    const vectors = await embedTexts(texts);
    await ProductEmbedding.bulkWrite(batch.map((p, k) => ({
      updateOne: {
        filter: { productId: p._id },
        update: { $set: { embedding: vectors[k], model: modelId(), textHash: textHash(texts[k]), status: p.status, category: p.category, condition: p.condition, location: p.location, price: p.price } },
        upsert: true,
      },
    })));
    done += batch.length;
    process.stdout.write(`\r  embedded ${done}/${todo.length}`);
  }
  // Remove vectors whose product no longer exists
  const ids = new Set(products.map((p) => String(p._id)));
  const orphans = [...existing.keys()].filter((id) => !ids.has(id));
  if (orphans.length) await ProductEmbedding.deleteMany({ productId: { $in: orphans } });
  console.log(`\n✓ done. embeddings in collection: ${await ProductEmbedding.countDocuments()} (removed ${orphans.length} orphans)`);
  await disconnectDB();
})().catch(async (e) => { console.error('\n✗', e.message); await disconnectDB(); process.exit(1); });
