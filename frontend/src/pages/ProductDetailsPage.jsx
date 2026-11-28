import { useState, useEffect, useCallback } from 'react';
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
  AlertCircle,
  Check,
  Send,
  CreditCard,
  Flag,
  Tag,
  Hourglass,
} from 'lucide-react';
import { getOrCreateConversation } from '../services/storage';
import { productApi, interestApi, reportApi, savedApi, getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getProductImageUrl, getProductImages, DEFAULT_PRODUCT_IMAGE } from '../utils/imageUrl';
import { REPORT_REASONS, STATUS_BADGE, formatAge, formatDate } from '../utils/constants';
import Button from '../components/Button';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import ProductCard from '../components/ProductCard';
import ErrorMessage from '../components/ErrorMessage';
import PriceFairnessLabel from '../components/PriceFairnessLabel';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function ProductDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isAdmin } = useAuth();

  const [product, setProduct] = useState(null);
  const [loadError, setLoadError] = useState({ status: 0, message: '' });
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // Interest
  const [existingInterest, setExistingInterest] = useState(null);
  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
  const [interestMessage, setInterestMessage] = useState('Hi! I am interested in this item. When can we meet on campus?');
  const [isSubmittingInterest, setIsSubmittingInterest] = useState(false);
  const [interestFeedback, setInterestFeedback] = useState({ type: '', message: '' });

  // Report
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [reportFeedback, setReportFeedback] = useState({ type: '', message: '' });

  const loadProduct = useCallback(async () => {
    setIsLoading(true);
    setLoadError({ status: 0, message: '' });
    try {
      const { product: item } = await productApi.getProductById(id);
      setProduct(item);
      setActiveImageIndex(0);
      setIsSaved(savedApi.isSaved(item.id));

      // Related listings and "did I already ask?" are nice-to-haves: their errors don't block the page
      productApi
        .getProducts({ category: item.category, limit: 4 })
        .then((data) => setRelatedProducts(data.items.filter((p) => p.id !== item.id).slice(0, 3)))
        .catch(() => setRelatedProducts([]));
    } catch (err) {
      setProduct(null);
      setLoadError({ status: err.response?.status || 0, message: getErrorMessage(err, 'Could not load this listing') });
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const loadMyInterest = useCallback(async () => {
    if (!isAuthenticated) return setExistingInterest(null);
    try {
      const data = await interestApi.list({ role: 'buyer', productId: id, limit: 1 });
      setExistingInterest(data.items[0] || null);
    } catch {
      setExistingInterest(null);
    }
  }, [id, isAuthenticated]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  useEffect(() => {
    loadMyInterest();
  }, [loadMyInterest]);

  const handleToggleSave = () => {
    if (!product) return;
    setIsSaved(savedApi.toggle(product.id));
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const requireLogin = () => {
    if (isAuthenticated) return false;
    navigate('/login', { state: { from: location } });
    return true;
  };

  // Chat is a local demo (stored on this device only)
  const handleStartChat = () => {
    if (requireLogin() || isOwner || !isAvailable) return;
    const conv = getOrCreateConversation({ productId: product.id, buyer: user, seller: product.seller });
    navigate(`/chat/${conv.id}`);
  };

  const handleExpressInterestClick = () => {
    if (requireLogin() || isOwner || !isAvailable) return;
    setInterestFeedback({ type: '', message: '' });
    setIsInterestModalOpen(true);
  };

  const handleConfirmInterest = async (e) => {
    e.preventDefault();
    setIsSubmittingInterest(true);
    setInterestFeedback({ type: '', message: '' });
    try {
      const { interest } = await interestApi.create(product.id, interestMessage.trim());
      setExistingInterest(interest);
      setInterestFeedback({ type: 'success', message: 'Interest sent! The seller will accept or reject it from their inbox.' });
      setTimeout(() => setIsInterestModalOpen(false), 1200);
    } catch (err) {
      setInterestFeedback({ type: 'error', message: getErrorMessage(err, 'Could not send your interest') });
      if (err.response?.status === 409) loadMyInterest(); // already sent: show its status
    } finally {
      setIsSubmittingInterest(false);
    }
  };

  const openReport = () => {
    if (requireLogin()) return;
    setReportFeedback({ type: '', message: '' });
    setIsReportOpen(true);
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setIsReporting(true);
    setReportFeedback({ type: '', message: '' });
    try {
      await reportApi.create({ productId: product.id, reason: reportReason, details: reportDetails.trim() || undefined });
      setReportFeedback({ type: 'success', message: 'Thanks. An admin will review this listing.' });
      setReportDetails('');
      setTimeout(() => setIsReportOpen(false), 1500);
    } catch (err) {
      setReportFeedback({ type: 'error', message: getErrorMessage(err, 'Could not send the report') });
    } finally {
      setIsReporting(false);
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
    const notFound = loadError.status === 404 || loadError.status === 400;
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        {notFound ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12">
            <AlertCircle className="mx-auto h-12 w-12 text-slate-400" />
            <h2 className="mt-4 text-2xl font-bold text-slate-800">Product Not Found</h2>
            <p className="mt-2 text-sm text-slate-500">This listing does not exist or has been removed.</p>
            <div className="mt-6">
              <Button variant="primary" onClick={() => navigate('/marketplace')}>Back to Marketplace</Button>
            </div>
          </div>
        ) : (
          <ErrorMessage title="Could not load this listing" message={loadError.message} onRetry={loadProduct} />
        )}
      </div>
    );
  }

  const status = (product.status || 'AVAILABLE').toUpperCase();
  const isAvailable = status === 'AVAILABLE';
  const isSold = status === 'SOLD';
  const isOwner = Boolean(user && String(user.id) === String(product.sellerId));
  const images = getProductImages(product);
  const activeImage = images[activeImageIndex] || images[0] || DEFAULT_PRODUCT_IMAGE;
  const interestStatus = existingInterest?.status;
  const canSendNewInterest = !existingInterest;

  return (
    <div className="min-h-screen bg-[#F5F5F2] pb-24 pt-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
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
                isSaved ? 'border-red-200 bg-red-50 text-red-600' : 'border-[#E8E8E8] bg-white text-[#111111] hover:border-[#111111]'
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${isSaved ? 'fill-red-500 text-red-500' : 'text-[#62666F]'}`} />
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Images */}
          <div className="space-y-5">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-4xl border border-[#E8E8E8] bg-white shadow-card">
              <img
                src={activeImage}
                alt={product.title}
                className={`h-full w-full object-cover transition-all ${isSold ? 'grayscale opacity-75' : ''}`}
                onError={(e) => {
                  if (e.currentTarget.src !== DEFAULT_PRODUCT_IMAGE) e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                }}
              />
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                <span className={`rounded-full px-3.5 py-1 text-xs font-heading font-extrabold uppercase tracking-wider shadow-md ${STATUS_BADGE[status]}`}>
                  {status}
                </span>
                <span className="rounded-full border border-white/40 bg-white/95 px-3 py-1 text-xs font-heading font-bold uppercase tracking-wider text-[#111111] shadow-md backdrop-blur-md">
                  {product.condition}
                </span>
              </div>
              {isSold && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#111111]/40">
                  <span className="rounded-full bg-[#111111] px-7 py-3 text-sm font-heading font-extrabold uppercase tracking-widest text-white shadow-2xl border border-white/20">
                    Sold
                  </span>
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={img}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`h-20 w-24 shrink-0 overflow-hidden rounded-2xl border-2 transition ${
                      activeImageIndex === idx ? 'border-[#0638C9] ring-2 ring-[#0638C9]/20' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="rounded-3xl border border-[#0638C9]/15 bg-white p-5 text-[#111111] shadow-card">
              <div className="flex items-center gap-2 text-xs font-heading font-extrabold uppercase tracking-wider text-[#0638C9]">
                <ShieldCheck className="h-4 w-4 text-[#0638C9]" />
                <span>Campus Safety</span>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-[#62666F]">
                <li>&bull; Express interest; once the seller accepts, you can pay through CampusKart.</li>
                <li>&bull; Meet in public campus places like the library or dining hall.</li>
                <li>&bull; Inspect the item before paying. Something looks wrong? Report the listing.</li>
              </ul>
            </div>
          </div>

          {/* Info + actions */}
          <div className="space-y-6">
            <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 sm:p-8 shadow-card space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#0638C9]/10 px-3 py-1 font-heading font-bold text-[#0638C9] uppercase tracking-wider">
                    {product.category}
                  </span>
                  <span className={`rounded-full px-3 py-1 font-heading font-extrabold uppercase tracking-wider text-[11px] ${STATUS_BADGE[status]}`}>
                    {status}
                  </span>
                </div>
                <span className="flex items-center gap-1 text-[#62666F] text-xs font-medium">
                  <Clock className="h-3.5 w-3.5 text-[#0638C9]" />
                  <span>Listed {formatDate(product.createdAt)}</span>
                </span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-heading font-black text-[#111111] leading-tight">{product.title}</h1>
                <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-heading text-4xl font-black text-[#0638C9] tracking-tight">{inr(product.price)}</span>
                  {product.originalPrice > 0 && (
                    <span className="text-sm text-[#62666F]">
                      Bought new for <span className="line-through">{inr(product.originalPrice)}</span>
                    </span>
                  )}
                </div>
                {isAvailable && (
                  <div className="mt-3">
                    <PriceFairnessLabel productId={product.id} />
                  </div>
                )}
              </div>

              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 rounded-2xl bg-[#F5F5F2] px-4 py-3">
                  <Tag className="h-4 w-4 text-[#0638C9] shrink-0" />
                  <dt className="sr-only">Brand</dt>
                  <dd className="font-semibold text-[#111111]">{product.brand || 'Generic'}</dd>
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-[#F5F5F2] px-4 py-3">
                  <Hourglass className="h-4 w-4 text-[#0638C9] shrink-0" />
                  <dt className="sr-only">Age</dt>
                  <dd className="font-semibold text-[#111111]">{formatAge(product.age)} old</dd>
                </div>
                <div className="col-span-2 flex items-center gap-2 rounded-2xl bg-[#F5F5F2] px-4 py-3">
                  <MapPin className="h-4 w-4 text-[#0638C9] shrink-0" />
                  <dt className="font-heading font-bold uppercase tracking-wider text-[11px]">Pickup:</dt>
                  <dd className="text-[#111111]">{product.location}</dd>
                </div>
              </dl>

              {/* Main action area */}
              <div className="flex flex-col gap-3 pt-2">
                {isOwner ? (
                  <div className="rounded-3xl border border-[#0638C9]/20 bg-[#0638C9]/5 p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-heading font-bold text-[#0638C9]">This is your listing</p>
                      <p className="text-[11px] text-[#62666F]">Buyer requests arrive in your interest inbox.</p>
                    </div>
                    <div className="flex gap-2">
                      <Link to="/my-listings"><Button size="sm" variant="white" className="uppercase text-xs">Manage</Button></Link>
                      <Link to="/interests"><Button size="sm" variant="lime" className="uppercase text-xs font-heading font-black">Inbox</Button></Link>
                    </div>
                  </div>
                ) : existingInterest ? (
                  <div className="rounded-3xl border border-[#0638C9]/20 bg-[#0638C9]/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-[#0638C9]" />
                        <div>
                          <p className="text-xs font-heading font-bold text-[#111111]">You sent an interest request</p>
                          <p className="text-[11px] text-[#62666F]">
                            Status:{' '}
                            <span className={`rounded-full px-2 py-0.5 font-heading font-extrabold uppercase ${STATUS_BADGE[interestStatus]}`}>
                              {interestStatus}
                            </span>
                          </p>
                        </div>
                      </div>
                      {interestStatus === 'ACCEPTED' && isAvailable && (
                        <Link to={`/payment/${existingInterest._id}`}>
                          <Button size="sm" variant="lime" icon={CreditCard} className="uppercase text-xs font-heading font-black">
                            Proceed to Payment
                          </Button>
                        </Link>
                      )}
                    </div>
                    {interestStatus === 'PENDING' && (
                      <p className="mt-2 text-[11px] text-[#62666F]">Waiting for the seller. You can cancel it from your interest inbox.</p>
                    )}
                  </div>
                ) : !isAvailable ? (
                  <div className="rounded-3xl border border-[#E8E8E8] bg-[#F5F5F2] p-4 text-center">
                    <p className="text-sm font-heading font-bold text-[#111111]">This item has been sold.</p>
                    <p className="text-xs text-[#62666F] mt-1">New interest requests are closed.</p>
                  </div>
                ) : isAdmin ? (
                  <p className="rounded-3xl bg-[#F5F5F2] p-4 text-center text-xs text-[#62666F]">Admins manage the marketplace and can't buy listings.</p>
                ) : (
                  canSendNewInterest && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <Button
                        size="lg"
                        variant="primary"
                        icon={Send}
                        onClick={handleExpressInterestClick}
                        className="w-full text-xs uppercase tracking-wider shadow-sm font-heading font-black"
                      >
                        I'm Interested
                      </Button>
                      <Button
                        size="lg"
                        variant="white"
                        icon={MessageSquare}
                        onClick={handleStartChat}
                        title="Demo chat, stored on this device only"
                        className="w-full text-xs uppercase tracking-wider shadow-sm font-heading font-black"
                      >
                        Chat (demo)
                      </Button>
                    </div>
                  )
                )}

                <div className="flex gap-2">
                  <Button
                    size="md"
                    variant="white"
                    icon={Heart}
                    onClick={handleToggleSave}
                    className={`flex-1 uppercase text-xs ${isSaved ? 'text-red-600 border-red-200' : ''}`}
                  >
                    {isSaved ? 'Saved' : 'Save for later'}
                  </Button>
                  {!isOwner && !isAdmin && (
                    <Button size="md" variant="ghost" icon={Flag} onClick={openReport} className="uppercase text-xs text-red-600">
                      Report listing
                    </Button>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Description</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 whitespace-pre-line">
                  {product.description || 'No additional description provided by the seller.'}
                </p>
              </div>
            </div>

            {/* Seller: only the name is public */}
            <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card">
              <h3 className="text-xs font-heading font-extrabold uppercase tracking-wider text-[#62666F] mb-4">Seller</h3>
              <div className="flex items-center gap-3.5">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#0638C9]/10 text-lg font-heading font-bold text-[#0638C9]">
                  {product.seller?.avatar || 'S'}
                </span>
                <div>
                  <h4 className="text-base font-heading font-bold text-[#111111]">{product.seller?.name}</h4>
                  <p className="text-xs text-[#62666F] mt-0.5">Contact details are shared after the seller accepts your interest.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <section className="mt-16 border-t border-[#E8E8E8] pt-12">
            <h2 className="text-2xl font-heading font-black text-[#111111] mb-6">More in {product.category}</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Express interest */}
      <Modal isOpen={isInterestModalOpen} onClose={() => setIsInterestModalOpen(false)} title="Send an interest request" size="md">
        <form onSubmit={handleConfirmInterest} className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 border border-slate-200">
            <img src={getProductImageUrl(product)} alt={product.title} className="h-14 w-14 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">{product.title}</p>
              <p className="text-xs font-extrabold text-[#0638C9]">{inr(product.price)}</p>
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
            <label htmlFor="interest-message" className="block text-xs font-semibold text-slate-700 mb-1">
              Message to the seller (optional, max 500 characters)
            </label>
            <textarea
              id="interest-message"
              rows={4}
              maxLength={500}
              value={interestMessage}
              onChange={(e) => setInterestMessage(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-3.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 text-right mt-1">{interestMessage.length} / 500</p>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsInterestModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmittingInterest} icon={Send}>Send request</Button>
          </div>
        </form>
      </Modal>

      {/* Report listing */}
      <Modal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} title="Report this listing" size="md">
        <form onSubmit={handleSubmitReport} className="space-y-4">
          {reportFeedback.message && (
            <div
              className={`rounded-xl p-3 text-xs font-semibold ${
                reportFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {reportFeedback.message}
            </div>
          )}
          <div>
            <label htmlFor="report-reason" className="block text-xs font-semibold text-slate-700 mb-1">Reason</label>
            <select
              id="report-reason"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="report-details" className="block text-xs font-semibold text-slate-700 mb-1">Details (optional)</label>
            <textarea
              id="report-details"
              rows={3}
              maxLength={1000}
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="What's wrong with this listing?"
              className="w-full rounded-xl border border-slate-300 p-3.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsReportOpen(false)}>Cancel</Button>
            <Button type="submit" variant="danger" size="sm" isLoading={isReporting} icon={Flag}>Send report</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
