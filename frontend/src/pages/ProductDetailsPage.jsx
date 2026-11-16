import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Heart,
  Share2,
  ShieldCheck,
  MapPin,
  Clock,
  MessageSquare,
  CheckCircle2,
  Mail,
  GraduationCap,
  Sparkles,
  AlertCircle,
  Eye,
  Check,
  Send,
  CreditCard,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  getProductById,
  getStoredProducts,
  isItemSaved,
  toggleSavedItem,
  getOrCreateConversation,
  formatINR,
} from '../services/storage';
import { interestApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getProductImageUrl, getProductImages, DEFAULT_PRODUCT_IMAGE } from '../utils/imageUrl';
import Button from '../components/Button';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import ProductCard from '../components/ProductCard';
import ErrorMessage from '../components/ErrorMessage';

export default function ProductDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Interest State
  const [existingInterest, setExistingInterest] = useState(null);
  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
  const [interestMessage, setInterestMessage] = useState('Hi! I am interested in this item. Can we meet near Hostel J / Central Library / COS at TIET?');
  const [isSubmittingInterest, setIsSubmittingInterest] = useState(false);
  const [interestFeedback, setInterestFeedback] = useState({ type: '', message: '' });

  const [copiedLink, setCopiedLink] = useState(false);

  const handleStartChat = () => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    if (isOwner || isSold) return;
    try {
      const conv = getOrCreateConversation({
        productId: product.id,
        buyer: user,
        seller: product.seller,
      });
      navigate(`/chat/${conv.id}`);
    } catch (err) {
      setErrorMessage(err.message || 'Could not start conversation');
    }
  };

  // Load product and existing interest
  const loadProductData = () => {
    const item = getProductById(id);
    if (item) {
      setProduct(item);
      setIsSaved(isItemSaved(item.id));

      if (user) {
        const found = interestApi.checkExisting(item.id, user.id, user.email);
        setExistingInterest(found);
      }

      const all = getStoredProducts();
      const related = all
        .filter((p) => p.category === item.category && String(p.id) !== String(item.id))
        .slice(0, 3);
      setRelatedProducts(related);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadProductData();
    setIsLoading(false);

    // Reactive listener for product or interest updates
    const handleReactiveUpdate = () => {
      loadProductData();
    };
    window.addEventListener('campuskart_product_updated', handleReactiveUpdate);
    window.addEventListener('campuskart_interest_updated', handleReactiveUpdate);
    window.addEventListener('campuskart_transaction_updated', handleReactiveUpdate);
    window.addEventListener('storage', handleReactiveUpdate);

    return () => {
      window.removeEventListener('campuskart_product_updated', handleReactiveUpdate);
      window.removeEventListener('campuskart_interest_updated', handleReactiveUpdate);
      window.removeEventListener('campuskart_transaction_updated', handleReactiveUpdate);
      window.removeEventListener('storage', handleReactiveUpdate);
    };
  }, [id, user]);

  const handleToggleSave = () => {
    if (!product) return;
    const nextSaved = toggleSavedItem(product.id);
    setIsSaved(nextSaved);
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Express Interest Trigger
  const handleExpressInterestClick = () => {
    if (!isAuthenticated) {
      // Redirect unauthenticated users to login while preserving intended route
      navigate('/login', { state: { from: location } });
      return;
    }

    if (isOwner) return;
    if (isSold) return;

    setIsInterestModalOpen(true);
    setInterestFeedback({ type: '', message: '' });
  };

  // Submit Interest
  const handleConfirmInterest = async (e) => {
    e.preventDefault();
    if (!product || !user) return;

    setIsSubmittingInterest(true);
    setInterestFeedback({ type: '', message: '' });

    try {
      const result = await interestApi.createInterest({
        productId: product.id,
        buyer: user,
        seller: product.seller,
        message: interestMessage,
      });

      setExistingInterest(result);
      setInterestFeedback({
        type: 'success',
        message: result.isExisting
          ? 'You have already submitted interest for this listing.'
          : 'Interest expressed successfully! The seller has been notified.',
      });

      setTimeout(() => {
        setIsInterestModalOpen(false);
      }, 1500);
    } catch (err) {
      setInterestFeedback({
        type: 'error',
        message: err.message || 'Could not send interest request.',
      });
    } finally {
      setIsSubmittingInterest(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" label="Loading product details..." />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12">
          <AlertCircle className="mx-auto h-12 w-12 text-slate-400" />
          <h2 className="mt-4 text-2xl font-bold text-slate-800">Product Not Found</h2>
          <p className="mt-2 text-sm text-slate-500">
            The listing you are looking for does not exist or may have been deleted.
          </p>
          <div className="mt-6">
            <Button variant="primary" onClick={() => navigate('/marketplace')}>
              Back to Marketplace
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isSold = product.status?.toUpperCase() === 'SOLD';
  const isAvailable = !isSold;
  const isOwner =
    user &&
    (String(user.id) === String(product.seller?.id) ||
      (user.email && product.seller?.email?.toLowerCase() === user.email.toLowerCase()));

  const images = getProductImages(product);
  const activeImage = images[activeImageIndex] || images[0] || DEFAULT_PRODUCT_IMAGE;

  return (
    <div className="min-h-screen bg-[#F5F5F2] pb-24 pt-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-2 rounded-full border border-[#E8E8E8] bg-white px-4 py-1.5 text-xs font-heading font-bold uppercase tracking-wider text-[#111111] hover:border-[#111111] transition shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Marketplace</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E8E8] bg-white px-3.5 py-1.5 text-xs font-heading font-bold text-[#111111] hover:border-[#111111] transition shadow-sm"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5 text-[#0638C9]" />}
              <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleSave}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-heading font-bold transition shadow-sm ${
                isSaved
                  ? 'border-red-200 bg-red-50 text-red-600'
                  : 'border-[#E8E8E8] bg-white text-[#111111] hover:border-[#111111]'
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${isSaved ? 'fill-red-500 text-red-500' : 'text-[#62666F]'}`} />
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>
          </div>
        </div>

        {/* Product Details Grid */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Images Column */}
          <div className="space-y-5">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-4xl border border-[#E8E8E8] bg-white shadow-card">
              <img
                src={activeImage}
                alt={product.title}
                className={`h-full w-full object-cover transition-all ${
                  isSold ? 'grayscale opacity-75' : ''
                }`}
                onError={(e) => {
                  if (e.currentTarget.src !== DEFAULT_PRODUCT_IMAGE) {
                    e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                  }
                }}
              />

              {/* Status Badge Overlay */}
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                {isSold ? (
                  <span className="rounded-full bg-[#111111] px-3.5 py-1 text-xs font-heading font-extrabold uppercase tracking-wider text-white shadow-md">
                    SOLD
                  </span>
                ) : (
                  <span className="rounded-full bg-[#B7FF00] px-3.5 py-1 text-xs font-heading font-extrabold uppercase tracking-wider text-[#111111] shadow-md">
                    AVAILABLE
                  </span>
                )}
                <span className="rounded-full border border-white/40 bg-white/95 px-3 py-1 text-xs font-heading font-bold uppercase tracking-wider text-[#111111] shadow-md backdrop-blur-md">
                  {product.condition}
                </span>
              </div>

              {isSold && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#111111]/40 backdrop-blur-xs">
                  <span className="rounded-full bg-[#111111] px-7 py-3 text-sm font-heading font-extrabold uppercase tracking-widest text-white shadow-2xl border border-white/20">
                    Item Sold Out
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnail selector */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`h-20 w-24 shrink-0 overflow-hidden rounded-2xl border-2 transition ${
                      activeImageIndex === idx
                        ? 'border-[#0638C9] ring-2 ring-[#0638C9]/20'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        if (e.currentTarget.src !== DEFAULT_PRODUCT_IMAGE) {
                          e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                        }
                      }}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Safety Tips Card */}
            <div className="rounded-3xl border border-[#0638C9]/15 bg-white p-5 text-[#111111] shadow-card">
              <div className="flex items-center gap-2 text-xs font-heading font-extrabold uppercase tracking-wider text-[#0638C9]">
                <ShieldCheck className="h-4 w-4 text-[#0638C9]" />
                <span>Campus Safety & Verification</span>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-[#62666F]">
                <li>&bull; Express interest to connect directly with the student seller.</li>
                <li>&bull; Arrange to meet in public campus zones like libraries or dining halls.</li>
                <li>&bull; Inspect items before completing the transaction.</li>
              </ul>
            </div>
          </div>

          {/* Product Info & Action Column */}
          <div className="space-y-6">
            <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 sm:p-8 shadow-card space-y-6">
              {/* Category, Date & Status */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#0638C9]/10 px-3 py-1 font-heading font-bold text-[#0638C9] uppercase tracking-wider">
                    {product.categoryName || 'General'}
                  </span>
                  {/* Reactive Status Badge */}
                  <span
                    className={`rounded-full px-3 py-1 font-heading font-extrabold uppercase tracking-wider text-[11px] ${
                      isSold
                        ? 'bg-[#111111] text-white'
                        : 'bg-[#B7FF00] text-[#111111]'
                    }`}
                  >
                    {isSold ? 'SOLD' : 'AVAILABLE'}
                  </span>
                </div>

                <span className="flex items-center gap-1 text-[#62666F] text-xs font-medium">
                  <Clock className="h-3.5 w-3.5 text-[#0638C9]" />
                  <span>Posted recently</span>
                </span>
              </div>

              {/* Title & Price */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-heading font-black text-[#111111] leading-tight">
                  {product.title}
                </h1>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-heading text-4xl font-black text-[#0638C9] tracking-tight">
                    ₹{typeof product.price === 'number' ? product.price.toLocaleString('en-IN') : product.price}
                  </span>
                  <span className="text-xs font-heading font-bold text-[#62666F] uppercase tracking-wider">INR</span>
                </div>
              </div>

              {/* Pickup Location */}
              {product.location && (
                <div className="flex items-center gap-2 rounded-2xl bg-[#F5F5F2] px-4 py-3 text-xs text-[#111111]">
                  <MapPin className="h-4 w-4 text-[#0638C9] shrink-0" />
                  <span className="font-heading font-bold uppercase tracking-wider text-[11px]">TIET Campus Pickup:</span>
                  <span>{product.location}</span>
                </div>
              )}

              {/* Main Action Area: Express Interest & Payment Flow */}
              <div className="flex flex-col gap-3 pt-2">
                {isSold ? (
                  <div className="rounded-3xl border border-[#E8E8E8] bg-[#F5F5F2] p-4 text-center">
                    <p className="text-sm font-heading font-bold text-[#111111]">This item has been marked as SOLD.</p>
                    <p className="text-xs text-[#62666F] mt-1">
                      No further interest requests or chat offers can be submitted for this product.
                    </p>
                  </div>
                ) : isOwner ? (
                  <div className="rounded-3xl border border-[#0638C9]/20 bg-[#0638C9]/5 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-heading font-bold text-[#0638C9]">This is your listing</p>
                      <p className="text-[11px] text-[#62666F]">Check incoming interest and chat negotiations in your inbox.</p>
                    </div>
                    <Link to="/interests">
                      <Button size="sm" variant="lime" className="uppercase text-xs font-heading font-black">
                        View Inbox
                      </Button>
                    </Link>
                  </div>
                ) : existingInterest ? (
                  <div className="rounded-3xl border border-[#0638C9]/20 bg-[#0638C9]/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-[#0638C9]" />
                        <div>
                          <p className="text-xs font-heading font-bold text-[#111111]">Interest Request Submitted</p>
                          <p className="text-[11px] text-[#62666F]">
                            Status:{' '}
                            <span
                              className={`font-heading font-extrabold uppercase ${
                                existingInterest.status === 'ACCEPTED'
                                  ? 'text-emerald-600'
                                  : existingInterest.status === 'REJECTED'
                                  ? 'text-red-600'
                                  : 'text-amber-600'
                              }`}
                            >
                              {existingInterest.status}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="white"
                          icon={MessageSquare}
                          onClick={handleStartChat}
                          className="uppercase text-xs"
                        >
                          Chat
                        </Button>
                        {existingInterest.status === 'ACCEPTED' && (
                          <Link to={`/payment/${existingInterest.id}`}>
                            <Button size="sm" variant="lime" icon={CreditCard} className="uppercase text-xs font-heading font-black">
                              Proceed to Payment
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Button
                      size="lg"
                      variant="lime"
                      icon={MessageSquare}
                      onClick={handleStartChat}
                      className="w-full text-xs uppercase tracking-wider shadow-sm font-heading font-black"
                    >
                      Chat & Negotiate
                    </Button>
                    <Button
                      size="lg"
                      variant="primary"
                      icon={Send}
                      onClick={handleExpressInterestClick}
                      className="w-full text-xs uppercase tracking-wider shadow-sm font-heading font-black"
                    >
                      Express Interest
                    </Button>
                  </div>
                )}

                <Button
                  size="md"
                  variant="white"
                  icon={Heart}
                  onClick={handleToggleSave}
                  className={`w-full uppercase text-xs ${isSaved ? 'text-red-600 border-red-200' : ''}`}
                >
                  {isSaved ? 'Saved in Wishlist' : 'Add to Wishlist'}
                </Button>
              </div>

              {/* Description */}
              <div className="border-t border-slate-100 pt-6">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Description
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 whitespace-pre-line">
                  {product.description || 'No additional description provided by the seller.'}
                </p>
              </div>
            </div>

            {/* Seller Information Card */}
            <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card">
              <h3 className="text-xs font-heading font-extrabold uppercase tracking-wider text-[#62666F] mb-4">
                Seller Information
              </h3>

              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {product.seller?.avatarUrl ? (
                    <img
                      src={product.seller.avatarUrl}
                      alt={product.seller.name}
                      className="h-14 w-14 rounded-2xl object-cover ring-2 ring-[#E8E8E8]"
                    />
                  ) : (
                    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#0638C9]/10 text-lg font-heading font-bold text-[#0638C9]">
                      {product.seller?.avatar || 'S'}
                    </span>
                  )}

                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-base font-heading font-bold text-[#111111]">
                        {product.seller?.name || 'Verified Student'}
                      </h4>
                      {product.seller?.verified && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" title="Verified Student" />
                      )}
                    </div>
                    <p className="text-xs text-[#62666F] mt-0.5">
                      {product.seller?.college || 'University Student'}
                    </p>
                    <p className="text-[11px] text-[#62666F]/70 mt-0.5">
                      Member since {product.seller?.joinedYear || '2023'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-flex items-center gap-1 rounded-full bg-[#B7FF00] px-3 py-1 text-xs font-heading font-extrabold text-[#111111]">
                    <Sparkles className="h-3 w-3 fill-[#111111] text-[#111111]" />
                    <span>{product.seller?.rating || '4.9'}</span>
                  </div>
                  <p className="mt-1 text-[10px] text-[#62666F] font-heading font-bold">
                    {product.seller?.reviewsCount || 12} transactions
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#E8E8E8] pt-4 text-xs text-[#62666F]">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#0638C9]" />
                  <span className="truncate">{product.seller?.email || 'student@university.edu'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-[#0638C9]" />
                  <span>Verified Campus ID</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-16 border-t border-[#E8E8E8] pt-12">
            <h2 className="text-2xl font-heading font-black text-[#111111] mb-6">
              More From This Category
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Express Interest Modal */}
      <Modal
        isOpen={isInterestModalOpen}
        onClose={() => setIsInterestModalOpen(false)}
        title="Express Interest in Listing"
        size="md"
      >
        <form onSubmit={handleConfirmInterest} className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 border border-slate-200">
            <img
              src={getProductImageUrl(product)}
              alt={product.title}
              className="h-14 w-14 rounded-xl object-cover"
              onError={(e) => {
                if (e.currentTarget.src !== DEFAULT_PRODUCT_IMAGE) {
                  e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                }
              }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">{product.title}</p>
              <p className="text-xs font-extrabold text-[#0638C9]">₹{typeof product.price === 'number' ? product.price.toLocaleString('en-IN') : product.price}</p>
              <p className="text-[11px] text-slate-500">Seller: {product.seller?.name}</p>
            </div>
          </div>

          {interestFeedback.message && (
            <div
              className={`rounded-xl p-3 text-xs font-semibold ${
                interestFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {interestFeedback.message}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Message to Seller (Optional, max 500 characters)
            </label>
            <textarea
              rows={4}
              maxLength={500}
              value={interestMessage}
              onChange={(e) => setInterestMessage(e.target.value)}
              placeholder="e.g. When are you available to meet near the library? Can I inspect the item first?"
              className="w-full rounded-xl border border-slate-300 p-3.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 text-right mt-1">
              {interestMessage.length} / 500
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsInterestModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmittingInterest}
              icon={Send}
            >
              Send Express Interest
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
