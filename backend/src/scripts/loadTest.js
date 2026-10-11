// Week 3: confirm search/filter/pagination stay fast at 200–500+ products.
// Run after `npm run db:seed:large`. Reports latency + whether each query uses an index (IXSCAN) or scans (COLLSCAN).
import 'dotenv/config';
import { connectDB, disconnectDB } from '../config/db.js';
import { Product } from '../models/index.js';

const LIMIT = 12;
const RUNS = 20;

const QUERIES = {
  'feed (newest, page 1)': () => Product.find({ status: 'AVAILABLE' }).sort({ createdAt: -1 }).limit(LIMIT),
  'feed (newest, page 10)': () => Product.find({ status: 'AVAILABLE' }).sort({ createdAt: -1 }).skip(9 * LIMIT).limit(LIMIT),
  'category + price range': () => Product.find({ status: 'AVAILABLE', category: 'Electronics', price: { $gte: 500, $lte: 5000 } }).sort({ price: 1 }).limit(LIMIT),
  'condition + location': () => Product.find({ status: 'AVAILABLE', condition: 'Good', location: 'Boys Hostel A' }).limit(LIMIT),
  'text search "calculator"': () => Product.find({ $text: { $search: 'calculator' }, status: 'AVAILABLE' }, { score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } }).limit(LIMIT),
  'seller my-listings': (ctx) => Product.find({ sellerId: ctx.sellerId }).sort({ createdAt: -1 }).limit(LIMIT),
};

const stages = (plan) => JSON.stringify(plan).match(/"stage":"(\w+)"/g)?.map((s) => s.slice(9, -1)) || [];

(async () => {
  await connectDB();
  await Product.syncIndexes();
  const total = await Product.countDocuments();
  console.log(`Products in collection: ${total}${total < 200 ? '  ⚠ run `npm run db:seed:large` first' : ''}\n`);
  console.log('Query'.padEnd(28), 'avg ms'.padStart(7), 'p95 ms'.padStart(7), 'docsExamined'.padStart(13), 'returned'.padStart(9), '  plan');
  const ctx = { sellerId: (await Product.findOne({}, { sellerId: 1 }).lean())?.sellerId };
  let fail = false;
  for (const [name, q] of Object.entries(QUERIES)) {
    const times = [];
    for (let i = 0; i < RUNS; i++) {
      const query = q(ctx); // NOTE: don't await — awaiting a Mongoose Query executes it
      const t = process.hrtime.bigint();
      await query.lean().exec();
      times.push(Number(process.hrtime.bigint() - t) / 1e6);
    }
    times.sort((a, b) => a - b);
    const explain = await q(ctx).explain('executionStats');
    const s = explain.executionStats || explain[0]?.executionStats;
    const st = stages(explain.queryPlanner?.winningPlan || explain);
    const usesIndex = st.some((x) => ['IXSCAN', 'TEXT', 'TEXT_MATCH', 'TEXT_OR'].includes(x));
    if (!usesIndex) fail = true;
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(name.padEnd(28), avg.toFixed(1).padStart(7), times[Math.floor(RUNS * 0.95) - 1].toFixed(1).padStart(7), String(s.totalDocsExamined).padStart(13), String(s.nReturned).padStart(9), ' ', usesIndex ? '✓ index' : '✗ COLLSCAN', `[${[...new Set(st)].join('>')}]`);
  }
  console.log(fail ? '\n✗ Some queries are not using an index.' : '\n✓ All queries use indexes.');
  await disconnectDB();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
