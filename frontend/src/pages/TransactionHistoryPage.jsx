import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Receipt,
  ShoppingBag,
  Tag,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  DollarSign,
  UserRound,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { transactionApi } from '../services/api';
import { formatINR } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { getProductImageUrl, DEFAULT_PRODUCT_IMAGE } from '../utils/imageUrl';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';

export default function TransactionHistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('buyer'); // 'buyer' | 'seller'
  const [buyerTxns, setBuyerTxns] = useState([]);
  const [sellerTxns, setSellerTxns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTransactions = async () => {
    if (!user) return;
    try {
      const [bList, sList] = await Promise.all([
        transactionApi.getBuyerTransactions(user.id, user.email),
        transactionApi.getSellerTransactions(user.id, user.email),
      ]);
      setBuyerTxns(bList || []);
      setSellerTxns(sList || []);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadTransactions();

    const handleUpdate = () => loadTransactions();
    window.addEventListener('campuskart_transaction_updated', handleUpdate);
    window.addEventListener('campuskart_product_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('campuskart_transaction_updated', handleUpdate);
      window.removeEventListener('campuskart_product_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [user]);

  const currentList = activeTab === 'buyer' ? buyerTxns : sellerTxns;

  // Analytics
  const totalSpent = buyerTxns.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const totalEarned = sellerTxns.reduce((sum, t) => sum + (parseFloat(t.sellerAmount || t.amount) || 0), 0);

  return (
    <div className="min-h-screen bg-[#F5F5F2] pb-24 pt-8 font-sans">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0638C9]/10 px-3.5 py-1 text-xs font-heading font-bold text-[#0638C9] uppercase tracking-wider mb-2">
              <Receipt className="h-3.5 w-3.5" />
              <span>Campus Ledger</span>
            </div>
            <h1 className="text-3xl font-heading font-black text-[#111111] sm:text-4xl tracking-tight">
              Transaction History
            </h1>
            <p className="mt-1 text-xs text-[#62666F] sm:text-sm">
              View your completed purchases and sales across the campus community.
            </p>
          </div>

          <Link to="/marketplace">
            <Button variant="white" size="sm" className="uppercase text-xs">
              Explore Marketplace
            </Button>
          </Link>
        </div>

        {/* Financial Metrics Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card">
            <div className="flex items-center justify-between text-[#62666F] mb-3">
              <span className="text-xs font-heading font-bold uppercase tracking-wider text-[#62666F]">
                Total Purchases
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-2xl bg-[#0638C9]/10 text-[#0638C9]">
                <ShoppingBag className="h-4 w-4" />
              </div>
            </div>
            <p className="font-heading text-3xl font-black text-[#111111]">{formatINR(totalSpent)}</p>
            <p className="text-[11px] text-[#62666F] mt-1">{buyerTxns.length} items acquired</p>
          </div>

          <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card">
            <div className="flex items-center justify-between text-[#62666F] mb-3">
              <span className="text-xs font-heading font-bold uppercase tracking-wider text-[#62666F]">
                Total Sales Earned
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
            <p className="font-heading text-3xl font-black text-emerald-700">{formatINR(totalEarned)}</p>
            <p className="text-[11px] text-[#62666F] mt-1">{sellerTxns.length} items sold</p>
          </div>

          <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card">
            <div className="flex items-center justify-between text-[#62666F] mb-3">
              <span className="text-xs font-heading font-bold uppercase tracking-wider text-[#62666F]">
                Completed Deals
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-2xl bg-purple-50 text-purple-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <p className="font-heading text-3xl font-black text-[#111111]">
              {buyerTxns.length + sellerTxns.length}
            </p>
            <p className="text-[11px] text-[#62666F] mt-1">Verified handoffs</p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('buyer')}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-heading font-bold uppercase tracking-wider transition-all ${activeTab === 'buyer'
              ? 'bg-[#0638C9] text-white shadow-sm'
              : 'bg-white text-[#62666F] border border-[#E8E8E8] hover:border-[#111111] hover:text-[#111111]'
              }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>My Purchases ({buyerTxns.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('seller')}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-heading font-bold uppercase tracking-wider transition-all ${activeTab === 'seller'
              ? 'bg-[#0638C9] text-white shadow-sm'
              : 'bg-white text-[#62666F] border border-[#E8E8E8] hover:border-[#111111] hover:text-[#111111]'
              }`}
          >
            <Tag className="h-4 w-4" />
            <span>My Sales ({sellerTxns.length})</span>
          </button>
        </div>

        {/* Transaction Content List */}
        {isLoading ? (
          <div className="py-20">
            <LoadingSpinner size="lg" label="Loading transactions..." />
          </div>
        ) : currentList.length > 0 ? (
          <div className="space-y-4">
            {currentList.map((txn) => {
              const otherPartyLabel = activeTab === 'buyer' ? 'Seller' : 'Buyer';
              const otherPartyName = activeTab === 'buyer' ? txn.sellerName : txn.buyerName;
              const otherPartyEmail = activeTab === 'buyer' ? txn.sellerEmail : txn.buyerEmail;

              return (
                <div
                  key={txn.id}
                  className="rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card transition hover:shadow-softblue"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left: Thumbnail & Details */}
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <Link
                        to={`/product/${txn.productId}`}
                        className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#F5F5F2] border border-[#E8E8E8]"
                      >
                        <img
                          src={getProductImageUrl(txn)}
                          alt={txn.productTitle}
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
                          {/* Product Status Badge */}
                          <span className="rounded-full bg-[#111111] px-3 py-0.5 text-[10px] font-heading font-extrabold uppercase tracking-wider text-white">
                            SOLD
                          </span>

                          {/* Transaction Status Badge */}
                          <span className="rounded-full bg-[#B7FF00] text-[#111111] px-3 py-0.5 text-[10px] font-heading font-extrabold uppercase tracking-wider">
                            {txn.transactionStatus || 'COMPLETED'}
                          </span>

                          <span className="text-[11px] text-[#62666F]">
                            {new Date(txn.completedAt || txn.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        <h3 className="text-base font-heading font-bold text-[#111111] truncate">
                          <Link to={`/product/${txn.productId}`} className="hover:text-[#0638C9]">
                            {txn.productTitle}
                          </Link>
                        </h3>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#62666F]">
                          <span>
                            {otherPartyLabel}: <strong className="text-[#111111] font-heading font-bold">{otherPartyName || 'Student'}</strong>
                            {otherPartyEmail && <span className="text-[11px] text-[#62666F] ml-1">({otherPartyEmail})</span>}
                          </span>
                          <span>&bull;</span>
                          <span>{txn.paymentMethod || 'Campus Wallet (Simulated)'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount & Actions */}
                    <div className="flex flex-row items-center justify-between sm:flex-col sm:items-end border-t border-[#E8E8E8] pt-3 sm:border-0 sm:pt-0">
                      <div>
                        <p className="text-xs text-[#62666F] text-right font-medium">
                          {activeTab === 'buyer' ? 'Amount Paid' : 'Net Seller Proceeds'}
                        </p>
                        <p className="font-heading text-2xl font-black text-[#111111] text-right">
                          {formatINR(activeTab === 'seller' && txn.sellerAmount ? txn.sellerAmount : txn.amount)}
                        </p>
                        {activeTab === 'seller' && txn.commissionAmount > 0 && (
                          <p className="text-[10px] text-[#62666F] text-right font-medium">
                            Includes 5% platform fee ({formatINR(txn.commissionAmount)})
                          </p>
                        )}
                      </div>

                      <div className="mt-2">
                        <Link to={`/product/${txn.productId}`}>
                          <Button size="sm" variant="white" icon={ExternalLink} className="text-xs uppercase">
                            View Listing
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title={activeTab === 'buyer' ? 'No Purchases Found' : 'No Sales Found'}
            description={
              activeTab === 'buyer'
                ? "You haven't purchased any campus items yet. Browse listings to find textbooks, electronics, and dorm gear."
                : "You haven't completed any sales yet. Post an item to start receiving student interest."
            }
            actionLabel={activeTab === 'buyer' ? 'Explore Marketplace' : 'Create a Listing'}
            onAction={() => navigate(activeTab === 'buyer' ? '/marketplace' : '/create-listing')}
          />
        )}
      </div>
    </div>
  );
}

