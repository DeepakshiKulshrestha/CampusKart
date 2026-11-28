import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Tag,
  Package,
  Heart,
  PlusCircle,
  ArrowRight,
  ShieldCheck,
  Bookmark,
  MessageSquare,
  UserRound,
  Inbox,
  Receipt,
  Send,
} from 'lucide-react';
import { getConversationsByUser } from '../services/storage';
import { productApi, interestApi, transactionApi, savedApi, getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { STATUS_BADGE, formatDate } from '../utils/constants';
import Button from '../components/Button';
import ProductCard from '../components/ProductCard';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

function StatCard({ label, value, hint, icon: Icon, tone = 'bg-[#0638C9]/10 text-[#0638C9]', to }) {
  const body = (
    <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card h-full transition hover:shadow-softblue">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-heading font-bold uppercase tracking-wider text-[#62666F]">{label}</span>
        <div className={`grid h-8 w-8 place-items-center rounded-2xl ${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="font-heading text-3xl sm:text-4xl font-black text-[#111111]">{value}</div>
      <p className="mt-1 text-[11px] text-[#62666F]">{hint}</p>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export default function StudentDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [myListings, setMyListings] = useState([]);
  const [recentTx, setRecentTx] = useState([]);
  const [savedProducts, setSavedProducts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      // All counts come from the backend; each call asks only for the totals it needs
      // /products/mine has no status filter, so active/sold are counted from (up to) the 50 newest listings
      const [mine, recentMine, received, sent, txs] = await Promise.all([
        productApi.getMyProducts({ limit: 4 }),
        productApi.getMyProducts({ limit: 50 }).then((d) => d.items),
        interestApi.list({ role: 'seller', status: 'PENDING', limit: 1 }),
        interestApi.list({ role: 'buyer', limit: 1 }),
        transactionApi.list({ limit: 5 }),
      ]);
      setMyListings(mine.items);
      setRecentTx(txs.items);
      setStats({
        listings: mine.pagination.total,
        active: recentMine.filter((p) => p.status === 'AVAILABLE').length,
        sold: recentMine.filter((p) => p.status === 'SOLD').length,
        pendingReceived: received.pagination.total,
        sent: sent.pagination.total,
        transactions: txs.pagination.total,
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load your dashboard'));
    } finally {
      setIsLoading(false);
    }

    // Saved items live in this browser; fetch up to 4 of them (removed listings are skipped)
    const ids = savedApi.getIds().slice(-4).reverse();
    const results = await Promise.allSettled(ids.map((id) => productApi.getProductById(id)));
    setSavedProducts(results.filter((r) => r.status === 'fulfilled').map((r) => r.value.product));

    if (user) setConversations(getConversationsByUser(user.id, user.email));
  }, [user]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const firstName = user?.name?.split(' ')[0] || 'Student';

  return (
    <div className="min-h-screen bg-[#F5F5F2] pb-24 pt-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="relative overflow-hidden rounded-4xl bg-[#0638C9] p-6 sm:p-10 text-white shadow-xl bg-grid-white">
          <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#B7FF00] px-3.5 py-1 text-xs font-heading font-extrabold uppercase tracking-wider text-[#111111] shadow-sticker-sm">
                <ShieldCheck className="h-4 w-4 text-[#111111]" />
                <span>Student Account</span>
              </div>
              <h1 className="font-display uppercase text-2xl sm:text-4xl font-black tracking-tight text-white">
                Welcome back, {firstName}!
              </h1>
              <p className="text-xs text-blue-100 sm:text-sm max-w-xl">Manage your listings, answer buyers and track your purchases.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link to="/interests">
                <Button variant="white" size="sm" icon={Inbox} className="uppercase text-xs">Interest Inbox</Button>
              </Link>
              <Link to="/transactions">
                <Button variant="outline" size="sm" icon={Receipt} className="border-white/30 text-white hover:bg-white/10 bg-transparent uppercase text-xs">
                  Transactions
                </Button>
              </Link>
              <Button variant="lime" size="sm" icon={PlusCircle} onClick={() => navigate('/create-listing')} className="uppercase text-xs">
                Create Listing
              </Button>
            </div>
          </div>
        </div>

        {error && <ErrorMessage title="Could not load your dashboard" message={error} onRetry={loadDashboardData} />}

        {isLoading ? (
          <LoadingSpinner size="lg" label="Loading your dashboard..." className="py-16" />
        ) : (
          stats && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <StatCard label="Active listings" value={stats.active} hint={`${stats.listings} listings in total`} icon={Tag} to="/my-listings" />
              <StatCard label="Items sold" value={stats.sold} hint="Marked sold or paid" icon={Package} tone="bg-emerald-50 text-emerald-600" to="/my-listings" />
              <StatCard label="Requests waiting" value={stats.pendingReceived} hint="Buyers waiting for your answer" icon={Inbox} tone="bg-amber-50 text-amber-600" to="/interests" />
              <StatCard label="Requests sent" value={stats.sent} hint="Items you asked about" icon={Send} tone="bg-purple-50 text-purple-600" to="/interests" />
              <StatCard label="Transactions" value={stats.transactions} hint="As buyer or seller" icon={Receipt} tone="bg-slate-100 text-slate-700" to="/transactions" />
            </div>
          )
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-8">
            <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 sm:p-8 shadow-card">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-heading font-black text-[#111111]">My Listings</h2>
                  <p className="text-xs text-[#62666F]">Your most recent items</p>
                </div>
                <Link to="/my-listings" className="inline-flex items-center gap-1 text-xs font-heading font-bold text-[#0638C9] hover:underline uppercase tracking-wider">
                  <span>Manage All</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {myListings.length > 0 ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {myListings.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              ) : (
                !isLoading && (
                  <EmptyState
                    title="No listings yet"
                    description="Have extra books, gadgets or furniture? Post them in a minute."
                    actionLabel="Post Your First Item"
                    onAction={() => navigate('/create-listing')}
                  />
                )
              )}
            </div>

            <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 sm:p-8 shadow-card">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-heading font-black text-[#111111]">Saved Items</h2>
                  <p className="text-xs text-[#62666F]">Saved on this device</p>
                </div>
                <Link to="/marketplace" className="inline-flex items-center gap-1 text-xs font-heading font-bold text-[#0638C9] hover:underline uppercase tracking-wider">
                  <span>Explore More</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {savedProducts.length > 0 ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {savedProducts.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[#62666F]">
                  <Bookmark className="mx-auto h-8 w-8 text-[#62666F]/40 mb-2" />
                  <p>You haven't saved any items yet. Tap the heart on any product card.</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card">
              <h3 className="text-xs font-heading font-extrabold uppercase tracking-wider text-[#62666F] mb-4">Profile</h3>
              <div className="flex items-center gap-3.5">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#0638C9] text-lg font-heading font-bold text-white">
                  {firstName[0]}
                </span>
                <div className="min-w-0">
                  <h4 className="text-base font-heading font-bold text-[#111111] truncate">{user?.name}</h4>
                  <p className="text-xs text-[#62666F] truncate">{user?.email}</p>
                </div>
              </div>
              <div className="mt-5 border-t border-[#E8E8E8] pt-4">
                <Link
                  to="/profile"
                  className="flex items-center justify-between rounded-full bg-[#F5F5F2] px-4 py-2.5 text-xs font-heading font-bold text-[#111111] hover:bg-[#E8E8E8] transition"
                >
                  <span className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-[#62666F]" />
                    <span>View & Edit Profile</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#62666F]" />
                </Link>
              </div>
            </div>

            <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xs font-heading font-extrabold uppercase tracking-wider text-[#62666F]">Recent Transactions</h3>
                <Link to="/transactions" className="text-[11px] font-heading font-bold text-[#0638C9] hover:underline">See all</Link>
              </div>
              {recentTx.length === 0 ? (
                <p className="text-xs text-[#62666F]">No transactions yet.</p>
              ) : (
                <ul className="space-y-3">
                  {recentTx.map((tx) => {
                    const iAmBuyer = String(tx.buyerId?._id) === String(user?.id);
                    return (
                      <li key={tx._id} className="flex items-start justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <p className="font-heading font-bold text-[#111111] truncate">{tx.productId?.title || 'Listing'}</p>
                          <p className="text-[#62666F]">
                            {iAmBuyer ? 'Bought' : 'Sold'} &bull; {formatDate(tx.createdAt)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-heading font-black text-[#111111]">{inr(iAmBuyer ? tx.amount : tx.sellerAmount)}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-heading font-bold ${STATUS_BADGE[tx.transactionStatus]}`}>
                            {tx.transactionStatus}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {conversations.length > 0 && (
              <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-[#0638C9]" />
                  <h3 className="text-xs font-heading font-extrabold uppercase tracking-wider text-[#62666F]">Chats (demo)</h3>
                </div>
                <p className="mt-2 text-[11px] text-[#62666F]">
                  {conversations.length} conversation{conversations.length === 1 ? '' : 's'}, stored on this device only.
                </p>
                <Link to="/chat" className="mt-3 inline-flex items-center gap-1 text-xs font-heading font-bold text-[#0638C9] hover:underline">
                  Open chat <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            <div className="rounded-4xl border border-dashed border-[#E8E8E8] bg-white/60 p-5 text-center text-[11px] text-[#62666F]">
              <Heart className="mx-auto mb-1 h-4 w-4 text-red-400" />
              Saved items and demo chats are kept in this browser, not in your account.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
