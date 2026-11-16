import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Tag,
  Package,
  Heart,
  Eye,
  PlusCircle,
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Bookmark,
  MessageSquare,
  AlertCircle,
  UserRound,
  Inbox,
  Receipt,
} from 'lucide-react';
import {
  getCurrentUser,
  getStoredProducts,
  getSavedProducts,
  getActivities,
  getConversationsByUser,
  formatINR,
} from '../services/storage';
import { getProductImageUrl, DEFAULT_PRODUCT_IMAGE } from '../utils/imageUrl';
import Button from '../components/Button';
import ProductCard from '../components/ProductCard';
import EmptyState from '../components/EmptyState';

export default function StudentDashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getCurrentUser());
  const [myListings, setMyListings] = useState([]);
  const [savedProducts, setSavedProducts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [conversations, setConversations] = useState([]);

  const loadDashboardData = () => {
    const currentUser = getCurrentUser();
    setUser(currentUser);

    const allProducts = getStoredProducts();
    // User's own listings
    const userEmail = currentUser?.email?.toLowerCase();
    const mine = allProducts.filter(
      (p) =>
        p.seller?.id === currentUser?.id ||
        (userEmail && p.seller?.email?.toLowerCase() === userEmail)
    );
    setMyListings(mine);

    // Saved items
    const saved = getSavedProducts();
    setSavedProducts(saved);

    // Activities
    const acts = getActivities();
    setActivities(acts);

    // Conversations
    if (currentUser) {
      const convs = getConversationsByUser(currentUser.id, currentUser.email);
      setConversations(convs);
    }
  };

  useEffect(() => {
    loadDashboardData();

    const handleUpdate = () => loadDashboardData();
    window.addEventListener('campuskart_product_updated', handleUpdate);
    window.addEventListener('campuskart_transaction_updated', handleUpdate);
    window.addEventListener('campuskart_chat_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('campuskart_product_updated', handleUpdate);
      window.removeEventListener('campuskart_transaction_updated', handleUpdate);
      window.removeEventListener('campuskart_chat_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const totalViews = myListings.reduce((sum, item) => sum + (item.views || 0), 0);
  const activeCount = myListings.filter((i) => i.status !== 'Sold' && i.status?.toUpperCase() !== 'SOLD').length;
  const soldCount = myListings.filter((i) => i.status === 'Sold' || i.status?.toUpperCase() === 'SOLD').length;

  return (
    <div className="min-h-screen bg-[#F5F5F2] pb-24 pt-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Welcome Header */}
        <div className="relative overflow-hidden rounded-4xl bg-[#0638C9] p-6 sm:p-10 text-white shadow-xl bg-grid-white">
          <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#B7FF00] px-3.5 py-1 text-xs font-heading font-extrabold uppercase tracking-wider text-[#111111] shadow-sticker-sm">
                <ShieldCheck className="h-4 w-4 text-[#111111]" />
                <span>Verified Campus Student Account</span>
              </div>
              <h1 className="font-display uppercase text-2xl sm:text-4xl font-black tracking-tight text-white">
                Welcome back, {user?.firstName || 'Student'}!
              </h1>
              <p className="text-xs text-blue-100 sm:text-sm max-w-xl">
                {user?.college || 'Campus University'} &bull; Manage your campus listings, track buyer interest, and discover items nearby.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link to="/chat">
                <Button
                  variant="white"
                  size="sm"
                  icon={MessageSquare}
                  className="uppercase text-xs"
                >
                  Messages ({conversations.length})
                </Button>
              </Link>
              <Link to="/interests">
                <Button
                  variant="white"
                  size="sm"
                  icon={Inbox}
                  className="uppercase text-xs"
                >
                  Interest Inbox
                </Button>
              </Link>
              <Link to="/transactions">
                <Button
                  variant="outline"
                  size="sm"
                  icon={Receipt}
                  className="border-white/30 text-white hover:bg-white/10 bg-transparent uppercase text-xs"
                >
                  Transactions
                </Button>
              </Link>
              <Button
                variant="lime"
                size="sm"
                icon={PlusCircle}
                onClick={() => navigate('/create-listing')}
                className="uppercase text-xs"
              >
                Create Listing
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card">
            <div className="flex items-center justify-between text-[#62666F] mb-3">
              <span className="text-xs font-heading font-bold uppercase tracking-wider text-[#62666F]">
                Active Listings
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-2xl bg-[#0638C9]/10 text-[#0638C9]">
                <Tag className="h-4 w-4" />
              </div>
            </div>
            <div className="font-heading text-3xl sm:text-4xl font-black text-[#111111]">{activeCount}</div>
            <p className="mt-1 text-[11px] text-[#62666F]">Listed on marketplace</p>
          </div>

          <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card">
            <div className="flex items-center justify-between text-[#62666F] mb-3">
              <span className="text-xs font-heading font-bold uppercase tracking-wider text-[#62666F]">
                Total Views
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-2xl bg-purple-50 text-purple-600">
                <Eye className="h-4 w-4" />
              </div>
            </div>
            <div className="font-heading text-3xl sm:text-4xl font-black text-[#111111]">{totalViews}</div>
            <p className="mt-1 text-[11px] text-[#62666F]">Student impressions</p>
          </div>

          <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card">
            <div className="flex items-center justify-between text-[#62666F] mb-3">
              <span className="text-xs font-heading font-bold uppercase tracking-wider text-[#62666F]">
                Items Sold
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="font-heading text-3xl sm:text-4xl font-black text-[#111111]">{soldCount}</div>
            <p className="mt-1 text-[11px] text-[#62666F]">Completed handoffs</p>
          </div>

          <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card">
            <div className="flex items-center justify-between text-[#62666F] mb-3">
              <span className="text-xs font-heading font-bold uppercase tracking-wider text-[#62666F]">
                Saved Wishlist
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-2xl bg-red-50 text-red-600">
                <Heart className="h-4 w-4" />
              </div>
            </div>
            <div className="font-heading text-3xl sm:text-4xl font-black text-[#111111]">
              {savedProducts.length}
            </div>
            <p className="mt-1 text-[11px] text-[#62666F]">Bookmarked deals</p>
          </div>
        </div>

        {/* Dashboard 2-column Body */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          {/* Left Column: My Active Listings & Saved Items */}
          <div className="space-y-8">
            
            {/* Active Student Negotiations Widget */}
            {conversations.length > 0 && (
              <div className="rounded-4xl border border-[#0638C9]/20 bg-white p-6 sm:p-8 shadow-card">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-2xl bg-[#0638C9]/10 text-[#0638C9]">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-lg font-heading font-black text-[#111111]">
                        Active Negotiations & Offers
                      </h2>
                      <p className="text-xs text-[#62666F]">
                        Live Thapar student discussions & price counteroffers
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/chat"
                    className="inline-flex items-center gap-1 text-xs font-heading font-bold text-[#0638C9] hover:underline uppercase tracking-wider"
                  >
                    <span>Open Chat</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="divide-y divide-[#E8E8E8] border-t border-[#E8E8E8]">
                  {conversations.slice(0, 3).map((conv) => {
                    const isBuyer = String(conv.buyerId) === String(user?.id);
                    const partnerName = isBuyer ? conv.sellerName : conv.buyerName;

                    return (
                      <div
                        key={conv.id}
                        className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-[#F5F5F2] px-2 rounded-2xl transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={getProductImageUrl(conv)}
                            alt=""
                            className="h-12 w-12 rounded-xl object-cover border border-[#E8E8E8] shrink-0"
                            onError={(e) => {
                              if (e.currentTarget.src !== DEFAULT_PRODUCT_IMAGE) {
                                e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                              }
                            }}
                          />
                          <div className="min-w-0">
                            <p className="font-heading font-bold text-xs text-[#111111] truncate">
                              {conv.productTitle}
                            </p>
                            <p className="text-[11px] text-[#62666F] truncate mt-0.5">
                              Chat with <strong>{partnerName}</strong> &bull; {conv.productLocation}
                            </p>
                            {conv.agreedPrice && (
                              <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.2 text-[10px] font-heading font-bold text-emerald-700 mt-1">
                                Agreed: {formatINR(conv.agreedPrice)}
                              </span>
                            )}
                          </div>
                        </div>

                        <Link to={`/chat/${conv.id}`} className="shrink-0 w-full sm:w-auto">
                          <Button size="sm" variant="lime" className="text-xs uppercase w-full sm:w-auto font-heading font-black">
                            Resume Chat
                          </Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* My Current Listings */}
            <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 sm:p-8 shadow-card">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-heading font-black text-[#111111]">My Listings Snapshot</h2>
                  <p className="text-xs text-[#62666F]">Items you've posted on CampusKart</p>
                </div>
                <Link
                  to="/my-listings"
                  className="inline-flex items-center gap-1 text-xs font-heading font-bold text-[#0638C9] hover:underline uppercase tracking-wider"
                >
                  <span>Manage All</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {myListings.length > 0 ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {myListings.slice(0, 4).map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No active listings yet"
                  description="Have extra textbooks, dorm items, or gadgets? Post them in 60 seconds."
                  actionLabel="Post Your First Item"
                  onAction={() => navigate('/create-listing')}
                />
              )}
            </div>

            {/* Saved Wishlist Items */}
            <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 sm:p-8 shadow-card">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-heading font-black text-[#111111]">Saved Items</h2>
                  <p className="text-xs text-[#62666F]">Items you've bookmarked to check out</p>
                </div>
                <Link
                  to="/marketplace"
                  className="inline-flex items-center gap-1 text-xs font-heading font-bold text-[#0638C9] hover:underline uppercase tracking-wider"
                >
                  <span>Explore More</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {savedProducts.length > 0 ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {savedProducts.slice(0, 4).map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[#62666F]">
                  <Bookmark className="mx-auto h-8 w-8 text-[#62666F]/40 mb-2" />
                  <p>You haven't saved any items yet. Tap the heart on any product card!</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: User Profile Snapshot & Recent Activities */}
          <div className="space-y-6">
            {/* Student Profile Quick Card */}
            <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card">
              <h3 className="text-xs font-heading font-extrabold uppercase tracking-wider text-[#62666F] mb-4">
                Student Profile
              </h3>

              <div className="flex items-center gap-3.5">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.firstName}
                    className="h-14 w-14 rounded-2xl object-cover ring-2 ring-[#E8E8E8]"
                  />
                ) : (
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#0638C9] text-lg font-heading font-bold text-white">
                    {user?.firstName?.[0] || 'S'}
                  </span>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-base font-heading font-bold text-[#111111]">
                      {user?.firstName} {user?.lastName}
                    </h4>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p className="text-xs text-[#62666F]">{user?.email}</p>
                  <p className="text-[11px] text-[#0638C9] font-heading font-bold mt-0.5">
                    {user?.major || 'Student'} &bull; {user?.dorm || 'Campus Hall'}
                  </p>
                </div>
              </div>

              <div className="mt-5 border-t border-[#E8E8E8] pt-4">
                <Link
                  to="/profile"
                  className="flex items-center justify-between rounded-full bg-[#F5F5F2] px-4 py-2.5 text-xs font-heading font-bold text-[#111111] hover:bg-[#E8E8E8] transition"
                >
                  <span className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-[#62666F]" />
                    <span>View & Edit Full Profile</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#62666F]" />
                </Link>
              </div>
            </div>

            {/* Recent Activity Feed */}
            <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xs font-heading font-extrabold uppercase tracking-wider text-[#62666F]">
                  Recent Activity
                </h3>
                <span className="text-[11px] text-[#62666F]/70">Campus updates</span>
              </div>

              <div className="space-y-4">
                {activities.map((act) => (
                  <div key={act.id} className="flex items-start gap-3 text-xs">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-2xl bg-[#0638C9]/10 text-[#0638C9] mt-0.5">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-heading font-bold text-[#111111]">{act.title}</p>
                      <p className="text-[#62666F] truncate">{act.description}</p>
                      <p className="text-[10px] text-[#62666F]/70 mt-0.5">{act.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

