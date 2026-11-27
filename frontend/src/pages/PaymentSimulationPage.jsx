import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CreditCard, CheckCircle2, XCircle, ShieldCheck, ArrowLeft, Receipt, Ban, FlaskConical } from 'lucide-react';
import { transactionApi, getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { STATUS_BADGE, formatDateTime } from '../utils/constants';
import { DEFAULT_PRODUCT_IMAGE } from '../utils/imageUrl';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// Two routes use this page:
//   /payment/:interestId        buyer starts (or reopens) the purchase for an accepted interest
//   /transactions/:transactionId  anyone involved views a transaction (the buyer can still pay if PENDING)
export default function PaymentSimulationPage() {
  const { interestId, transactionId } = useParams();
  const { user } = useAuth();
  const [tx, setTx] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [result, setResult] = useState({ type: '', message: '' });

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      if (transactionId) {
        setTx((await transactionApi.getById(transactionId)).transaction);
      } else {
        try {
          // All money values (amount, rate, commission) are decided by the backend from the database
          setTx((await transactionApi.create(interestId)).transaction);
        } catch (err) {
          const existingId = err.response?.status === 409 && err.response.data?.transactionId;
          if (!existingId) throw err;
          setTx((await transactionApi.getById(existingId)).transaction);
        }
      }
    } catch (err) {
      setLoadError(getErrorMessage(err, 'Could not open this purchase'));
    } finally {
      setIsLoading(false);
    }
  }, [interestId, transactionId]);

  useEffect(() => {
    load();
  }, [load]);

  const pay = async (simulateFailure = false) => {
    setIsPaying(true);
    setResult({ type: '', message: '' });
    try {
      const data = await transactionApi.pay(tx._id, simulateFailure);
      setTx(data.transaction);
      setResult({ type: 'success', message: 'Payment successful. The item is now yours and marked SOLD.' });
    } catch (err) {
      // 402 = the (simulated) payment failed; the transaction stays PENDING so it can be retried
      if (err.response?.status === 402 && err.response.data?.transaction) setTx(err.response.data.transaction);
      setResult({ type: 'error', message: getErrorMessage(err, 'Payment failed') });
    } finally {
      setIsPaying(false);
    }
  };

  const cancel = async () => {
    setIsCancelling(true);
    setResult({ type: '', message: '' });
    try {
      setTx((await transactionApi.cancel(tx._id)).transaction);
      setResult({ type: 'info', message: 'Purchase cancelled. Nothing was charged.' });
    } catch (err) {
      setResult({ type: 'error', message: getErrorMessage(err) });
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" label="Preparing your purchase..." />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 space-y-4">
        <ErrorMessage title="Could not open this purchase" message={loadError} onRetry={load} />
        <Link to="/interests" className="inline-flex items-center gap-1 text-xs font-heading font-bold text-[#0638C9] hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Interest Inbox
        </Link>
      </div>
    );
  }

  const product = tx.productId || {};
  const isBuyer = String(tx.buyerId?._id) === String(user?.id);
  const isPending = tx.transactionStatus === 'PENDING';
  const isCompleted = tx.transactionStatus === 'COMPLETED';

  return (
    <div className="min-h-screen bg-[#F5F5F2] pb-24 pt-8">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-6">
        <Link to="/transactions" className="inline-flex items-center gap-2 rounded-full border border-[#E8E8E8] bg-white px-4 py-1.5 text-xs font-heading font-bold uppercase tracking-wider text-[#111111] hover:border-[#111111] transition shadow-sm">
          <ArrowLeft className="h-4 w-4" />
          <span>All transactions</span>
        </Link>

        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3.5 py-1 text-[11px] font-heading font-extrabold uppercase tracking-wider text-amber-800 mb-2">
            <FlaskConical className="h-3.5 w-3.5" />
            <span>Simulated payment: no real money moves</span>
          </div>
          <h1 className="text-3xl font-heading font-black text-[#111111] tracking-tight">
            {isCompleted ? 'Purchase complete' : isPending ? (isBuyer ? 'Complete your purchase' : 'Waiting for the buyer to pay') : 'Transaction'}
          </h1>
        </div>

        {result.message && (
          <div
            role="status"
            className={`flex items-center gap-2 rounded-3xl border p-4 text-sm font-semibold ${
              result.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : result.type === 'info'
                ? 'border-slate-200 bg-white text-slate-700'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {result.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : result.type === 'error' ? <XCircle className="h-5 w-5" /> : <Ban className="h-5 w-5" />}
            <span>{result.message}</span>
          </div>
        )}

        <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 sm:p-8 shadow-card space-y-6">
          <div className="flex items-center gap-4">
            <img src={product.images?.[0] || DEFAULT_PRODUCT_IMAGE} alt={product.title} className="h-20 w-20 rounded-2xl object-cover border border-[#E8E8E8]" />
            <div className="min-w-0">
              <Link to={`/product/${product._id}`} className="font-heading font-bold text-[#111111] hover:text-[#0638C9]">{product.title}</Link>
              <p className="text-xs text-[#62666F]">
                Seller: <strong>{tx.sellerId?.name}</strong> &bull; Buyer: <strong>{tx.buyerId?.name}</strong>
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-heading font-extrabold uppercase ${STATUS_BADGE[tx.transactionStatus]}`}>{tx.transactionStatus}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-heading font-extrabold uppercase ${STATUS_BADGE[tx.paymentStatus]}`}>Payment {tx.paymentStatus}</span>
              </div>
            </div>
          </div>

          {/* Every number below comes straight from the backend response */}
          <dl className="divide-y divide-[#E8E8E8] rounded-3xl border border-[#E8E8E8] text-sm">
            <div className="flex justify-between px-5 py-3">
              <dt className="text-[#62666F]">Amount {isBuyer ? 'you pay' : 'paid by buyer'}</dt>
              <dd className="font-heading font-black text-[#111111]">{inr(tx.amount)}</dd>
            </div>
            <div className="flex justify-between px-5 py-3">
              <dt className="text-[#62666F]">Platform commission ({tx.commissionRate}%)</dt>
              <dd className="font-semibold text-[#111111]">− {inr(tx.commissionAmount)}</dd>
            </div>
            <div className="flex justify-between px-5 py-3 bg-[#F5F5F2]">
              <dt className="font-heading font-bold text-[#111111]">Seller receives</dt>
              <dd className="font-heading font-black text-emerald-700">{inr(tx.sellerAmount)}</dd>
            </div>
          </dl>
          <p className="text-[11px] text-[#62666F]">
            The commission rate was fixed when this transaction was created. Commission only counts once the payment is completed.
          </p>

          {isCompleted && (
            <dl className="grid grid-cols-1 gap-2 rounded-3xl bg-emerald-50 p-5 text-xs text-emerald-900 sm:grid-cols-2">
              <div><dt className="font-heading font-bold">Payment reference</dt><dd className="font-mono">{tx.paymentRef}</dd></div>
              <div><dt className="font-heading font-bold">Completed</dt><dd>{formatDateTime(tx.completedAt)}</dd></div>
            </dl>
          )}

          {isPending && isBuyer && (
            <div className="space-y-3 border-t border-[#E8E8E8] pt-6">
              <Button size="lg" variant="lime" icon={CreditCard} isLoading={isPaying} onClick={() => pay(false)} className="w-full uppercase text-sm font-heading font-black">
                Pay {inr(tx.amount)}
              </Button>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={isPaying}
                  onClick={() => pay(true)}
                  className="text-xs font-heading font-bold text-amber-700 hover:underline disabled:opacity-50"
                >
                  Test only: simulate a failed payment
                </button>
                <Button size="sm" variant="ghost" icon={Ban} isLoading={isCancelling} onClick={cancel} className="text-xs uppercase text-red-600">
                  Cancel purchase
                </Button>
              </div>
            </div>
          )}

          {isPending && !isBuyer && (
            <div className="flex items-center justify-between gap-3 border-t border-[#E8E8E8] pt-6">
              <p className="text-xs text-[#62666F]">The buyer hasn't paid yet. You can cancel if the deal fell through.</p>
              <Button size="sm" variant="ghost" icon={Ban} isLoading={isCancelling} onClick={cancel} className="text-xs uppercase text-red-600">
                Cancel
              </Button>
            </div>
          )}

          {isCompleted && (
            <Link to="/transactions">
              <Button variant="primary" icon={Receipt} className="w-full uppercase text-xs">View transaction history</Button>
            </Link>
          )}
        </div>

        <p className="flex items-center justify-center gap-1.5 text-[11px] text-[#62666F]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#0638C9]" />
          The CampusKart server decides whether a payment succeeds; the browser can't mark a payment as paid.
        </p>
      </div>
    </div>
  );
}
