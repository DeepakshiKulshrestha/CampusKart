// Weeks 4, 5, 7: aggregation queries behind the admin dashboard and analytics pages.
// Revenue rule (blueprint Module 5): only transactionStatus = COMPLETED counts as sales/commission.
import mongoose from 'mongoose';
import '../models/index.js'; // registers every model, so admin routes only need to import this file

const M = (name) => mongoose.model(name);
export const TZ = () => process.env.ANALYTICS_TZ || 'Asia/Kolkata';
const DAY = 86400000;
const r2 = (n) => Math.round((n || 0) * 100) / 100;

// ---------- date ranges ----------
function tzParts(date, tz) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(date)
      .map((x) => [x.type, x.value])
  );
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second };
}
// Midnight (in tz) of the day `date` falls on, as a UTC Date
function startOfDay(date, tz) {
  const p = tzParts(date, tz);
  const offset = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(date.getTime() / 1000) * 1000;
  return new Date(Date.UTC(p.y, p.m - 1, p.d) - offset);
}

/**
 * range: today | week (last 7 days) | month (last 30 days) | year (last 365 days) | all | custom (from/to = YYYY-MM-DD, inclusive)
 * @returns {{from: Date|null, to: Date, granularity: 'hour'|'day'|'month', tz: string, range: string}}
 */
export function resolveRange({ range = 'month', from, to, tz = TZ() } = {}) {
  const now = new Date();
  const today = startOfDay(now, tz);
  let start;
  let end = now;
  switch (range) {
    case 'today': start = today; break;
    case 'week': start = new Date(today - 6 * DAY); break;
    case 'month': start = new Date(today - 29 * DAY); break;
    case 'year': start = new Date(today - 364 * DAY); break;
    case 'all': start = null; break;
    case 'custom': {
      if (!from || !to) throw Object.assign(new Error('custom range needs from and to (YYYY-MM-DD)'), { status: 400 });
      start = startOfDay(new Date(`${from}T12:00:00Z`), tz);
      end = new Date(startOfDay(new Date(`${to}T12:00:00Z`), tz).getTime() + DAY - 1);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end)
        throw Object.assign(new Error('Invalid custom range'), { status: 400 });
      break;
    }
    default: throw Object.assign(new Error(`Unknown range "${range}"`), { status: 400 });
  }
  const span = (end - (start || new Date(end - 366 * DAY))) / DAY;
  const granularity = span <= 2 ? 'hour' : span <= 92 ? 'day' : 'month';
  return { from: start, to: end, granularity, tz, range };
}

const dateMatch = (field, r) => ({ [field]: r.from ? { $gte: r.from, $lte: r.to } : { $lte: r.to } });
const FORMATS = { hour: '%Y-%m-%d %H:00', day: '%Y-%m-%d', month: '%Y-%m' };
function label(date, granularity, tz) {
  const p = tzParts(date, tz);
  const z = (n) => String(n).padStart(2, '0');
  if (granularity === 'month') return `${p.y}-${z(p.m)}`;
  if (granularity === 'day') return `${p.y}-${z(p.m)}-${z(p.d)}`;
  return `${p.y}-${z(p.m)}-${z(p.d)} ${z(p.h)}:00`;
}
// Every bucket label between from and to, so charts get zeros instead of gaps
function bucketLabels(r, firstDataDate) {
  const from = r.from || firstDataDate;
  if (!from) return [];
  const step = r.granularity === 'hour' ? 3600000 : DAY / 2; // half-day steps are safe across DST / month ends
  const out = new Set();
  for (let t = from.getTime(); t <= r.to.getTime(); t += step) out.add(label(new Date(t), r.granularity, r.tz));
  out.add(label(r.to, r.granularity, r.tz));
  return [...out];
}

// ---------- Week 4 ----------
const COMPLETED = { transactionStatus: 'COMPLETED' };

