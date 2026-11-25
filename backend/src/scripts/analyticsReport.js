// Weeks 4–5–7: print every admin aggregation (what Deepakshi's admin APIs will return).
//   npm run db:analytics                       (default range: month)
//   npm run db:analytics -- --range=week
//   npm run db:analytics -- --range=custom --from=2026-10-01 --to=2026-10-31
import 'dotenv/config';
import { connectDB, disconnectDB } from '../config/db.js';
import '../models/index.js';
import * as A from '../services/analytics.service.js';

const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1];
const opts = { range: arg('range') || 'month', from: arg('from'), to: arg('to') };
(async () => {
  await connectDB();
  console.log('\n== Dashboard metrics =='); console.table(await A.getDashboardMetrics());
  console.log(`\n== Sales summary (${opts.range}) ==`); console.table(await A.getSalesSummary(opts));
  console.log('\n== Transactions by status =='); console.table(await A.getTransactionsByStatus(opts));
  const t = await A.getSalesOverTime(opts);
  console.log(`\n== Sales over time (${t.granularity}, ${t.timezone}, ${t.series.length} buckets, last 10 shown) ==`); console.table(t.series.slice(-10));
  console.log('\n== Top categories =='); console.table(await A.getTopCategories(opts));
  console.log('\n== AI analytics =='); console.dir(await A.getAiAnalytics(opts), { depth: 4 });
  await disconnectDB();
})().catch(async (e) => { console.error('✗', e.message); await disconnectDB(); process.exit(1); });
