import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, getErrorMessage } from '../../services/api';
import { STATUS_BADGE, REPORT_STATUS, formatDate } from '../../utils/constants';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { Card, Pager, FilterSelect, th, td, inr } from './shared';

// Next steps the backend allows (models/constants.js REPORT_TRANSITIONS)
const NEXT = { PENDING: ['REVIEWED', 'RESOLVED', 'DISMISSED'], REVIEWED: ['RESOLVED', 'DISMISSED'] };
const LABEL = { REVIEWED: 'Mark reviewed', RESOLVED: 'Resolve', DISMISSED: 'Dismiss' };

export default function ReportsTab() {
  const [status, setStatus] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const [review, setReview] = useState(null); // { report, status }
  const [note, setNote] = useState('');
  const [removeListing, setRemoveListing] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setError('');
    setData(null);
    try {
      setData(await adminApi.getReports({ status, page, limit: 10 }));
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load reports'));
    }
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openReview = (report, next) => {
    setReview({ report, status: next });
    setNote(report.adminNote || '');
    setRemoveListing(false);
    setReviewError('');
  };

  const save = async () => {
    setIsSaving(true);
    setReviewError('');
    try {
      await adminApi.reviewReport(review.report._id, { status: review.status, adminNote: note.trim() || undefined, removeListing });
      setReview(null);
      load();
    } catch (err) {
      setReviewError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card
      title="Reported listings"
      subtitle="Community reports. Resolve = the report was right (optionally remove the listing); Dismiss = no action needed."
      action={
        <FilterSelect
          label="Report status"
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={[{ value: '', label: 'All statuses' }, ...REPORT_STATUS.map((s) => ({ value: s, label: s }))]}
        />
      }
    >
      {error ? (
        <ErrorMessage title="Could not load reports" message={error} onRetry={load} />
      ) : !data ? (
        <LoadingSpinner label="Loading reports..." className="py-10" />
      ) : data.items.length === 0 ? (
        <EmptyState title="No reports" description="Nothing in this queue right now." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E8E8E8]">
              <thead>
                <tr>
                  <th className={th}>Listing</th>
                  <th className={th}>Reason</th>
                  <th className={th}>Reported by</th>
                  <th className={th}>Seller</th>
                  <th className={th}>Status</th>
                  <th className={th}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E8E8]">
                {data.items.map((r) => (
                  <tr key={r._id}>
                    <td className={td}>
                      {r.productId ? (
                        <>
                          <Link to={`/product/${r.productId._id}`} className="font-heading font-bold hover:text-[#0638C9]">{r.productId.title}</Link>
                          <div className="text-[#62666F]">{inr(r.productId.price)} &bull; listing {r.productId.status}</div>
                        </>
                      ) : '—'}
                    </td>
                    <td className={td}>
                      <div className="font-semibold">{r.reason}</div>
                      {r.details && <div className="max-w-xs text-[#62666F]">{r.details}</div>}
                      <div className="text-[#62666F]">{formatDate(r.createdAt)}</div>
                    </td>
                    <td className={td}>{r.reportedBy?.name}<div className="text-[#62666F]">{r.reportedBy?.email}</div></td>
                    <td className={td}>{r.sellerId?.name}<div className="text-[#62666F]">{r.sellerId?.email}</div></td>
                    <td className={td}>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-heading font-extrabold ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                      {r.reviewedBy && <div className="mt-1 text-[#62666F]">by {r.reviewedBy.name}</div>}
                      {r.adminNote && <div className="mt-1 max-w-xs italic text-[#62666F]">“{r.adminNote}”</div>}
                    </td>
                    <td className={td}>
                      <div className="flex flex-wrap gap-1.5">
                        {(NEXT[r.status] || []).map((next) => (
                          <Button
                            key={next}
                            size="sm"
                            variant={next === 'RESOLVED' ? 'primary' : next === 'DISMISSED' ? 'white' : 'ghost'}
                            onClick={() => openReview(r, next)}
                            className="text-[11px]"
                          >
                            {LABEL[next]}
                          </Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager pagination={data.pagination} page={page} setPage={setPage} />
        </>
      )}

      <Modal
        isOpen={Boolean(review)}
        onClose={() => setReview(null)}
        title={review ? `${LABEL[review.status]}: ${review.report.productId?.title || 'report'}` : ''}
        size="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setReview(null)}>Cancel</Button>
            <Button variant={removeListing ? 'danger' : 'primary'} size="sm" isLoading={isSaving} onClick={save}>
              {review ? LABEL[review.status] : ''}{removeListing ? ' + remove listing' : ''}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="admin-note" className="mb-1 block text-xs font-semibold text-slate-700">Admin note (optional)</label>
            <textarea
              id="admin-note"
              rows={3}
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          {review?.status === 'RESOLVED' && review.report.productId?.status !== 'REMOVED' && (
            <label className="flex items-start gap-2 text-xs text-[#111111]">
              <input type="checkbox" checked={removeListing} onChange={(e) => setRemoveListing(e.target.checked)} className="mt-0.5" />
              <span>Also remove this listing from the marketplace (soft delete; transactions keep their record).</span>
            </label>
          )}
          {reviewError && <ErrorMessage variant="inline" message={reviewError} />}
        </div>
      </Modal>
    </Card>
  );
}