/** Total sales, commission earned, seller payouts (COMPLETED only). */
export async function getSalesSummary(opts = {}) {
  const r = resolveRange(opts);
  const [s] = await M('Transaction').aggregate([
    { $match: { ...COMPLETED, ...dateMatch('completedAt', r) } },
    { $group: { _id: null, totalSales: { $sum: '$amount' }, totalCommission: { $sum: '$commissionAmount' }, sellerPayouts: { $sum: '$sellerAmount' }, count: { $sum: 1 }, avgSale: { $avg: '$amount' } } },
  ]);
  return {
    range: r.range, from: r.from, to: r.to,
    totalSales: r2(s?.totalSales), totalCommission: r2(s?.totalCommission), sellerPayouts: r2(s?.sellerPayouts),
    completedTransactions: s?.count || 0, averageSale: r2(s?.avgSale),
  };
}

/** Count and amount of transactions per status (created in range). Every status is present, even if 0. */
export async function getTransactionsByStatus(opts = {}) {
  const r = resolveRange(opts);
  const rows = await M('Transaction').aggregate([
    { $match: dateMatch('createdAt', r) },
    { $group: { _id: '$transactionStatus', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
  ]);
  const { TRANSACTION_STATUS } = await import('../models/constants.js');
  const byId = new Map(rows.map((x) => [x._id, x]));
  return TRANSACTION_STATUS.map((status) => ({ status, count: byId.get(status)?.count || 0, amount: r2(byId.get(status)?.amount) }));
}

// ---------- Week 5 ----------
/** Sales + commission per hour/day/month for charts. opts: { range, from, to, granularity? } */
export async function getSalesOverTime(opts = {}) {
  const r = resolveRange(opts);
  if (opts.granularity) r.granularity = opts.granularity;
  if (!FORMATS[r.granularity]) throw Object.assign(new Error('granularity must be hour, day or month'), { status: 400 });
  const rows = await M('Transaction').aggregate([
    { $match: { ...COMPLETED, ...dateMatch('completedAt', r) } },
    { $group: { _id: { $dateToString: { date: '$completedAt', format: FORMATS[r.granularity], timezone: r.tz } }, sales: { $sum: '$amount' }, commission: { $sum: '$commissionAmount' }, count: { $sum: 1 }, first: { $min: '$completedAt' } } },
    { $sort: { _id: 1 } },
  ]);
  const byKey = new Map(rows.map((x) => [x._id, x]));
  const first = rows.length ? rows.reduce((a, b) => (a.first < b.first ? a : b)).first : null;
  const labels = bucketLabels(r, first);
  return {
    range: r.range, granularity: r.granularity, timezone: r.tz, from: r.from, to: r.to,
    series: labels.map((period) => ({ period, sales: r2(byKey.get(period)?.sales), commission: r2(byKey.get(period)?.commission), transactions: byKey.get(period)?.count || 0 })),
  };
}

/** Headline numbers for GET /api/admin/dashboard (blueprint Module 6). */
export async function getDashboardMetrics() {
  const [totalUsers, restrictedUsers, activeListings, soldListings, pendingReports, pendingFlags, totalTransactions, sales, commissionRate] = await Promise.all([
    M('User').countDocuments(),
    M('User').countDocuments({ isRestricted: true }),
    M('Product').countDocuments({ status: 'AVAILABLE' }),
    M('Product').countDocuments({ status: 'SOLD' }),
    M('Report').countDocuments({ status: 'PENDING' }),
    M('AiFlag').countDocuments({ adminDecision: 'PENDING' }),
    M('Transaction').countDocuments(),
    getSalesSummary({ range: 'all' }),
    M('Settings').get('commissionRate'),
  ]);
  return {
    totalUsers, restrictedUsers, activeListings, soldListings, pendingReports, pendingFlags, totalTransactions,
    totalSalesVolume: sales.totalSales, totalCommission: sales.totalCommission, completedTransactions: sales.completedTransactions, commissionRate,
  };
}

/** Best-selling categories by COMPLETED sales in range. */
export async function getTopCategories(opts = {}) {
  const r = resolveRange(opts);
  const rows = await M('Transaction').aggregate([
    { $match: { ...COMPLETED, ...dateMatch('completedAt', r) } },
    { $project: { productId: 1, amount: 1 } },
    { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'p' } },
    { $set: { category: { $ifNull: [{ $arrayElemAt: ['$p.category', 0] }, 'Unknown'] } } },
    { $group: { _id: '$category', sales: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { sales: -1 } },
    { $limit: Number(opts.limit) || 8 },
  ]);
  return rows.map((x) => ({ category: x._id, sales: r2(x.sales), transactions: x.count }));
}

// ---------- Week 7: AI analytics (blueprint Module 10) ----------
export async function getAiAnalytics(opts = {}) {
  const r = resolveRange(opts);
  const created = dateMatch('createdAt', r);
  const [pred] = await M('AiPrediction').aggregate([
    { $match: created },
    {
      $facet: {
        totals: [{ $group: { _id: null, count: { $sum: 1 }, avgPredicted: { $avg: '$predictedPrice' } } }],
        byModel: [{ $group: { _id: '$modelVersion', count: { $sum: 1 } } }, { $sort: { count: -1 } }],
        accuracy: [
          { $match: { actualSalePrice: { $type: 'number' } } },
          { $set: { err: { $subtract: ['$actualSalePrice', '$predictedPrice'] } } },
          { $group: { _id: null, n: { $sum: 1 }, absErr: { $sum: { $abs: '$err' } }, sse: { $sum: { $multiply: ['$err', '$err'] } }, sumY: { $sum: '$actualSalePrice' }, sumY2: { $sum: { $multiply: ['$actualSalePrice', '$actualSalePrice'] } }, avgActual: { $avg: '$actualSalePrice' } } },
        ],
      },
    },
  ]);
  const a = pred.accuracy[0];
  const sst = a ? a.sumY2 - (a.sumY * a.sumY) / a.n : 0;
  const [flags, reports, search] = await Promise.all([
    M('AiFlag').aggregate([{ $match: created }, { $group: { _id: '$adminDecision', count: { $sum: 1 } } }]),
    M('Report').aggregate([{ $match: created }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    M('SearchLog').aggregate([
      { $match: created },
      {
        $facet: {
          byMode: [{ $group: { _id: '$mode', count: { $sum: 1 }, zeroResults: { $sum: { $cond: [{ $eq: ['$resultCount', 0] }, 1, 0] } } } }],
          topCategories: [{ $match: { category: { $type: 'string' } } }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 5 }],
          topQueries: [{ $group: { _id: { $toLower: '$query' }, count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }],
        },
      },
    ]),
  ]);
  const count = (rows, k) => rows.find((x) => x._id === k)?.count || 0;
  const s = search[0];
  return {
    range: r.range, from: r.from, to: r.to,
    priceIntelligence: {
      predictionsServed: pred.totals[0]?.count || 0,
      averagePredictedPrice: r2(pred.totals[0]?.avgPredicted),
      byModelVersion: pred.byModel.map((x) => ({ modelVersion: x._id, count: x.count })),
      // Real-world accuracy, only from predictions whose product later sold. null = not enough data yet (never invent numbers)
      evaluatedOnSales: a?.n || 0,
      averageActualPrice: a ? r2(a.avgActual) : null,
      mae: a ? r2(a.absErr / a.n) : null,
      rmse: a ? r2(Math.sqrt(a.sse / a.n)) : null,
      r2: a && a.n >= 2 && sst > 0 ? Math.round((1 - a.sse / sst) * 1000) / 1000 : null,
    },
    safety: {
      flagsRaised: flags.reduce((t, x) => t + x.count, 0),
      flagsPending: count(flags, 'PENDING'), flagsConfirmed: count(flags, 'CONFIRMED'), flagsDismissed: count(flags, 'DISMISSED'),
      reportsFiled: reports.reduce((t, x) => t + x.count, 0),
      reportsPending: count(reports, 'PENDING'), reportsResolved: count(reports, 'RESOLVED'), reportsDismissed: count(reports, 'DISMISSED'),
    },
    search: {
      totalSearches: s.byMode.reduce((t, x) => t + x.count, 0),
      semanticSearches: count(s.byMode, 'semantic'),
      keywordSearches: count(s.byMode, 'keyword'),
      zeroResultSearches: s.byMode.reduce((t, x) => t + x.zeroResults, 0),
      topCategories: s.topCategories.map((x) => ({ category: x._id, count: x.count })),
      topQueries: s.topQueries.map((x) => ({ query: x._id, count: x.count })),
    },
  };
}
