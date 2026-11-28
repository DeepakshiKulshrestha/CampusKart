import { useState, useEffect, useCallback } from 'react';
import { Percent } from 'lucide-react';
import { adminApi, getErrorMessage } from '../../services/api';
import { formatDateTime } from '../../utils/constants';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { Card, Pager, RangePicker, rangeParams, th, td, inr } from './shared';

export default function CommissionTab() {
  const [current, setCurrent] = useState(null);
  const [currentError, setCurrentError] = useState('');
  const [newRate, setNewRate] = useState('');
  const [formError, setFormError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState('');

  const [range, setRange] = useState({ range: 'all', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [history, setHistory] = useState(null);
  const [summary, setSummary] = useState(null);
  const [historyError, setHistoryError] = useState('');

  const loadCurrent = useCallback(async () => {
    setCurrentError('');
    try {
      setCurrent(await adminApi.getCommission());
    } catch (err) {
      setCurrentError(getErrorMessage(err, 'Could not load the commission rate'));
    }
  }, []);

  const params = rangeParams(range);
  const paramsKey = JSON.stringify(params);

  const loadHistory = useCallback(async () => {
    if (!params) return;
    setHistoryError('');
    setHistory(null);
    try {
      const [txs, sum] = await Promise.all([
        adminApi.getTransactions({ ...params, status: 'COMPLETED', page, limit: 15 }),
        adminApi.getAnalytics('summary', params),
      ]);
      setHistory(txs);
      setSummary(sum.summary);
    } catch (err) {
      setHistoryError(getErrorMessage(err, 'Could not load commission history'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, page]);

  useEffect(() => {
    loadCurrent();
  }, [loadCurrent]);
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const openConfirm = (e) => {
    e.preventDefault();
    setSaved('');
    const n = Number(newRate);
    if (newRate === '' || Number.isNaN(n) || n < 0 || n > 100) return setFormError('Enter a number between 0 and 100');
    if (n === Number(current?.commissionRate)) return setFormError('That is already the current rate');
    setFormError('');
    setConfirmOpen(true);
  };

  const save = async () => {
    setIsSaving(true);
    try {
      const res = await adminApi.updateCommission(Number(newRate));
      setSaved(`Commission rate changed to ${res.commissionRate}%. It applies to transactions created from now on.`);
      setNewRate('');
      setConfirmOpen(false);
      loadCurrent();
    } catch (err) {
      setFormError(getErrorMessage(err));
      setConfirmOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card title="Commission rate" subtitle="Taken from each completed sale. Changing it never changes past transactions: each one keeps the rate it was created with.">
        {currentError ? (
          <ErrorMessage title="Could not load the rate" message={currentError} onRetry={loadCurrent} />
        ) : !current ? (
          <LoadingSpinner className="py-6" />
        ) : (
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="font-heading text-5xl font-black text-[#0638C9]">{current.commissionRate}</span>
                <Percent className="h-6 w-6 text-[#0638C9]" />
              </div>
              <p className="mt-1 text-xs text-[#62666F]">
                {current.isDefault
                  ? 'Default rate (never changed)'
                  : `Last changed ${formatDateTime(current.updatedAt)}${current.updatedBy ? ` by ${current.updatedBy.name}` : ''}`}
              </p>
            </div>
            <form onSubmit={openConfirm} className="flex items-end gap-2">
              <div>
                <label htmlFor="new-rate" className="mb-1 block text-xs font-semibold text-[#111111]">New rate (%)</label>
                <input
                  id="new-rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  className="w-28 rounded-2xl border border-[#E8E8E8] px-3 py-2 text-sm focus:border-[#0638C9] focus:outline-none"
                />
              </div>
              <Button type="submit" variant="primary" size="md">Change rate</Button>
            </form>
          </div>
        )}
        {formError && <ErrorMessage variant="inline" message={formError} className="mt-3" />}
        {saved && <p role="status" className="mt-3 text-xs font-semibold text-emerald-700">{saved}</p>}
      </Card>

      <Card title="Commission history" subtitle="Completed transactions with the rate snapshotted at the time" action={<RangePicker value={range} onChange={(r) => { setRange(r); setPage(1); }} />}>
        {!params ? (
          <p className="text-xs text-[#62666F]">Pick both dates for a custom range.</p>
        ) : historyError ? (
          <ErrorMessage title="Could not load history" message={historyError} onRetry={loadHistory} />
        ) : !history ? (
          <LoadingSpinner className="py-10" />
        ) : (
          <>
            {summary && (
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                <div className="rounded-2xl bg-[#F5F5F2] p-3"><div className="text-[#62666F]">Sales</div><div className="font-heading text-lg font-black">{inr(summary.totalSales)}</div></div>
                <div className="rounded-2xl bg-[#F5F5F2] p-3"><div className="text-[#62666F]">Commission earned</div><div className="font-heading text-lg font-black text-emerald-700">{inr(summary.totalCommission)}</div></div>
                <div className="rounded-2xl bg-[#F5F5F2] p-3"><div className="text-[#62666F]">Paid to sellers</div><div className="font-heading text-lg font-black">{inr(summary.sellerPayouts)}</div></div>
                <div className="rounded-2xl bg-[#F5F5F2] p-3"><div className="text-[#62666F]">Completed sales</div><div className="font-heading text-lg font-black">{summary.completedTransactions}</div></div>
              </div>
            )}
            {history.items.length === 0 ? (
              <EmptyState title="No completed sales" description="Nothing sold in this range yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#E8E8E8]">
                  <thead>
                    <tr>
                      <th className={th}>Completed</th>
                      <th className={th}>Product</th>
                      <th className={th}>Buyer → Seller</th>
                      <th className={th}>Amount</th>
                      <th className={th}>Rate</th>
                      <th className={th}>Commission</th>
                      <th className={th}>Seller got</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E8E8]">
                    {history.items.map((tx) => (
                      <tr key={tx._id}>
                        <td className={td}>{formatDateTime(tx.completedAt)}</td>
                        <td className={td}>{tx.productId?.title}<div className="text-[#62666F]">{tx.productId?.category}</div></td>
                        <td className={td}>{tx.buyerId?.name} → {tx.sellerId?.name}</td>
                        <td className={td}>{inr(tx.amount)}</td>
                        <td className={td}>{tx.commissionRate}%</td>
                        <td className={`${td} font-semibold text-emerald-700`}>{inr(tx.commissionAmount)}</td>
                        <td className={td}>{inr(tx.sellerAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pager pagination={history.pagination} page={page} setPage={setPage} />
          </>
        )}
      </Card>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Change the commission rate?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" isLoading={isSaving} onClick={save}>Set {newRate}%</Button>
          </>
        }
      >
        <p className="text-sm text-[#62666F]">
          From {current?.commissionRate}% to <strong className="text-[#111111]">{newRate}%</strong>. Only transactions created after this change use the new rate.
        </p>
      </Modal>
    </div>
  );
}
