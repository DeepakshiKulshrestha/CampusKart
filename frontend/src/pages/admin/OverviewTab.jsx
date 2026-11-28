import { useState, useEffect, useCallback } from 'react';
import { Users, Tag, Package, Flag, Receipt, IndianRupee, Percent, UserX } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { adminApi, getErrorMessage } from '../../services/api';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Card, RangePicker, rangeParams, inr } from './shared';

const BLUE = '#0638C9';
const LIME = '#7FB800';
const STATUS_COLORS = { PENDING: '#F59E0B', COMPLETED: '#16A34A', CANCELLED: '#94A3B8', REFUNDED: '#64748B' };

function Metric({ label, value, icon: Icon, tone = 'bg-[#0638C9]/10 text-[#0638C9]' }) {
  return (
    <div className="rounded-3xl border border-[#E8E8E8] bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-[#62666F]">{label}</span>
        <span className={`grid h-8 w-8 place-items-center rounded-2xl ${tone}`}><Icon className="h-4 w-4" /></span>
      </div>
      <div className="mt-2 font-heading text-2xl font-black text-[#111111]">{value}</div>
    </div>
  );
}

export default function OverviewTab() {
  const [metrics, setMetrics] = useState(null);
  const [metricsError, setMetricsError] = useState('');
  const [range, setRange] = useState({ range: 'month', from: '', to: '' });
  const [charts, setCharts] = useState(null);
  const [chartsError, setChartsError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadMetrics = useCallback(async () => {
    setMetricsError('');
    try {
      setMetrics((await adminApi.getDashboard()).metrics);
    } catch (err) {
      setMetricsError(getErrorMessage(err, 'Could not load dashboard metrics'));
    }
  }, []);

  const params = rangeParams(range);
  const paramsKey = JSON.stringify(params);

  const loadCharts = useCallback(async () => {
    if (!params) return;
    setIsLoading(true);
    setChartsError('');
    try {
      const [summary, overTime, byStatus, categories] = await Promise.all([
        adminApi.getAnalytics('summary', params),
        adminApi.getAnalytics('sales-over-time', params),
        adminApi.getAnalytics('transactions-by-status', params),
        adminApi.getAnalytics('top-categories', params),
      ]);
      setCharts({ summary: summary.summary, series: overTime.series, granularity: overTime.granularity, byStatus: byStatus.items, categories: categories.items });
    } catch (err) {
      setChartsError(getErrorMessage(err, 'Could not load analytics'));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);
  useEffect(() => {
    loadCharts();
  }, [loadCharts]);

  return (
    <div className="space-y-8">
      {metricsError ? (
        <ErrorMessage title="Could not load metrics" message={metricsError} onRetry={loadMetrics} />
      ) : !metrics ? (
        <LoadingSpinner label="Loading metrics..." className="py-8" />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Metric label="Total users" value={metrics.totalUsers} icon={Users} />
          <Metric label="Active listings" value={metrics.activeListings} icon={Tag} tone="bg-lime-100 text-lime-800" />
          <Metric label="Sold listings" value={metrics.soldListings} icon={Package} tone="bg-slate-100 text-slate-700" />
          <Metric label="Pending reports" value={metrics.pendingReports} icon={Flag} tone="bg-red-50 text-red-600" />
          <Metric label="Transactions" value={metrics.totalTransactions} icon={Receipt} tone="bg-purple-50 text-purple-600" />
          <Metric label="Total sales" value={inr(metrics.totalSalesVolume)} icon={IndianRupee} tone="bg-emerald-50 text-emerald-700" />
          <Metric label="Commission earned" value={inr(metrics.totalCommission)} icon={Percent} tone="bg-emerald-50 text-emerald-700" />
          <Metric label="Restricted users" value={metrics.restrictedUsers} icon={UserX} tone="bg-amber-50 text-amber-700" />
        </div>
      )}
      {metrics && (
        <p className="-mt-4 text-[11px] text-[#62666F]">
          Sales and commission only count COMPLETED transactions ({metrics.completedTransactions} so far). Current commission rate: {metrics.commissionRate}%.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-heading font-black text-[#111111]">Sales analytics</h2>
        <RangePicker value={range} onChange={setRange} />
      </div>

      {!params ? (
        <p className="text-xs text-[#62666F]">Pick both dates for a custom range.</p>
      ) : chartsError ? (
        <ErrorMessage title="Could not load analytics" message={chartsError} onRetry={loadCharts} />
      ) : isLoading || !charts ? (
        <LoadingSpinner label="Loading charts..." className="py-12" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Metric label="Sales in range" value={inr(charts.summary.totalSales)} icon={IndianRupee} tone="bg-emerald-50 text-emerald-700" />
            <Metric label="Commission in range" value={inr(charts.summary.totalCommission)} icon={Percent} tone="bg-emerald-50 text-emerald-700" />
            <Metric label="Completed sales" value={charts.summary.completedTransactions} icon={Receipt} />
            <Metric label="Average sale" value={inr(charts.summary.averageSale)} icon={Tag} />
          </div>

          <Card title="Sales and commission over time" subtitle={`Per ${charts.granularity}, completed transactions only`}>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} minTickGap={24} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => inr(v)} />
                  <Legend />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke={BLUE} fill={BLUE} fillOpacity={0.15} />
                  <Area type="monotone" dataKey="commission" name="Commission" stroke={LIME} fill={LIME} fillOpacity={0.25} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="Transactions by status" subtitle="Created in this range">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.byStatus}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
                    <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Transactions" radius={[6, 6, 0, 0]}>
                      {charts.byStatus.map((row) => (
                        <Cell key={row.status} fill={STATUS_COLORS[row.status]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Top categories" subtitle="By completed sales">
              {charts.categories.length === 0 ? (
                <p className="py-20 text-center text-xs text-[#62666F]">No completed sales in this range.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.categories} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={90} />
                      <Tooltip formatter={(v, name) => (name === 'Sales' ? inr(v) : v)} />
                      <Bar dataKey="sales" name="Sales" fill={BLUE} radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
