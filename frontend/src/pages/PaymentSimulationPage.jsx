import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Store,
  MapPin,
  Clock,
  Sparkles,
  Receipt,
  ArrowRight,
  Info,
  QrCode,
  Smartphone,
  Wallet,
} from 'lucide-react';
import {
  getInterestById,
  getProductById,
  getConversationById,
  formatINR,
} from '../services/storage';
import { getProductImageUrl, DEFAULT_PRODUCT_IMAGE } from '../utils/imageUrl';
import { transactionApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';

export default function PaymentSimulationPage() {
  const { interestId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [checkoutData, setCheckoutData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Simulation form state
  const [paymentMethod, setPaymentMethod] = useState('UPI (Google Pay / PhonePe)');
  const [upiId, setUpiId] = useState('asharma@oksbi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedTxn, setCompletedTxn] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setIsLoading(true);

    // Case 1: Chat-originated checkout
    if (interestId?.startsWith('chat-')) {
      const convId = interestId.replace('chat-', '');
      const conv = getConversationById(convId);
      const queryAmount = searchParams.get('amount');
      const prod = conv ? getProductById(conv.productId) : null;

      if (conv) {
        setCheckoutData({
          type: 'chat',
          conversationId: conv.id,
          interestId: null,
          productId: conv.productId,
          productTitle: conv.productTitle,
          productImage: conv.productImage,
          productLocation: conv.productLocation || prod?.location || 'TIET Campus',
          sellerId: conv.sellerId,
          sellerName: conv.sellerName,
          sellerEmail: conv.sellerEmail,
          amount: parseFloat(queryAmount) || conv.agreedPrice || conv.productPrice || 0,
        });
      }
    } 
    // Case 2: Interest-inbox checkout
    else if (interestId?.startsWith('int-')) {
      const item = getInterestById(interestId);
      if (item) {
        const prod = getProductById(item.productId);
        setCheckoutData({
          type: 'interest',
          conversationId: null,
          interestId: item.id,
          productId: item.productId,
          productTitle: item.productTitle,
          productImage: item.productImage,
          productLocation: prod?.location || 'TIET Campus',
          sellerId: item.sellerId,
          sellerName: item.sellerName,
          sellerEmail: item.sellerEmail,
          amount: item.productPrice || 0,
        });
      }
    } 
    // Case 3: Direct productId and amount in query
    else {
      const prodId = searchParams.get('productId') || interestId;
      const prod = getProductById(prodId);
      if (prod) {
        const queryAmount = searchParams.get('amount');
        setCheckoutData({
          type: 'direct',
          conversationId: null,
          interestId: null,
          productId: prod.id,
          productTitle: prod.title,
          productImage: prod.image,
          productLocation: prod.location || 'TIET Campus',
          sellerId: prod.seller?.id,
          sellerName: prod.seller?.name,
          sellerEmail: prod.seller?.email,
          amount: parseFloat(queryAmount) || prod.price || 0,
        });
      }
    }

    setIsLoading(false);
  }, [interestId, searchParams]);

  const handleSimulatePayment = async (e) => {
    e.preventDefault();
    if (isProcessing || completedTxn || !checkoutData) return;

    setIsProcessing(true);
    setErrorMessage('');

    setTimeout(async () => {
      try {
        const txn = await transactionApi.createTransaction({
          productId: checkoutData.productId,
          productTitle: checkoutData.productTitle,
          productImage: checkoutData.productImage,
          buyerId: user?.id || 'user-1',
          buyerName: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || 'Aarav Sharma',
          buyerEmail: user?.email || 'asharma_be23@thapar.edu',
          sellerId: checkoutData.sellerId,
          sellerName: checkoutData.sellerName,
          sellerEmail: checkoutData.sellerEmail,
          amount: checkoutData.amount,
          paymentMethod: paymentMethod === 'UPI (Google Pay / PhonePe)' ? `UPI (${upiId})` : paymentMethod,
          interestId: checkoutData.interestId,
          conversationId: checkoutData.conversationId,
        });

        setCompletedTxn(txn);
      } catch (err) {
        setErrorMessage(err.message || 'Payment simulation encountered an issue.');
      } finally {
        setIsProcessing(false);
      }
    }, 1200);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" label="Preparing TIET secure checkout..." />
      </div>
    );
  }

  if (!checkoutData) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
          <h2 className="mt-4 text-2xl font-heading font-black text-slate-800">Checkout Session Not Found</h2>
          <p className="mt-2 text-xs text-slate-500">
            The item or negotiation record for this checkout does not exist or has already been fulfilled.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/interests">
              <Button variant="primary">Go to Interest Inbox</Button>
            </Link>
            <Link to="/marketplace">
              <Button variant="outline">Marketplace</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const price = checkoutData.amount;
  const commissionRate = 5;
  const commissionAmount = Math.round(price * 0.05 * 100) / 100;
  const sellerPayout = Math.round((price - commissionAmount) * 100) / 100;

  // View: Completed Transaction Receipt Screen
  if (completedTxn) {
    return (
      <div className="min-h-screen bg-[#F5F5F2] pb-24 pt-10 font-sans">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 sm:p-10 shadow-2xl space-y-6 text-center">
            
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[#B7FF00] text-[#111111] shadow-sticker-sm">
              <CheckCircle2 className="h-9 w-9 stroke-[2.4]" />
            </div>

            <div>
              <span className="inline-block rounded-full bg-[#0638C9]/10 px-3.5 py-1 text-xs font-heading font-extrabold uppercase tracking-wider text-[#0638C9]">
                Payment Successful
              </span>
              <h1 className="mt-3 text-2xl font-heading font-black text-[#111111] sm:text-3xl">
                Transaction Completed!
              </h1>
              <p className="mt-1 text-xs text-[#62666F] max-w-sm mx-auto">
                Product status is now reactively marked as <strong className="text-[#111111]">SOLD</strong> across TIET CampusKart.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="rounded-3xl border border-[#E8E8E8] bg-[#F5F5F2] p-6 text-left text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#E8E8E8] pb-3">
                <span className="text-[#62666F] font-heading font-bold uppercase tracking-wider text-[11px]">Transaction ID</span>
                <span className="font-mono font-bold text-[#111111]">{completedTxn.id}</span>
              </div>

              <div className="flex items-center justify-between border-b border-[#E8E8E8] pb-3">
                <span className="text-[#62666F] font-heading font-bold uppercase tracking-wider text-[11px]">Item Purchased</span>
                <span className="font-heading font-bold text-[#111111] truncate max-w-[240px]">
                  {completedTxn.productTitle}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-[#E8E8E8] pb-3">
                <span className="text-[#62666F] font-heading font-bold uppercase tracking-wider text-[11px]">Amount Paid by Buyer</span>
                <span className="font-heading text-xl font-black text-[#0638C9]">{formatINR(completedTxn.amount)}</span>
              </div>

              {/* Commission breakdown */}
              <div className="flex items-center justify-between border-b border-[#E8E8E8] pb-3 text-[11px]">
                <span className="text-[#62666F] font-heading font-semibold">TIET Commission (5%)</span>
                <span className="font-mono font-bold text-amber-700">- {formatINR(completedTxn.commissionAmount)}</span>
              </div>

              <div className="flex items-center justify-between border-b border-[#E8E8E8] pb-3 text-[11px]">
                <span className="text-[#62666F] font-heading font-semibold">Net Seller Proceeds (95%)</span>
                <span className="font-mono font-bold text-emerald-700">{formatINR(completedTxn.sellerAmount)}</span>
              </div>

              <div className="flex items-center justify-between border-b border-[#E8E8E8] pb-3">
                <span className="text-[#62666F] font-heading font-bold uppercase tracking-wider text-[11px]">Payment Mode</span>
                <span className="font-semibold text-[#111111]">{completedTxn.paymentMethod}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#62666F] font-heading font-bold uppercase tracking-wider text-[11px]">Campus Meetup Location</span>
                <span className="text-[#111111] font-semibold">{checkoutData.productLocation}</span>
              </div>
            </div>

            {/* Note banner */}
            <div className="rounded-2xl border border-[#0638C9]/20 bg-[#0638C9]/5 p-4 text-[11px] text-[#0638C9] text-left flex items-start gap-2.5">
              <Info className="h-4 w-4 shrink-0 text-[#0638C9] mt-0.5" />
              <span>
                <strong>Verified Thapar Handshake:</strong> Both buyer and seller have confirmed this exchange. Meet at <strong>{checkoutData.productLocation}</strong> for in-person item inspection and collection.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link to="/transactions" className="w-full sm:w-auto">
                <Button variant="lime" size="md" icon={Receipt} className="w-full uppercase text-xs font-heading font-black">
                  View Transaction History
                </Button>
              </Link>
              <Link to="/marketplace" className="w-full sm:w-auto">
                <Button variant="white" size="md" className="w-full uppercase text-xs font-heading font-bold">
                  Back to Marketplace
                </Button>
              </Link>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // View: Simulated Payment Checkout Screen
  return (
    <div className="min-h-screen bg-[#F5F5F2] pb-24 pt-8 font-sans">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to={`/product/${checkoutData.productId}`}
            className="inline-flex items-center gap-2 rounded-full border border-[#E8E8E8] bg-white px-4 py-1.5 text-xs font-heading font-bold text-[#111111] hover:border-[#111111] transition shadow-sm uppercase tracking-wider"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Product</span>
          </Link>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-heading font-bold text-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>TIET Secure Escrow Simulation</span>
          </span>
        </div>

        {/* Demo Notice Banner */}
        <div className="rounded-3xl border border-blue-200 bg-blue-50/80 p-4 text-xs text-blue-900 flex items-start gap-3 shadow-sm">
          <Info className="h-5 w-5 text-[#0638C9] shrink-0 mt-0.5" />
          <div>
            <p className="font-heading font-black uppercase tracking-wider text-[11px] text-[#0638C9]">
              Thapar Institute Campus Escrow Simulation
            </p>
            <p className="mt-0.5 text-blue-800 leading-relaxed">
              This simulated checkout demonstrates real-time order processing, reactive product status updates, and transparent 5% platform commission reporting. No real debit occurs.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
            {errorMessage}
          </div>
        )}

        {/* 2-column Checkout Form */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          
          {/* Left Column: Payment Method Selection */}
          <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 sm:p-8 shadow-card space-y-6">
            <div>
              <h2 className="text-xl font-heading font-black text-[#111111]">Payment Method</h2>
              <p className="mt-1 text-xs text-[#62666F]">
                Select your preferred campus payment method to finalize the exchange.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  id: 'UPI (Google Pay / PhonePe)',
                  title: 'UPI (Google Pay / PhonePe / Paytm / BHIM)',
                  desc: 'Instant peer-to-peer UPI transfer with simulated VPA',
                  icon: Smartphone,
                },
                {
                  id: 'TIET Student Campus Card / Wallet',
                  title: 'Thapar Student Campus Card & Wallet',
                  desc: 'Prepaid campus student account balance',
                  icon: Wallet,
                },
                {
                  id: 'Cash on Campus Handshake',
                  title: 'Cash on Meetup Handshake',
                  desc: 'Pay cash in-person when meeting at the Thapar campus location',
                  icon: Store,
                },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-start gap-3.5 rounded-3xl border p-4 cursor-pointer transition ${
                    paymentMethod === opt.id
                      ? 'border-[#0638C9] bg-[#0638C9]/5 shadow-sm'
                      : 'border-[#E8E8E8] hover:border-[#111111] bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={opt.id}
                    checked={paymentMethod === opt.id}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mt-1 text-[#0638C9] focus:ring-[#0638C9]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <opt.icon className="h-4 w-4 text-[#0638C9]" />
                      <p className="text-xs font-heading font-bold text-[#111111]">{opt.title}</p>
                    </div>
                    <p className="text-[11px] text-[#62666F] mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* UPI ID input if UPI chosen */}
            {paymentMethod === 'UPI (Google Pay / PhonePe)' && (
              <div className="p-4 rounded-2xl bg-[#F5F5F2] border border-[#E8E8E8] space-y-2 animate-in fade-in">
                <label className="block text-[11px] font-heading font-bold uppercase tracking-wider text-[#62666F]">
                  Enter Simulated UPI ID / VPA
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. yourname@okhdfcbank"
                    className="flex-1 rounded-2xl border border-[#E8E8E8] bg-white px-3.5 py-2 text-xs font-semibold text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#0638C9]"
                  />
                  <span className="rounded-2xl bg-emerald-100 text-emerald-800 text-[10px] font-heading font-bold px-3 py-2 flex items-center">
                    Verified
                  </span>
                </div>
              </div>
            )}

            {/* Handshake meeting assurance */}
            <div className="rounded-2xl border border-[#E8E8E8] bg-[#F5F5F2] p-4 text-xs text-[#111111] space-y-1.5">
              <div className="flex items-center gap-2 font-heading font-bold uppercase tracking-wider text-[11px] text-[#0638C9]">
                <MapPin className="h-4 w-4 text-[#0638C9]" />
                <span>Designated Campus Meetup Location</span>
              </div>
              <p className="text-[11px] text-[#62666F]">
                {checkoutData.productLocation}
              </p>
            </div>

            <form onSubmit={handleSimulatePayment}>
              <Button
                type="submit"
                variant="lime"
                size="lg"
                isLoading={isProcessing}
                icon={CheckCircle2}
                className="w-full text-sm font-heading font-black uppercase tracking-wider shadow-sm"
              >
                Confirm Payment ({formatINR(price)})
              </Button>
            </form>
          </div>

          {/* Right Column: Order Summary & Commission Breakdown */}
          <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 sm:p-8 shadow-card space-y-6 h-fit">
            <h3 className="text-xs font-heading font-extrabold uppercase tracking-wider text-[#62666F]">
              Order & Commission Breakdown
            </h3>

            <div className="flex items-center gap-3.5 pb-4 border-b border-[#E8E8E8]">
              <img
                src={getProductImageUrl(checkoutData)}
                alt={checkoutData.productTitle}
                className="h-16 w-16 rounded-2xl object-cover border border-[#E8E8E8]"
                onError={(e) => {
                  if (e.currentTarget.src !== DEFAULT_PRODUCT_IMAGE) {
                    e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                  }
                }}
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-heading font-bold text-[#111111] truncate">
                  {checkoutData.productTitle}
                </h4>
                <p className="text-[11px] text-[#62666F] mt-0.5">Seller: {checkoutData.sellerName}</p>
                <p className="text-xs font-heading font-black text-[#0638C9] mt-1">{formatINR(price)}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-[#62666F]">
                <span>Agreed Sale Price</span>
                <span className="font-heading font-bold text-[#111111]">{formatINR(price)}</span>
              </div>

              <div className="flex items-center justify-between text-[#62666F] pb-2 border-b border-dashed border-[#E8E8E8]">
                <span>Platform Commission (5% deducted from seller)</span>
                <span className="font-heading font-bold text-amber-700">- {formatINR(commissionAmount)}</span>
              </div>

              <div className="flex items-center justify-between text-[#62666F]">
                <span>Net Seller Proceeds (95%)</span>
                <span className="font-heading font-bold text-emerald-700">{formatINR(sellerPayout)}</span>
              </div>

              <div className="flex items-center justify-between text-[#62666F]">
                <span>TIET Campus Pickup</span>
                <span className="font-heading font-bold text-[#111111]">Free On-Campus</span>
              </div>

              <div className="flex items-center justify-between border-t border-[#E8E8E8] pt-3 text-sm font-heading font-black text-[#111111]">
                <span>Total Due by Buyer</span>
                <span className="text-2xl text-[#0638C9] font-black">{formatINR(price)}</span>
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-[11px] text-emerald-800 flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                CampusKart 5% platform fee sustains verified Thapar student trust, moderation, and secure escrow tools.
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
