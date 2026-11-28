import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Info } from 'lucide-react';
import { adminApi, getErrorMessage } from '../../services/api';
import { STATUS_BADGE, formatDate } from '../../utils/constants';
import { DEFAULT_PRODUCT_IMAGE } from '../../utils/imageUrl';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { Card, Pager, FilterSelect, inr } from './shared';

const RISK_STYLE = { HIGH: 'bg-red-100 text-red-700', MEDIUM: 'bg-amber-100 text-amber-800', LOW: 'bg-emerald-100 text-emerald-800' };
const DECISION_STYLE = { PENDING: 'bg-amber-100 text-amber-800', CONFIRMED: 'bg-red-100 text-red-700', DISMISSED: 'bg-slate-200 text-slate-700' };
const daysSince = (d) => (d ? Math.max(0, Math.floor((Date.now() - new Date(d)) / 86400000)) : null);

export default function AiFlagsTab() {
  const [decision, setDecision] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const [review, setReview] = useState(null); // { flag, adminDecision }
  const [note, setNote] = useState('');
  const [removeListing, setRemoveListing] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setError('');
    setData(null);
    try {
      setData(await adminApi.getAiFlags({ adminDecision: decision, page, limit: 10 }));
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load AI flags'));
    }
  }, [decision, page]);

  useEffect(() => {
    load();
  }, [load]);

  const open = (flag, adminDecision) => {
    setReview({ flag, adminDecision });
    setNote('');
    setRemoveListing(false);
    setReviewError('');
  };

  const save = async () => {
    setIsSaving(true);
    setReviewError('');
    try {
      await adminApi.reviewAiFlag(review.flag._id, { adminDecision: review.adminDecision, adminNote: note.trim() || undefined, removeListing });
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
      title="AI flags"
      subtitle="Listings the fraud model wants a human to look at, riskiest first."
      action={
        <FilterSelect
          label="Admin decision"
          value={decision}
          onChange={(v) => { setDecision(v); setPage(1); }}
          options={[
            { value: 'PENDING', label: 'Waiting for review' },
            { value: 'CONFIRMED', label: 'Confirmed suspicious' },
            { value: 'DISMISSED', label: 'Dismissed' },
            { value: '', label: 'All' },
          ]}
        />
      }
    >
      <div className="mb-5 flex items-start gap-2 rounded-2xl border border-[#0638C9]/15 bg-[#0638C9]/5 p-3 text-xs text-[#111111]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#0638C9]" />
        <p>
          The AI only <strong>suggests</strong>. It never removes listings or restricts accounts. You decide: <em>Confirm</em> if the listing
          really looks fraudulent (you can also remove it), or <em>Dismiss</em> if it's fine. Scores come from a model trained on synthetic data.
        </p>
      </div>

      {error ? (
        <ErrorMessage title="Could not load AI flags" message={error} onRetry={load} />
      ) : !data ? (
        <LoadingSpinner label="Loading AI flags..." className="py-10" />
      ) : data.items.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="No flags here" description="Nothing in this queue right now." />
      ) : (
        <div className="space-y-4">
          {data.items.map((f) => {
            const p = f.productId || {};
            const age = daysSince(f.sellerId?.createdAt);
            return (
              <div key={f._id} data-testid="ai-flag" className="rounded-3xl border border-[#E8E8E8] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <img src={p.images?.[0] || DEFAULT_PRODUCT_IMAGE} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-heading font-extrabold ${RISK_STYLE[f.riskLevel]}`}>{f.riskLevel} RISK</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-heading font-extrabold ${DECISION_STYLE[f.adminDecision]}`}>{f.adminDecision}</span>
                        {p.status && <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-heading font-extrabold ${STATUS_BADGE[p.status]}`}>{p.status}</span>}
                        <span className="text-[11px] text-[#62666F]">flagged {formatDate(f.createdAt)}</span>
                      </div>
                      {p.status && p.status !== 'REMOVED' ? (
                        <Link to={`/product/${p._id}`} className="block truncate font-heading font-bold text-[#111111] hover:text-[#0638C9]">{p.title}</Link>
                      ) : (
                        <span className="block truncate font-heading font-bold text-[#111111]">{p.title || 'Listing'}</span>
                      )}
                      <p className="text-xs text-[#62666F]">
                        {inr(p.price)} (bought for {inr(p.originalPrice)}) &bull; {p.category} &bull; seller <strong className="text-[#111111]">{f.sellerId?.name}</strong> ({f.sellerId?.email})
                        {age !== null && <> &bull; account {age} day{age === 1 ? '' : 's'} old</>}
                      </p>
                    </div>
                  </div>
                  <div className="w-full shrink-0 lg:w-48">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-[#62666F]">Suspicion score</span>
                      <span className="font-heading text-xl font-black text-[#111111]">{f.suspicionScore}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-[#F5F5F2]">
                      <div className={`h-2 rounded-full ${f.suspicionScore >= 70 ? 'bg-red-500' : f.suspicionScore >= 40 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${f.suspicionScore}%` }} />
                    </div>
                    <p className="mt-1 text-[10px] text-[#62666F]">anomaly {Math.round(f.anomalyScore ?? 0)} &bull; {f.modelVersion}</p>
                  </div>
                </div>

                {f.riskFactors?.length > 0 && (
                  <ul className="mt-3 space-y-1 rounded-2xl bg-[#F5F5F2] p-3 text-xs text-[#111111]">
                    {f.riskFactors.map((r) => (
                      <li key={r.feature}>&bull; {r.reason} <span className="text-[#62666F]">({r.feature}: {typeof r.value === 'number' ? Math.round(r.value * 10) / 10 : String(r.value)})</span></li>
                    ))}
                  </ul>
                )}
                {f.adminNote && <p className="mt-2 text-xs italic text-[#62666F]">Admin note{f.reviewedBy ? ` (${f.reviewedBy.name})` : ''}: “{f.adminNote}”</p>}

                {f.adminDecision === 'PENDING' && (
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Button size="sm" variant="white" onClick={() => open(f, 'DISMISSED')} className="text-[11px]">Dismiss</Button>
                    <Button size="sm" variant="danger" onClick={() => open(f, 'CONFIRMED')} className="text-[11px]">Confirm suspicious</Button>
                  </div>
                )}
              </div>
            );
          })}
          <Pager pagination={data.pagination} page={page} setPage={setPage} />
        </div>
      )}

      <Modal
        isOpen={Boolean(review)}
        onClose={() => setReview(null)}
        title={review?.adminDecision === 'CONFIRMED' ? 'Confirm as suspicious?' : 'Dismiss this flag?'}
        size="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setReview(null)}>Cancel</Button>
            <Button variant={review?.adminDecision === 'CONFIRMED' ? 'danger' : 'primary'} size="sm" isLoading={isSaving} onClick={save}>
              {review?.adminDecision === 'CONFIRMED' ? `Confirm${removeListing ? ' + remove listing' : ''}` : 'Dismiss flag'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-[#62666F]">
            {review?.adminDecision === 'CONFIRMED'
              ? 'This records your decision that the listing looks fraudulent. It also counts against the seller in future AI checks.'
              : 'The listing stays on the marketplace. The flag is closed with your note.'}
          </p>
          <div>
            <label htmlFor="flag-note" className="mb-1 block text-xs font-semibold text-slate-700">Note (optional)</label>
            <textarea id="flag-note" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-blue-600 focus:outline-none" />
          </div>
          {review?.adminDecision === 'CONFIRMED' && review.flag.productId?.status !== 'REMOVED' && (
            <label className="flex items-start gap-2 text-xs">
              <input type="checkbox" checked={removeListing} onChange={(e) => setRemoveListing(e.target.checked)} className="mt-0.5" />
              <span>Also remove the listing from the marketplace (soft delete).</span>
            </label>
          )}
          {reviewError && <ErrorMessage variant="inline" message={reviewError} />}
        </div>
      </Modal>
    </Card>
  );
}
