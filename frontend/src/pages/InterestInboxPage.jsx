import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, Send, CheckCircle2, XCircle, CreditCard, Ban, ChevronLeft, ChevronRight } from 'lucide-react';
import { interestApi, getErrorMessage } from '../services/api';
import { STATUS_BADGE, formatDate } from '../utils/constants';
import { DEFAULT_PRODUCT_IMAGE } from '../utils/imageUrl';
import Button from '../components/Button';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';

const PAGE_SIZE = 10;
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const TABS = [
  { id: 'seller', label: 'Received', icon: Inbox, hint: 'Buyers asking about your listings' },
  { id: 'buyer', label: 'Sent', icon: Send, hint: 'Listings you asked about' },
];
const STATUS_FILTERS = ['ALL', 'PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'];

// What each side can do next (the backend enforces the same rules)
const ACTIONS = {
  seller: { PENDING: ['ACCEPTED', 'REJECTED'] },
  buyer: { PENDING: ['CANCELLED'], ACCEPTED: ['CANCELLED'] },
};
const ACTION_LABEL = { ACCEPTED: 'Accept', REJECTED: 'Reject', CANCELLED: 'Cancel request' };

export default function InterestInboxPage() {
  const [role, setRole] = useState('seller');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [interests, setInterests] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  // Switching tabs quickly starts overlapping requests; only the newest one may update the page
  const latestRequest = useRef(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [pendingAction, setPendingAction] = useState(null); // { interest, status }
  const [actionError, setActionError] = useState('');
  const [isActing, setIsActing] = useState(false);

  const load = useCallback(async () => {
    const requestId = ++latestRequest.current;
    setIsLoading(true);
    setError('');
    try {
      const data = await interestApi.list({ role, status: status === 'ALL' ? '' : status, page, limit: PAGE_SIZE });
      if (requestId !== latestRequest.current) return;
      setInterests(data.items);
      setPagination(data.pagination);
    } catch (err) {
      if (requestId !== latestRequest.current) return;
      setError(getErrorMessage(err, 'Could not load your interests'));
    } finally {
      if (requestId === latestRequest.current) setIsLoading(false);
    }
  }, [role, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const switchTab = (next) => {
    setRole(next);
    setStatus('ALL');
    setPage(1);
    setNotice('');
  };

  const confirmAction = async () => {
    const { interest, status: next } = pendingAction;
    setIsActing(true);
    setActionError('');
    try {
      await interestApi.updateStatus(interest._id, next);
      setNotice(
        next === 'ACCEPTED'
          ? `Accepted ${interest.buyerId?.name}'s request. They can now pay for "${interest.productId?.title}".`
          : next === 'REJECTED'
          ? 'Request rejected.'
          : 'Your request was cancelled.'
      );
      setPendingAction(null);
      load();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setIsActing(false);
    }
  };

  const tab = TABS.find((t) => t.id === role);

  return (
    <div className="min-h-screen bg-[#F5F5F2] pb-24 pt-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0638C9]/10 px-3.5 py-1 text-xs font-heading font-bold text-[#0638C9] uppercase tracking-wider mb-2">
              <Inbox className="h-3.5 w-3.5" />
              <span>Interest Inbox</span>
            </div>
            <h1 className="text-3xl font-heading font-black text-[#111111] sm:text-4xl tracking-tight">Buy Requests</h1>
            <p className="mt-1 text-xs text-[#62666F] sm:text-sm">{tab.hint}.</p>
          </div>
          <Link to="/transactions">
            <Button variant="white" size="sm" className="uppercase text-xs">Transactions</Button>
          </Link>
        </div>

        {/* Received / Sent */}
        <div className="inline-flex rounded-full border border-[#E8E8E8] bg-white p-1 shadow-sm">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => switchTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-heading font-bold uppercase tracking-wider transition ${
                role === t.id ? 'bg-[#0638C9] text-white' : 'text-[#62666F] hover:text-[#111111]'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {notice && (
          <div role="status" className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-heading font-bold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setStatus(s); setPage(1); }}
              className={`rounded-full px-4 py-1.5 text-xs font-heading font-bold uppercase tracking-wider transition ${
                status === s ? 'bg-[#111111] text-white' : 'bg-white text-[#62666F] border border-[#E8E8E8] hover:border-[#111111]'
              }`}
            >
              {s === 'ALL' ? 'All' : s}
            </button>
          ))}
        </div>

        {isLoading ? (
          <LoadingSpinner size="lg" label="Loading requests..." className="py-20" />
        ) : error ? (
          <ErrorMessage title="Could not load requests" message={error} onRetry={load} />
        ) : interests.length === 0 ? (
          <EmptyState
            icon={role === 'seller' ? Inbox : Send}
            title={role === 'seller' ? 'No requests here' : 'You have not sent any requests'}
            description={role === 'seller' ? 'When a buyer is interested in one of your listings, it shows up here.' : 'Open a listing in the marketplace and tap "I\'m Interested".'}
          />
        ) : (
          <div className="space-y-4">
            {interests.map((item) => {
              const product = item.productId || {};
              const other = role === 'seller' ? item.buyerId : item.sellerId;
              const actions = ACTIONS[role][item.status] || [];
              const canPay = role === 'buyer' && item.status === 'ACCEPTED' && product.status === 'AVAILABLE';
              return (
                <div key={item._id} className="rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card transition hover:shadow-softblue">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <Link to={`/product/${product._id}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#F5F5F2] border border-[#E8E8E8]">
                        <img src={product.images?.[0] || DEFAULT_PRODUCT_IMAGE} alt={product.title} className="h-full w-full object-cover" />
                      </Link>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-3 py-0.5 text-[10px] font-heading font-extrabold uppercase tracking-wider ${STATUS_BADGE[item.status]}`}>
                            {item.status}
                          </span>
                          {product.status && product.status !== 'AVAILABLE' && (
                            <span className={`rounded-full px-3 py-0.5 text-[10px] font-heading font-extrabold uppercase tracking-wider ${STATUS_BADGE[product.status]}`}>
                              Listing {product.status}
                            </span>
                          )}
                          <span className="text-[11px] text-[#62666F]">{formatDate(item.createdAt)}</span>
                        </div>
                        <h3 className="font-heading font-bold text-[#111111] truncate">
                          <Link to={`/product/${product._id}`} className="hover:text-[#0638C9]">{product.title || 'Listing'}</Link>
                        </h3>
                        <p className="text-xs text-[#62666F]">
                          {inr(product.price)} &bull; {role === 'seller' ? 'Buyer' : 'Seller'}: <strong className="text-[#111111]">{other?.name}</strong>
                        </p>
                        {item.message && (
                          <p className="rounded-2xl bg-[#F5F5F2] px-3.5 py-2 text-xs text-[#111111] italic">“{item.message}”</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      {canPay && (
                        <Link to={`/payment/${item._id}`}>
                          <Button size="sm" variant="lime" icon={CreditCard} className="uppercase text-xs font-heading font-black">
                            {item.transactionId ? 'Open payment' : 'Proceed to payment'}
                          </Button>
                        </Link>
                      )}
                      {actions.map((next) => (
                        <Button
                          key={next}
                          size="sm"
                          variant={next === 'ACCEPTED' ? 'primary' : next === 'REJECTED' ? 'danger' : 'white'}
                          icon={next === 'ACCEPTED' ? CheckCircle2 : next === 'REJECTED' ? XCircle : Ban}
                          onClick={() => { setActionError(''); setPendingAction({ interest: item, status: next }); }}
                          className="uppercase text-xs"
                        >
                          {ACTION_LABEL[next]}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button variant="white" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <span className="text-xs font-heading font-bold text-[#62666F]">Page {page} of {pagination.totalPages}</span>
                <Button variant="white" size="sm" icon={ChevronRight} iconPosition="right" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={Boolean(pendingAction)}
        onClose={() => setPendingAction(null)}
        title={pendingAction ? `${ACTION_LABEL[pendingAction.status]}?` : ''}
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setPendingAction(null)}>Back</Button>
            <Button
              variant={pendingAction?.status === 'ACCEPTED' ? 'primary' : 'danger'}
              size="sm"
              isLoading={isActing}
              onClick={confirmAction}
            >
              {pendingAction ? ACTION_LABEL[pendingAction.status] : ''}
            </Button>
          </>
        }
      >
        <p className="text-sm text-[#62666F]">
          {pendingAction?.status === 'ACCEPTED' &&
            `${pendingAction.interest.buyerId?.name} will be able to pay for "${pendingAction.interest.productId?.title}". The first completed payment buys the item; other pending requests are then rejected automatically.`}
          {pendingAction?.status === 'REJECTED' && `${pendingAction.interest.buyerId?.name} will see that you declined.`}
          {pendingAction?.status === 'CANCELLED' && 'The seller will see that you are no longer interested.'}
        </p>
        {actionError && <ErrorMessage variant="inline" message={actionError} className="mt-3" />}
      </Modal>
    </div>
  );
}
