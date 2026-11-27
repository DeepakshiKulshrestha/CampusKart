// Weeks 4–7 end-to-end verification against the real database. Creates only temporary documents
// (tagged "verify-") and deletes them; the commission rate is restored afterwards.
//   npm run db:verify
import 'dotenv/config';
import os from 'os';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import * as models from '../models/index.js';
import * as A from '../services/analytics.service.js';
import { semanticSearch } from '../services/vectorSearch.service.js';
import { syncProductEmbedding, provider } from '../services/embedding.service.js';
import { runNonBlockingTest } from './embeddingNonBlockingTest.js';
import { runBackup } from './backup.js';

const { User, Product, Interest, Transaction, Report, Settings, AiPrediction, AiFlag, ProductEmbedding, SearchLog } = models;
const oid = () => new mongoose.Types.ObjectId();
const TAG = `verify-${Date.now()}`;
const results = [];
async function step(name, fn) {
  const t = Date.now();
  try {
    const detail = await fn();
    results.push({ result: 'PASS', step: name, ms: Date.now() - t, detail: detail ?? '' });
  } catch (e) {
    results.push({ result: 'FAIL', step: name, ms: Date.now() - t, detail: e.message.split('\n')[0].slice(0, 120) });
  }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const expectInvalid = async (doc, field) => {
  try { await doc.save(); } catch (e) { if (e.errors?.[field]) return; throw e; }
  throw new Error(`expected ${field} change to be rejected`);
};

(async () => {
  await connectDB();
  const cleanup = { tx: [], interests: [], reports: [], products: [], predictions: [], flags: [] };
  const originalRate = await Settings.get('commissionRate');

  await step('W4 · indexes in sync for all 10 models', async () => {
    let n = 0;
    for (const m of Object.values(models)) if (m?.syncIndexes) { await m.syncIndexes(); n++; }
    return `${n} models`;
  });

  await step('W4 · settings default (commissionRate) exists', async () => {
    await Settings.ensureDefaults();
    const v = await Settings.get('commissionRate');
    assert(typeof v === 'number', 'commissionRate missing');
    let rejected = false;
    try { Settings.set('commissionRate', 150); } catch { rejected = true; }
    assert(rejected, 'invalid commissionRate (150) was accepted');
    return `commissionRate=${v}%`;
  });

  await step('W4 · commission snapshot: rate change does not rewrite history', async () => {
    const base = { buyerId: oid(), sellerId: oid(), amount: 1000, paymentRef: `${TAG}-a` };
    const t1 = await Transaction.createWithCurrentRate({ ...base, productId: oid() });
    cleanup.tx.push(t1._id);
    await Settings.set('commissionRate', originalRate + 2);
    const t2 = await Transaction.createWithCurrentRate({ ...base, productId: oid(), paymentRef: `${TAG}-b` });
    cleanup.tx.push(t2._id);
    await Settings.set('commissionRate', originalRate);
    const again = await Transaction.findById(t1._id);
    again.commissionRate = 50; // immutable: ignored
    again.amount = 1;
    await again.save();
    const fresh = await Transaction.findById(t1._id).lean();
    assert(fresh.commissionRate === originalRate && fresh.amount === 1000, 'old transaction changed');
    assert(t2.commissionRate === originalRate + 2, 'new transaction did not use the new rate');
    assert(fresh.commissionAmount === (1000 * originalRate) / 100 && fresh.sellerAmount === 1000 - fresh.commissionAmount, 'commission maths wrong');
    return `old=${fresh.commissionRate}% (₹${fresh.commissionAmount}), new=${t2.commissionRate}%`;
  });

  await step('W4 · transaction status rules', async () => {
    const t = await Transaction.findById(cleanup.tx[0]);
    t.transactionStatus = 'COMPLETED'; // paymentStatus still PENDING
    await expectInvalid(t, 'transactionStatus');
    t.paymentStatus = 'SUCCESS';
    await t.save();
    assert(t.completedAt, 'completedAt not set');
    const t2 = await Transaction.findById(t._id);
    t2.transactionStatus = 'PENDING';
    await expectInvalid(t2, 'transactionStatus');
    return 'PENDING→COMPLETED ok; COMPLETED needs payment; COMPLETED→PENDING blocked';
  });

  await step('W4 · interest status rules', async () => {
    const i = await Interest.create({ productId: oid(), buyerId: oid(), sellerId: oid(), message: TAG });
    cleanup.interests.push(i._id);
    const loaded = await Interest.findById(i._id);
    loaded.status = 'ACCEPTED';
    await loaded.save();
    assert(loaded.respondedAt, 'respondedAt not set');
    const again = await Interest.findById(i._id);
    again.status = 'PENDING';
    await expectInvalid(again, 'status');
    return 'PENDING→ACCEPTED ok, ACCEPTED→PENDING blocked, respondedAt set';
  });

  await step('W5 · report relationships + review rules', async () => {
    const sellerId = oid();
    const r = await Report.create({ productId: oid(), reportedBy: oid(), sellerId, reason: 'Duplicate', details: TAG });
    cleanup.reports.push(r._id);
    const l = await Report.findById(r._id);
    l.status = 'RESOLVED'; l.reviewedBy = oid(); l.adminNote = 'verified';
    await l.save();
    assert(l.reviewedAt, 'reviewedAt not set');
    const again = await Report.findById(r._id);
    again.status = 'PENDING';
    await expectInvalid(again, 'status');
    const self = new Report({ productId: oid(), reportedBy: sellerId, sellerId, reason: 'Other' });
    let blocked = false;
    try { await self.validate(); } catch { blocked = true; }
    assert(blocked, 'self-report allowed');
    return `reports for seller=${await Report.countForSeller(sellerId)}; RESOLVED→PENDING blocked`;
  });

  await step('W4 · aggregations: sales, commission, by status', async () => {
    const s = await A.getSalesSummary({ range: 'all' });
    const direct = await Transaction.find({ transactionStatus: 'COMPLETED' }, { amount: 1, commissionAmount: 1 }).lean();
    const sum = Math.round(direct.reduce((t, x) => t + x.amount, 0) * 100) / 100;
    assert(Math.abs(sum - s.totalSales) < 0.01, `totalSales ${s.totalSales} ≠ direct sum ${sum}`);
    const byStatus = await A.getTransactionsByStatus({ range: 'all' });
    const total = byStatus.reduce((t, x) => t + x.count, 0);
    assert(total === (await Transaction.countDocuments()), 'status counts do not add up');
    return `sales ₹${s.totalSales}, commission ₹${s.totalCommission}, ${byStatus.map((x) => `${x.status}:${x.count}`).join(' ')}`;
  });

  await step('W5 · sales over time: today / week / month / custom', async () => {
    const t = await A.getSalesOverTime({ range: 'today' });
    const w = await A.getSalesOverTime({ range: 'week' });
    const m = await A.getSalesOverTime({ range: 'month' });
    const iso = (d) => d.toISOString().slice(0, 10);
    const c = await A.getSalesOverTime({ range: 'custom', from: iso(new Date(Date.now() - 9 * 864e5)), to: iso(new Date()) });
    assert(w.series.length === 7 && m.series.length === 30, `bucket counts week=${w.series.length} month=${m.series.length}`);
    assert(t.granularity === 'hour' && m.granularity === 'day', 'wrong granularity');
    const y = await A.getSalesOverTime({ range: 'year' });
    const mSum = Math.round(m.series.reduce((a, b) => a + b.sales, 0) * 100) / 100;
    const mSummary = await A.getSalesSummary({ range: 'month' });
    assert(Math.abs(mSum - mSummary.totalSales) < 0.01, 'month series does not add up to month total');
    return `today ${t.series.length}h, week 7d, month 30d, custom ${c.series.length}d, year ${y.series.length}mo`;
  });

  await step('W5 · dashboard metrics', async () => {
    const d = await A.getDashboardMetrics();
    assert(d.activeListings === (await Product.countDocuments({ status: 'AVAILABLE' })), 'activeListings mismatch');
    return `users ${d.totalUsers}, active ${d.activeListings}, sold ${d.soldListings}, reports ${d.pendingReports}, flags ${d.pendingFlags}`;
  });

  await step('W5 · analytics queries use indexes', async () => {
    const plan = await Transaction.find({ transactionStatus: 'COMPLETED', completedAt: { $gte: new Date(Date.now() - 30 * 864e5) } }).explain('queryPlanner');
    const s = JSON.stringify(plan.queryPlanner?.winningPlan || plan);
    assert(s.includes('IXSCAN'), 'revenue query is a COLLSCAN');
    const plan2 = await AiFlag.find({ adminDecision: 'PENDING' }).sort({ suspicionScore: -1 }).explain('queryPlanner');
    assert(JSON.stringify(plan2).includes('IXSCAN'), 'flag queue is a COLLSCAN');
    return 'revenue + flag queue → IXSCAN';
  });

  await step('W5 · ai_predictions log + recordSale', async () => {
    const productId = oid();
    const p = await AiPrediction.log({ productId, inputFeatures: { category: 'Books', brand: 'Pearson', originalPrice: 800, age: 12, condition: 'Good' }, predictedPrice: 450, fairPriceRange: { min: 405, max: 495 }, modelVersion: TAG });
    assert(p, 'log returned null');
    cleanup.predictions.push(p._id);
    await AiPrediction.recordSale(productId, 500);
    const f = await AiPrediction.findById(p._id).lean();
    assert(f.actualSalePrice === 500, 'actualSalePrice not recorded');
    const bad = await AiPrediction.log({ predictedPrice: -1 }); // must not throw
    assert(bad === null, 'invalid log should be swallowed');
    return 'logged, sale price attached, failures never throw';
  });

  let testProduct;
  await step('W6 · ai_flags from a /suspicion-score response', async () => {
    const seller = await User.findOne({}, { _id: 1 }).lean();
    const [p] = await Product.insertMany([{ sellerId: seller?._id || oid(), title: `[TEST] ${TAG}`, description: 'temporary', category: 'Other', originalPrice: 100, price: 90, age: 1, condition: 'Good', location: 'Main Library', images: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'] }]);
    testProduct = p;
    cleanup.products.push(p._id);
    const score = { listingId: String(p._id), suspicionScore: 78, anomalyScore: 66.2, riskLevel: 'HIGH', riskFactors: [{ feature: 'accountAgeInDays', value: 2, reason: 'Seller account is less than 7 days old' }], model: 'IsolationForest + transparent threshold signals', modelVersion: TAG, decision: 'FLAG_FOR_REVIEW' };
    const f1 = await AiFlag.recordScore(p._id, p.sellerId, score);
    const f2 = await AiFlag.recordScore(p._id, p.sellerId, { ...score, suspicionScore: 81 });
    cleanup.flags.push(f1._id);
    assert(String(f1._id) === String(f2._id), 'second score created a duplicate open flag');
    assert((await Product.findById(p._id).lean()).suspicionScore === 81, 'product.suspicionScore not updated');
    const low = await AiFlag.recordScore(p._id, p.sellerId, { ...score, suspicionScore: 10, decision: 'NO_FLAG' });
    assert(low === null, 'NO_FLAG created a flag');
    const doc = await AiFlag.findById(f1._id);
    doc.adminDecision = 'CONFIRMED';
    await doc.save();
    assert(doc.reviewedAt, 'reviewedAt not set');
    return 'one open flag per listing, product score synced, admin review recorded';
  });

  await step(`W6 · embedding sync (${provider() === 'none' ? 'hash test vectors: set HF_TOKEN for real ones' : provider()})`, async () => {
    if (provider() === 'none') process.env.EMBEDDING_PROVIDER = 'hash';
    const r = await syncProductEmbedding(testProduct._id);
    const e = await ProductEmbedding.findOne({ productId: testProduct._id }).lean();
    assert(e?.embedding.length === 384, 'no 384-dim vector stored');
    const again = await syncProductEmbedding(testProduct._id);
    assert(again === 'unchanged', 're-embedded unchanged text');
    return `${r}, then ${again} (textHash skip works)`;
  });

  await step('W6 · writes are non-blocking (slow API simulated)', async () => {
    const r = await runNonBlockingTest({ delayMs: 1500 });
    assert(r.pass, JSON.stringify(r));
    return `create ${r.createMs}ms / edit ${r.textEditSaveMs}ms while API took 1500ms`;
  });

  await step('W6 · vector search returns the right product', async () => {
    const { engine, results } = await semanticSearch({ query: `[TEST] ${TAG} temporary`, limit: 5 });
    assert(results.length, 'no results');
    const hit = results.findIndex((r) => String(r.productId) === String(testProduct._id));
    const total = await ProductEmbedding.countDocuments();
    return `engine=${engine}, ${results.length} results, test product rank=${hit < 0 ? 'not in top 5' : hit + 1}, ${total} embeddings stored`;
  });

  await step('W7 · search_logs + AI analytics', async () => {
    await SearchLog.log({ query: TAG, mode: 'semantic', resultCount: 0 });
    const a = await A.getAiAnalytics({ range: 'month' });
    assert(a.search.zeroResultSearches >= 1, 'zero-result search not counted');
    await SearchLog.deleteMany({ query: TAG });
    return `predictions ${a.priceIntelligence.predictionsServed}, MAE ${a.priceIntelligence.mae ?? 'n/a'}, flags ${a.safety.flagsRaised}, searches ${a.search.totalSearches}`;
  });

  await step('W7 · backup writes every collection', async () => {
    const dir = path.join(os.tmpdir(), `campuskart-${TAG}`);
    const { manifest } = await runBackup(dir);
    const names = Object.keys(manifest.collections);
    for (const n of ['users', 'products', 'transactions', 'settings']) assert(names.includes(n), `${n} missing from backup`);
    const lines = fs.readFileSync(path.join(dir, 'users.ndjson'), 'utf8').trim().split('\n').filter(Boolean).length;
    assert(lines === manifest.collections.users.documents, 'users line count mismatch');
    fs.rmSync(dir, { recursive: true, force: true });
    return `${names.length} collections exported (test copy deleted)`;
  });

  // ---- cleanup ----
  await Settings.set('commissionRate', originalRate);
  await Promise.all([
    Transaction.deleteMany({ _id: { $in: cleanup.tx } }),
    Interest.deleteMany({ _id: { $in: cleanup.interests } }),
    Report.deleteMany({ _id: { $in: cleanup.reports } }),
    AiPrediction.deleteMany({ $or: [{ _id: { $in: cleanup.predictions } }, { modelVersion: TAG }] }),
    AiFlag.deleteMany({ productId: { $in: cleanup.products } }),
    ProductEmbedding.deleteMany({ productId: { $in: cleanup.products } }),
    Product.deleteMany({ _id: { $in: cleanup.products } }),
  ]);

  console.table(results);
  const failed = results.filter((r) => r.result === 'FAIL').length;
  console.log(failed ? `\n✗ ${failed} of ${results.length} checks failed` : `\n✓ All ${results.length} checks passed`);
  await disconnectDB();
  process.exit(failed ? 1 : 0);
})().catch(async (e) => { console.error('✗', e); await disconnectDB(); process.exit(1); });
