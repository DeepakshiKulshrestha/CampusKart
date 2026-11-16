import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  UserRound,
  Mail,
  AlertTriangle,
  ArrowRight,
  CreditCard,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { interestApi } from '../services/api';
import { getOrCreateConversation, formatINR } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { getProductImageUrl, DEFAULT_PRODUCT_IMAGE } from '../utils/imageUrl';
import Button from '../components/Button';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';

export default function InterestInboxPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [interests, setInterests] = useState([]);
  const [filter, setFilter] = useState('ALL'); // ALL | PENDING | ACCEPTED | REJECTED
  const [isLoading, setIsLoading] = useState(true);

  // Modal Action State
  const [activeAction, setActiveAction] = useState(null); // { item, type: 'ACCEPT' | 'REJECT' }
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionSuccessNotice, setActionSuccessNotice] = useState('');

  const loadSellerInterests = () => {
    if (!user) return;
    const items = interestApi.getSellerInterests(user.id, user.email);
    setInterests(items);
  };

  useEffect(() => {
    setIsLoading(true);
    loadSellerInterests();
    setIsLoading(false);

    const handleUpdate = () => loadSellerInterests();
    window.addEventListener('campuskart_interest_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('campuskart_interest_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [user]);

  const handleConfirmAction = async () => {
    if (!activeAction || !activeAction.item) return;
    setIsProcessing(true);

    try {
      const nextStatus = activeAction.type === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED';
      await interestApi.updateStatus(activeAction.item.id, nextStatus);
      loadSellerInterests();

      setActionSuccessNotice(
        activeAction.type === 'ACCEPT'
          ? `Interest request for "${activeAction.item.productTitle}" accepted!`
          : `Interest request for "${activeAction.item.productTitle}" rejected.`
      );
      setTimeout(() => setActionSuccessNotice(''), 3500);
      setActiveAction(null);
    } catch (err) {
      alert(err.message || 'Action failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredInterests = interests.filter((item) => {
    if (filter === 'ALL') return true;
    return item.status === filter;
  });

  const pendingCount = interests.filter((i) => i.status === 'PENDING').length;
  const acceptedCount = interests.filter((i) => i.status === 'ACCEPTED').length;
  const rejectedCount = interests.filter((i) => i.status === 'REJECTED').length;

  return (
    <div className="min-h-screen bg-[#F5F5F2] pb-24 pt-8 font-sans">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0638C9]/10 px-3.5 py-1 text-xs font-heading font-bold text-[#0638C9] uppercase tracking-wider mb-2">
              <Inbox className="h-3.5 w-3.5" />
              <span>Seller Management</span>
            </div>
            <h1 className="text-3xl font-heading font-black text-[#111111] sm:text-4xl tracking-tight">
              Seller Interest Inbox
            </h1>
            <p className="mt-1 text-xs text-[#62666F] sm:text-sm">
              Review and manage student buyers interested in purchasing your campus listings.
            </p>
          </div>

          <Link to="/my-listings">
            <Button variant="white" size="sm" className="uppercase text-xs">
              View My Listings
            </Button>
          </Link>
        </div>

        {/* Action Success Alert */}
        {actionSuccessNotice && (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-heading font-bold text-emerald-800 flex items-center gap-2 shadow-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessNotice}</span>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'ALL', label: `All Requests (${interests.length})` },
            { id: 'PENDING', label: `Pending (${pendingCount})` },
            { id: 'ACCEPTED', label: `Accepted (${acceptedCount})` },
            { id: 'REJECTED', label: `Rejected (${rejectedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`rounded-full px-5 py-2 text-xs font-heading font-bold uppercase tracking-wider transition-all ${
                filter === tab.id
                  ? 'bg-[#0638C9] text-white shadow-sm'
                  : 'bg-white text-[#62666F] border border-[#E8E8E8] hover:border-[#111111] hover:text-[#111111]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Requests List */}
        {isLoading ? (
          <div className="py-20">
            <LoadingSpinner size="lg" label="Loading interest inbox..." />
          </div>
        ) : filteredInterests.length > 0 ? (
          <div className="space-y-4">
            {filteredInterests.map((item) => {
              const isPending = item.status === 'PENDING';
              const isAccepted = item.status === 'ACCEPTED';
              const isRejected = item.status === 'REJECTED';

              return (
                <div
                  key={item.id}
                  className="rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card transition hover:shadow-softblue"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left: Product Thumbnail & Buyer info */}
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <Link
                        to={`/product/${item.productId}`}
                        className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#F5F5F2] border border-[#E8E8E8]"
                      >
                        <img
                          src={getProductImageUrl(item)}
                          alt={item.productTitle}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            if (e.currentTarget.src !== DEFAULT_PRODUCT_IMAGE) {
                              e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                            }
                          }}
                        />
                      </Link>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-0.5 text-[10px] font-heading font-extrabold uppercase tracking-wider ${
                              isPending
                                ? 'bg-amber-100 text-amber-800'
                                : isAccepted
                                ? 'bg-[#B7FF00] text-[#111111]'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {item.status}
                          </span>
                          <span className="text-[11px] text-[#62666F]">
                            Requested on {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <h3 className="text-base font-heading font-bold text-[#111111] truncate">
                          <Link
                            to={`/product/${item.productId}`}
                            className="hover:text-[#0638C9]"
                          >
                            {item.productTitle}
                          </Link>
                        </h3>

                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-heading font-black text-[#0638C9]">
                            {formatINR(item.productPrice)}
                          </span>
                          <span className="text-[#E8E8E8]">&bull;</span>
                          <div className="flex items-center gap-1.5 text-[#62666F]">
                            <UserRound className="h-3.5 w-3.5 text-[#0638C9]" />
                            <span className="font-semibold text-[#111111]">{item.buyerName}</span>
                            <span className="text-[11px] text-[#62666F]">({item.buyerEmail})</span>
                          </div>
                        </div>

                        {item.message && (
                          <div className="mt-2 rounded-2xl bg-[#F5F5F2] p-3 text-xs text-[#111111] border border-[#E8E8E8]">
                            <span className="font-heading font-bold text-[#62666F] block mb-0.5 uppercase tracking-wider text-[10px]">
                              Buyer's Message:
                            </span>
                            "{item.message}"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                      <Button
                        size="sm"
                        variant="white"
                        icon={MessageSquare}
                        onClick={() => {
                          const conv = getOrCreateConversation({
                            productId: item.productId,
                            buyer: { id: item.buyerId, name: item.buyerName, email: item.buyerEmail },
                            seller: user,
                          });
                          navigate(`/chat/${conv.id}`);
                        }}
                        className="text-xs uppercase text-[#0638C9] border-[#0638C9]/30"
                      >
                        Negotiate in Chat
                      </Button>

                      {isPending ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="white"
                            icon={XCircle}
                            onClick={() => setActiveAction({ item, type: 'REJECT' })}
                            className="text-xs text-red-600 border-red-200 hover:bg-red-50 uppercase"
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="lime"
                            icon={CheckCircle2}
                            onClick={() => setActiveAction({ item, type: 'ACCEPT' })}
                            className="text-xs uppercase font-heading font-black"
                          >
                            Accept Request
                          </Button>
                        </div>
                      ) : isAccepted ? (
                        <div className="flex flex-col items-end gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-heading font-bold text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Accepted</span>
                          </span>
                          <Link to={`/payment/${item.id}`}>
                            <Button size="sm" variant="lime" icon={CreditCard} className="text-xs uppercase font-heading font-black">
                              Simulate Checkout
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-red-600">Request Rejected</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No Interest Requests Found"
            description="You currently don't have any interest requests matching this category."
          />
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={Boolean(activeAction)}
        onClose={() => setActiveAction(null)}
        title={activeAction?.type === 'ACCEPT' ? 'Accept Interest Request' : 'Reject Interest Request'}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={isProcessing}
              onClick={() => setActiveAction(null)}
            >
              Cancel
            </Button>
            <Button
              variant={activeAction?.type === 'ACCEPT' ? 'primary' : 'danger'}
              size="sm"
              isLoading={isProcessing}
              onClick={handleConfirmAction}
            >
              {activeAction?.type === 'ACCEPT' ? 'Confirm Acceptance' : 'Confirm Rejection'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 py-2 text-xs text-slate-600">
          <p>
            Are you sure you want to {activeAction?.type === 'ACCEPT' ? 'accept' : 'reject'} the interest request from{' '}
            <strong className="text-slate-900">{activeAction?.item?.buyerName}</strong> for{' '}
            <strong className="text-slate-900">{activeAction?.item?.productTitle}</strong>?
          </p>
          {activeAction?.type === 'ACCEPT' && (
            <div className="rounded-xl bg-blue-50 p-3 text-blue-800 border border-blue-100">
              Accepting allows you and the buyer to finalize campus pickup and initiate simulated payment.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

