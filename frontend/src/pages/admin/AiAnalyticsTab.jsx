import { useState, useEffect, useCallback } from 'react';
import { Brain, ShieldAlert, Search, Gauge } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { adminApi, getErrorMessage } from '../../services/api';
import { formatDateTime } from '../../utils/constants';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Card, RangePicker, rangeParams, th, td, inr } from './shared';

const dash = (v, fmt = (x) => x) => (v === null || v === undefined ? '—' : fmt(v));

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-2xl bg-[#F5F5F2] p-4">
      <div className="text-[11px] font-heading font-bold uppercase tracking-wider text-[#62666F]">{label}</div>
      <div className="mt-1 font-heading text-2xl font-black text-[#111111]">{value}</div>
      {hint && <div className="text-[11px] text-[#62666F]">{hint}</div>}
    </div>
  );
}

export default function AiAnalyticsTab() {
  const [range, setRange] = useState({ range: 'month', from: '', to: '' });
  const [ai, setAi] = useState(null);
  const [aiError, setAiError] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [metricsError, setMetricsError] = useState('');

  const params = rangeParams(range);
  const paramsKey = JSON.stringify(params);

  const loadAi = useCallback(async () => {
    if (!params) return;
    setAiError('');
    setAi(null);
    try {
      setAi((await adminApi.getAnalytics('ai', params)).ai);
    } catch (err) {
      setAiError(getErrorMessage(err, 'Could not load AI analytics'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  const loadMetrics = useCallback(async () => {
    setMetricsError('');
    try {
      setMetrics((await adminApi.getModelMetrics()).metrics);
    } catch (err) {
      setMetricsError(err.response?.status === 503 ? 'The ML service is not running, so model metrics are unavailable.' : getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    loadAi();
  }, [loadAi]);
  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const pi = ai?.priceIntelligence;
  const safety = ai?.safety;
  const search = ai?.search;
  const flagBars = safety
    ? [
        { name: 'Pending', value: safety.flagsPending, fill: '#F59E0B' },
        { name: 'Confirmed', value: safety.flagsConfirmed, fill: '#DC2626' },
        { name: 'Dismissed', value: safety.flagsDismissed, fill: '#94A3B8' },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-heading font-black text-[#111111]">AI analytics</h2>
        <RangePicker value={range} onChange={setRange} />
      </div>

      {!params ? (
        <p className="text-xs text-[#62666F]">Pick both dates for a custom range.</p>
      ) : aiError ? (
        <ErrorMessage title="Could not load AI analytics" message={aiError} onRetry={loadAi} />
      ) : !ai ? (
        <LoadingSpinner label="Loading AI analytics..." className="py-10" />
      ) : (
        <>
          <Card title={<span className="flex items-center gap-2"><Brain className="h-5 w-5 text-[#0638C9]" /> Price intelligence</span>} subtitle="Predictions served, and accuracy measured against real completed sales">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Predictions served" value={pi.predictionsServed} hint={`avg ${inr(pi.averagePredictedPrice)}`} />
              <Stat label="Checked against sales" value={pi.evaluatedOnSales} hint="predictions whose item later sold" />
              <Stat label="Real-world MAE" value={dash(pi.mae, inr)} hint={pi.mae === null ? 'not enough sales yet' : 'average error vs sale price'} />
              <Stat label="Real-world RMSE / R²" value={`${dash(pi.rmse, inr)} / ${dash(pi.r2)}`} hint="from completed sales only" />
            </div>
            {pi.byModelVersion.length > 0 && (
              <p className="mt-3 text-[11px] text-[#62666F]">
                Model versions: {pi.byModelVersion.map((m) => `${m.modelVersion} (${m.count})`).join(', ')}
              </p>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title={<span className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-red-600" /> Safety</span>} subtitle="AI flags and community reports in this range">
              <div className="grid grid-cols-2 gap-3">
                <Stat label="AI flags raised" value={safety.flagsRaised} />
                <Stat label="Reports filed" value={safety.reportsFiled} hint={`${safety.reportsPending} pending, ${safety.reportsResolved} resolved`} />
              </div>
              <div className="mt-4 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flagBars}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Flags" radius={[6, 6, 0, 0]}>
                      {flagBars.map((b) => <Cell key={b.name} fill={b.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title={<span className="flex items-center gap-2"><Search className="h-5 w-5 text-[#0638C9]" /> Search</span>} subtitle="What students search for">
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Searches" value={search.totalSearches} />
                <Stat label="Smart (AI)" value={search.semanticSearches} />
                <Stat label="Zero results" value={search.zeroResultSearches} />
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
                <div>
                  <p className="mb-1 font-heading font-bold text-[#62666F]">Top queries</p>
                  {search.topQueries.length ? (
                    <ol className="list-decimal space-y-0.5 pl-4">{search.topQueries.slice(0, 6).map((q) => <li key={q.query}>{q.query} <span className="text-[#62666F]">({q.count})</span></li>)}</ol>
                  ) : <p className="text-[#62666F]">No searches yet.</p>}
                </div>
                <div>
                  <p className="mb-1 font-heading font-bold text-[#62666F]">Top categories</p>
                  {search.topCategories.length ? (
                    <ol className="list-decimal space-y-0.5 pl-4">{search.topCategories.map((c) => <li key={c.category}>{c.category} <span className="text-[#62666F]">({c.count})</span></li>)}</ol>
                  ) : <p className="text-[#62666F]">No category filters used.</p>}
                </div>
              </div>
            </Card>
          </div>
        </>
      )}

      <Card title={<span className="flex items-center gap-2"><Gauge className="h-5 w-5 text-[#0638C9]" /> Price model metrics</span>} subtitle="Validation results reported by the ML service">
        {metricsError ? (
          <ErrorMessage variant="inline" message={metricsError} />
        ) : !metrics ? (
          <LoadingSpinner className="py-6" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Selected model" value={metrics.selectedEstimator} hint={metrics.modelVersion} />
              <Stat label="Holdout MAE" value={dash(metrics.finalHoldoutMetrics?.maeInr, inr)} />
              <Stat label="Holdout RMSE" value={dash(metrics.finalHoldoutMetrics?.rmseInr, inr)} />
              <Stat label="Holdout R²" value={dash(metrics.finalHoldoutMetrics?.r2)} hint={`trained ${formatDateTime(metrics.trainedAtUtc)}`} />
            </div>
            {metrics.candidateMetrics && (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-[#E8E8E8]">
                  <thead>
                    <tr><th className={th}>Candidate</th><th className={th}>MAE</th><th className={th}>RMSE</th><th className={th}>R²</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E8E8]">
                    {Object.entries(metrics.candidateMetrics).map(([name, m]) => (
                      <tr key={name}>
                        <td className={`${td} font-heading font-bold`}>{name}{name === metrics.selectedEstimator ? ' ✓' : ''}</td>
                        <td className={td}>{inr(m.maeInr)}</td>
                        <td className={td}>{inr(m.rmseInr)}</td>
                        <td className={td}>{m.r2}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {metrics.caveat && <p className="mt-3 text-[11px] text-amber-800">{metrics.caveat}</p>}
          </>
        )}
      </Card>
    </div>
  );
}
