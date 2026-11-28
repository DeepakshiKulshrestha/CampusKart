import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Receipt, ShoppingBag, Store, ChevronLeft, ChevronRight, Ban } from 'lucide-react';
import { transactionApi, getErrorMessage } from '../services/api';
import { STATUS_BADGE, TRANSACTION_STATUS, formatDate } from '../utils/constants';
import { DEFAULT_PRODUCT_IMAGE } from '../utils/imageUrl';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';

const PAGE_SIZE = 10;
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const TABS = [
  { id: 'buyer', label: 'Purchases', icon: ShoppingBag },
  { id: 'seller', label: 'Sales', icon: Store },
];

export default function TransactionHistoryPage() {
  const [role, setRole] = useState('buyer');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  // Switching tabs quickly starts overlapping requests; only the newest one may update the page
  const latestRequest = useRef(0);
  const [error, setError] = useState('');
  const [rowError, setRowError] = useState({}); // { [txId]: message }
  const [cancellingId, setCancellingId] = useState(null);

  const load = useCallback(async () => {
    const requestId = ++latestRequest.current;
    setIsLoading(true);
    setError('');
    try {
      const data = await transactionApi.list({ role, status, page, limit: PAGE_SIZE });
      if (requestId !== latestRequest.current) return;
      setItems(data.items);
      setPagination(data.pagination);
    } catch (err) {
      if (requestId !== latestRequest.current) return;
      setError(getErrorMessage(err, 'Could not load your transactions'));
    } finally {
      if (requestId === latestRequest.current) setIsLoading(false);
    }
  }, [role, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const cancel = async (tx) => {
    setCancellingId(tx._id);
    setRowError({});
    try {
      await transactionApi.cancel(tx._id);
      load();
    } catch (err) {
      setRowError({ [tx._id]: getErrorMessage(err) });
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F2] pb-24 pt-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0638C9]/10 px-3.5 py-1 text-xs font-heading font-bold text-[#0638C9] uppercase tracking-wider mb-2">
            <Receipt className="h-3.5 w-3.5" />
            <span>Transactions</span>
          </div>
          <h1 className="text-3xl font-heading font-black text-[#111111] sm:text-4xl tracking-tight">Transaction History</h1>
          <p className="mt-1 text-xs text-[#62666F] sm:text-sm">Your purchases and sales, with the commission breakdown for each.</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full border border-[#E8E8E8] bg-white p-1 shadow-sm">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setRole(t.id); setPage(1); }}
                className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-heading font-bold uppercase tracking-wider transition ${
                  role === t.id ? 'bg-[#0638C9] text-white' : 'text-[#62666F] hover:text-[#111111]'
                }`}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="rounded-full border border-[#E8E8E8] bg-white px-4 py-2 text-xs font-heading font-bold text-[#111111] focus:border-[#0638C9] focus:outline-none"
          >
            <option value="">All statuses</option>
            {TRANSACTION_STATUS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <LoadingSpinner size="lg" label="Loading transactions..." className="py-20" />
        ) : error ? (
          <ErrorMessage title="Could not load transactions" message={error} onRetry={load} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={role === 'buyer' ? 'No purchases yet' : 'No sales yet'}
            description={role === 'buyer' ? 'When a seller accepts your request and you pay, it shows up here.' : 'When a buyer pays for one of your listings, it shows up here.'}
          />
        ) : (
          <div className="space-y-4">
            {items.map((tx) => {
              const product = tx.productId || {};
              return (
                <div key={tx._id} className="rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                      <img src={product.images?.[0] || DEFAULT_PRODUCT_IMAGE} alt={product.title} className="h-16 w-16 shrink-0 rounded-2xl object-cover border border-[#E8E8E8]" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-heading font-extrabold uppercase ${STATUS_BADGE[tx.transactionStatus]}`}>{tx.transactionStatus}</span>
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-heading font-extrabold uppercase ${STATUS_BADGE[tx.paymentStatus]}`}>Payment {tx.paymentStatus}</span>
                          <span className="text-[11px] text-[#62666F]">{formatDate(tx.createdAt)}</span>
                        </div>
                        <h3 className="mt-1 font-heading font-bold text-[#111111] truncate">{product.title || 'Listing'}</h3>
                        <p className="text-xs text-[#62666F]">
                          {role === 'buyer' ? `Seller: ${tx.sellerId?.name}` : `Buyer: ${tx.buyerId?.name}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <dl className="text-right text-xs">
                        <div><dt className="sr-only">Amount</dt><dd className="font-heading text-lg font-black text-[#111111]">{inr(tx.amount)}</dd></div>
                        <div className="text-[#62666F]">
                          {tx.commissionRate}% commission {inr(tx.commissionAmount)}
                          {role === 'seller' && <> &bull; you get <strong className="text-emerald-700">{inr(tx.sellerAmount)}</strong></>}
                        </div>
                      </dl>
                      <div className="flex flex-col gap-1.5">
                        <Link to={`/transactions/${tx._id}`}>
                          <Button size="sm" variant="white" className="text-xs uppercase w-full">
                            {tx.transactionStatus === 'PENDING' && role === 'buyer' ? 'Pay' : 'Details'}
                          </Button>
                        </Link>
                        {tx.transactionStatus === 'PENDING' && (
                          <Button size="sm" variant="ghost" icon={Ban} isLoading={cancellingId === tx._id} onClick={() => cancel(tx)} className="text-xs uppercase text-red-600">
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  {rowError[tx._id] && <ErrorMessage variant="inline" message={rowError[tx._id]} className="mt-3" />}
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
    </div>
  );
}
