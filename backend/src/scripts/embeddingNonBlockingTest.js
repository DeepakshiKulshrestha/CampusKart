// Week 6: prove the embedding pipeline does not block product writes.
// Simulates a slow embedding API (EMBEDDING_TEST_DELAY_MS) and checks that Product.create / save return
// immediately while the embedding arrives in the background. Uses a temporary [TEST] product, then deletes it.
import 'dotenv/config';
import { pathToFileURL } from 'url';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { Product, ProductEmbedding, User } from '../models/index.js';
import { drainEmbeddingQueue, provider, getEmbeddingQueueStats } from '../services/embedding.service.js';

export async function runNonBlockingTest({ delayMs = 1500 } = {}) {
  if (provider() === 'none') process.env.EMBEDDING_PROVIDER = 'hash'; // offline test vectors; real runs use HF_TOKEN
  const prevDelay = process.env.EMBEDDING_TEST_DELAY_MS;
  process.env.EMBEDDING_TEST_DELAY_MS = String(delayMs);
  const seller = await User.findOne({}, { _id: 1 }).lean();
  const sellerId = seller?._id || new mongoose.Types.ObjectId();
  const out = { provider: provider(), simulatedApiDelayMs: delayMs };
  let product;
  try {
    let t = Date.now();
    product = await Product.create({
      sellerId, title: '[TEST] Casio calculator for embedding check', description: 'Temporary product created by embeddingNonBlockingTest', category: 'Electronics',
      brand: 'Casio', originalPrice: 1500, price: 900, age: 6, condition: 'Good', location: 'Main Library',
      images: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
    });
    out.createMs = Date.now() - t;
    out.embeddingPresentRightAfterCreate = !!(await ProductEmbedding.exists({ productId: product._id }));
    await drainEmbeddingQueue();
    const e1 = await ProductEmbedding.findOne({ productId: product._id }).lean();
    out.embeddingAfterQueue = !!e1 && e1.embedding.length === 384;

    product.title = '[TEST] Scientific calculator FX-991EX';
    t = Date.now();
    await product.save();
    out.textEditSaveMs = Date.now() - t;
    await drainEmbeddingQueue();
    const e2 = await ProductEmbedding.findOne({ productId: product._id }).lean();
    out.reEmbeddedAfterTextEdit = !!e2 && e2.textHash !== e1?.textHash;

    product.price = 850;
    await product.save();
    await drainEmbeddingQueue();
    const e3 = await ProductEmbedding.findOne({ productId: product._id }).lean();
    out.priceEditUpdatesFilterOnly = !!e3 && e3.price === 850 && e3.textHash === e2.textHash;
    out.queue = getEmbeddingQueueStats();
    out.pass = out.createMs < delayMs && out.textEditSaveMs < delayMs && !out.embeddingPresentRightAfterCreate && out.embeddingAfterQueue && out.reEmbeddedAfterTextEdit && out.priceEditUpdatesFilterOnly;
    return out;
  } finally {
    if (prevDelay === undefined) delete process.env.EMBEDDING_TEST_DELAY_MS; else process.env.EMBEDDING_TEST_DELAY_MS = prevDelay;
    if (product) {
      await Product.deleteOne({ _id: product._id });
      await ProductEmbedding.deleteOne({ productId: product._id });
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    await connectDB();
    const r = await runNonBlockingTest();
    console.dir(r, { depth: 3 });
    console.log(r.pass ? `✓ writes are non-blocking: create took ${r.createMs} ms while the embedding API took ${r.simulatedApiDelayMs} ms` : '✗ non-blocking check failed');
    await disconnectDB();
    process.exit(r.pass ? 0 : 1);
  })().catch(async (e) => { console.error('✗', e.message); await disconnectDB(); process.exit(1); });
}
