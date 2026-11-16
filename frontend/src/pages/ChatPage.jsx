import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  HandCoins,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building,
  MapPin,
  ChevronLeft,
  Tag,
  ShoppingBag,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getConversations,
  getConversationById,
  sendMessage,
  sendOffer,
  respondToOffer,
  getProductById,
  formatINR,
} from '../services/storage';
import { getProductImageUrl, DEFAULT_PRODUCT_IMAGE } from '../utils/imageUrl';
import Button from '../components/Button';

export default function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [inputText, setInputText] = useState('');
  const [offerInput, setOfferInput] = useState('');
  const [showOfferBox, setShowOfferBox] = useState(false);
  const [counterForOfferId, setCounterForOfferId] = useState(null);
  const [notice, setNotice] = useState(null);
  const messagesEndRef = useRef(null);

  // Load conversations
  const loadConversations = () => {
    const all = getConversations();
    // Filter for current user
    const userConvs = all.filter(
      (c) =>
        String(c.buyerId) === String(user?.id) ||
        String(c.sellerId) === String(user?.id) ||
        (user?.email &&
          (c.buyerEmail?.toLowerCase() === user.email.toLowerCase() ||
            c.sellerEmail?.toLowerCase() === user.email.toLowerCase()))
    );

    setConversations(userConvs);

    if (conversationId) {
      const target = all.find((c) => String(c.id) === String(conversationId));
      if (target) {
        setActiveConv(target);
      } else if (userConvs.length > 0) {
        setActiveConv(userConvs[0]);
      }
    } else if (userConvs.length > 0 && !activeConv) {
      setActiveConv(userConvs[0]);
    }
  };

  useEffect(() => {
    loadConversations();

    const handleUpdate = () => {
      loadConversations();
    };

    window.addEventListener('campuskart_chat_updated', handleUpdate);
    window.addEventListener('campuskart_product_updated', handleUpdate);
    return () => {
      window.removeEventListener('campuskart_chat_updated', handleUpdate);
      window.removeEventListener('campuskart_product_updated', handleUpdate);
    };
  }, [conversationId, user]);

  // Keep activeConv synced with updated storage
  useEffect(() => {
    if (activeConv) {
      const refreshed = getConversationById(activeConv.id);
      if (refreshed) {
        setActiveConv(refreshed);
      }
    }
  }, [conversations]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages]);

  const showToast = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  // Determine other participant
  const isBuyer = String(activeConv?.buyerId) === String(user?.id) ||
    (user?.email && activeConv?.buyerEmail?.toLowerCase() === user.email?.toLowerCase());

  const otherPersonName = isBuyer ? activeConv?.sellerName : activeConv?.buyerName;
  const otherPersonEmail = isBuyer ? activeConv?.sellerEmail : activeConv?.buyerEmail;
  const otherPersonAvatar = isBuyer ? activeConv?.sellerAvatar : activeConv?.buyerAvatar;

  // Real-time product status check
  const liveProduct = activeConv?.productId ? getProductById(activeConv.productId) : null;
  const isProductSold = liveProduct?.status?.toUpperCase() === 'SOLD';

  // Sending a regular message
  const handleSendText = (e) => {
    e?.preventDefault();
    if (!inputText.trim() || !activeConv || !user) return;

    try {
      sendMessage({
        conversationId: activeConv.id,
        senderId: user.id || 'user-1',
        senderName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || 'TIET Student',
        text: inputText.trim(),
        type: 'TEXT',
      });
      setInputText('');
    } catch (err) {
      showToast(err.message);
    }
  };

  // Sending an offer
  const handleSendOffer = (e) => {
    e?.preventDefault();
    const amount = parseFloat(offerInput);
    if (!amount || amount <= 0) {
      showToast('Please enter a valid INR amount.');
      return;
    }

    try {
      sendOffer({
        conversationId: activeConv.id,
        offeredBy: user.id || 'user-1',
        offeredByName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || 'TIET Student',
        amount,
        isCounter: !!counterForOfferId,
      });
      setOfferInput('');
      setShowOfferBox(false);
      setCounterForOfferId(null);
      showToast(`Offer of ₹${amount.toLocaleString('en-IN')} proposed!`);
    } catch (err) {
      showToast(err.message);
    }
  };

  // Accepting or Declining an offer
  const handleOfferResponse = (offerId, response) => {
    try {
      respondToOffer({
        conversationId: activeConv.id,
        offerId,
        response,
        responderId: user.id || 'user-1',
        responderName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || 'TIET Student',
      });
      showToast(response === 'ACCEPT' ? 'Deal accepted!' : 'Offer declined.');
    } catch (err) {
      showToast(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F2] py-6 sm:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#0638C9]/10 px-3 py-1 text-xs font-heading font-extrabold text-[#0638C9] uppercase tracking-wider mb-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>TIET Verified Campus Chat</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
              STUDENT MESSAGES & PRICE NEGOTIATION
            </h1>
            <p className="mt-1 text-xs text-[#62666F]">
              Directly negotiate deals, finalize campus meetup spots at TIET, and pay securely with 5% transparent commission.
            </p>
          </div>

          <Link to="/marketplace">
            <Button variant="outline" size="sm" icon={ShoppingBag}>
              Explore Marketplace
            </Button>
          </Link>
        </div>

        {/* Notice toast */}
        {notice && (
          <div className="mb-4 rounded-2xl bg-[#0638C9] p-3 text-center text-xs font-heading font-bold text-white shadow-md animate-in fade-in">
            {notice}
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white rounded-4xl border border-[#E8E8E8] shadow-card overflow-hidden min-h-[640px]">
          
          {/* Left Column: Conversations List */}
          <aside className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[#E8E8E8] flex flex-col bg-white">
            <div className="p-4 border-b border-[#E8E8E8] bg-[#FBFBFA]">
              <div className="flex items-center justify-between">
                <span className="font-heading font-extrabold text-xs uppercase tracking-wider text-[#111111]">
                  Active Chats ({conversations.length})
                </span>
                <span className="rounded-full bg-[#B7FF00] px-2 py-0.5 text-[10px] font-heading font-black text-[#111111]">
                  LIVE
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#E8E8E8]">
              {conversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#62666F]">
                  <MessageSquare className="h-8 w-8 text-[#0638C9]/30 mx-auto mb-2" />
                  <p className="font-heading font-bold text-[#111111]">No active chats yet</p>
                  <p className="mt-1">Browse items in the marketplace and click "Chat & Negotiate" to begin.</p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const isCurrent = activeConv?.id === conv.id;
                  const convIsBuyer = String(conv.buyerId) === String(user?.id);
                  const partnerName = convIsBuyer ? conv.sellerName : conv.buyerName;
                  const partnerAvatar = convIsBuyer ? conv.sellerAvatar : conv.buyerAvatar;

                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => {
                        setActiveConv(conv);
                        navigate(`/chat/${conv.id}`);
                      }}
                      className={`w-full text-left p-4 transition-all flex items-start gap-3 hover:bg-[#F5F5F2] ${
                        isCurrent ? 'bg-[#0638C9]/5 border-l-4 border-[#0638C9]' : ''
                      }`}
                    >
                      {partnerAvatar ? (
                        <img
                          src={partnerAvatar}
                          alt={partnerName}
                          className="h-10 w-10 rounded-full object-cover shrink-0 ring-1 ring-[#E8E8E8]"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-[#0638C9] text-white font-heading font-bold text-xs grid place-items-center shrink-0">
                          {partnerName?.[0] || 'T'}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-1">
                          <p className="font-heading font-bold text-xs text-[#111111] truncate">
                            {partnerName}
                          </p>
                          <span className="text-[10px] text-[#62666F] shrink-0">
                            {new Date(conv.lastMessageAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <p className="font-heading font-semibold text-[11px] text-[#0638C9] truncate mt-0.5">
                          {conv.productTitle}
                        </p>

                        <p className="text-[11px] text-[#62666F] truncate mt-1">
                          {conv.lastMessageText || 'Chat started'}
                        </p>

                        {conv.agreedPrice && (
                          <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-heading font-bold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Agreed: {formatINR(conv.agreedPrice)}</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Right Column: Chat Thread & Negotiations */}
          <main className="lg:col-span-8 flex flex-col bg-white">
            {activeConv ? (
              <>
                {/* Chat Top Banner / Partner & Item Ribbon */}
                <div className="border-b border-[#E8E8E8] bg-[#FBFBFA] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    
                    {/* User info */}
                    <div className="flex items-center gap-3">
                      {otherPersonAvatar ? (
                        <img
                          src={otherPersonAvatar}
                          alt={otherPersonName}
                          className="h-11 w-11 rounded-full object-cover ring-2 ring-[#0638C9]/20"
                        />
                      ) : (
                        <div className="h-11 w-11 rounded-full bg-[#0638C9] text-white font-heading font-bold text-sm grid place-items-center">
                          {otherPersonName?.[0] || 'T'}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-heading font-black text-sm text-[#111111]">
                            {otherPersonName}
                          </h2>
                          <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-heading font-bold px-2 py-0.2">
                            TIET Student
                          </span>
                        </div>
                        <p className="text-[11px] text-[#62666F] flex items-center gap-1.5 mt-0.5">
                          <Building className="h-3 w-3 text-[#0638C9]" />
                          <span>{otherPersonEmail}</span>
                        </p>
                      </div>
                    </div>

                    {/* Product Quick Glance */}
                    <div className="flex items-center gap-3 bg-white border border-[#E8E8E8] rounded-2xl p-2 pr-3">
                      <img
                        src={getProductImageUrl(activeConv)}
                        alt={activeConv.productTitle}
                        className="h-10 w-10 rounded-xl object-cover"
                        onError={(e) => {
                          if (e.currentTarget.src !== DEFAULT_PRODUCT_IMAGE) {
                            e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                          }
                        }}
                      />
                      <div className="text-right">
                        <p className="font-heading font-bold text-xs text-[#111111] max-w-[160px] truncate">
                          {activeConv.productTitle}
                        </p>
                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                          <span className="font-heading font-extrabold text-xs text-[#0638C9]">
                            {formatINR(activeConv.productPrice)}
                          </span>
                          {isProductSold ? (
                            <span className="rounded-full bg-slate-900 px-1.5 py-0.2 text-[9px] font-heading font-bold text-white">
                              SOLD
                            </span>
                          ) : (
                            <span className="rounded-full bg-[#B7FF00] px-1.5 py-0.2 text-[9px] font-heading font-bold text-[#111111]">
                              AVAILABLE
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Agreed Price Action Ribbon */}
                  {activeConv.agreedPrice && (
                    <div className="mt-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-[#B7FF00]/20 to-emerald-500/10 border border-emerald-300 p-3 flex flex-wrap items-center justify-between gap-2 animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-heading font-bold text-xs text-emerald-950">
                            Deal agreed at {formatINR(activeConv.agreedPrice)}!
                          </p>
                          <p className="text-[11px] text-emerald-800">
                            5% TIET platform commission ({formatINR(activeConv.agreedPrice * 0.05)}) automatically managed.
                          </p>
                        </div>
                      </div>

                      {isBuyer && !isProductSold && (
                        <Link
                          to={`/payment/chat-${activeConv.id}?amount=${activeConv.agreedPrice}&productId=${activeConv.productId}&sellerId=${activeConv.sellerId}`}
                        >
                          <Button variant="lime" size="sm" icon={ArrowRight} className="font-heading font-black text-xs">
                            Checkout at {formatINR(activeConv.agreedPrice)}
                          </Button>
                        </Link>
                      )}

                      {isProductSold && (
                        <span className="rounded-full bg-slate-900 text-white px-3 py-1 text-xs font-heading font-bold">
                          Item Completed & Paid
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-h-[480px]">
                  {activeConv.messages?.map((msg) => {
                    const isSelf = String(msg.senderId) === String(user?.id);
                    const isSystem = msg.type === 'SYSTEM';

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="text-center my-3">
                          <span className="inline-block rounded-full bg-[#F5F5F2] border border-[#E8E8E8] px-3.5 py-1 text-[11px] font-medium text-[#62666F]">
                            {msg.text}
                          </span>
                        </div>
                      );
                    }

                    // Render Offer Card
                    if (msg.offer) {
                      const offer = msg.offer;
                      const isMyOffer = String(offer.offeredBy) === String(user?.id);
                      const isPending = offer.status === 'PENDING';

                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-md w-full rounded-3xl p-4 border shadow-sm ${
                              isSelf
                                ? 'bg-[#0638C9] text-white border-[#0638C9]'
                                : 'bg-[#FBFBFA] text-[#111111] border-[#E8E8E8]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 border-b pb-2 mb-3 border-current/15">
                              <div className="flex items-center gap-1.5">
                                <HandCoins className="h-4 w-4" />
                                <span className="font-heading font-extrabold text-xs uppercase tracking-wider">
                                  {msg.type === 'COUNTER_OFFER' ? 'Counteroffer' : 'Price Offer'}
                                </span>
                              </div>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-heading font-black uppercase ${
                                  offer.status === 'ACCEPTED'
                                    ? 'bg-[#B7FF00] text-[#111111]'
                                    : offer.status === 'REJECTED'
                                    ? 'bg-red-500 text-white'
                                    : 'bg-white/20 text-current'
                                }`}
                              >
                                {offer.status}
                              </span>
                            </div>

                            <p className="text-xs font-medium mb-2">{msg.text}</p>

                            <div className="my-2 p-3 rounded-2xl bg-white/10 border border-current/10 flex items-baseline justify-between">
                              <span className="text-[11px] font-heading uppercase tracking-wider opacity-80">
                                Proposed Price:
                              </span>
                              <span className="font-heading text-2xl font-black">
                                {formatINR(offer.amount)}
                              </span>
                            </div>

                            {/* Offer recipient controls */}
                            {!isMyOffer && isPending && (
                              <div className="mt-3 pt-2 border-t border-current/15 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOfferResponse(offer.offerId, 'ACCEPT')}
                                  className="flex-1 rounded-full bg-[#B7FF00] text-[#111111] py-2 px-3 text-xs font-heading font-extrabold uppercase hover:brightness-105 transition"
                                >
                                  Accept Offer
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCounterForOfferId(offer.offerId);
                                    setShowOfferBox(true);
                                    setOfferInput(String(offer.amount));
                                  }}
                                  className="rounded-full bg-white/20 text-current py-2 px-3 text-xs font-heading font-bold uppercase hover:bg-white/30 transition"
                                >
                                  Counter
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOfferResponse(offer.offerId, 'REJECT')}
                                  className="rounded-full bg-red-500/20 text-current py-2 px-3 text-xs font-heading font-bold uppercase hover:bg-red-500/30 transition"
                                >
                                  Decline
                                </button>
                              </div>
                            )}

                            <div className="mt-2 text-right">
                              <span className="text-[10px] opacity-70">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Regular Text Message
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-md rounded-3xl px-4 py-3 text-xs shadow-sm ${
                            isSelf
                              ? 'bg-[#0638C9] text-white rounded-br-sm'
                              : 'bg-[#F5F5F2] text-[#111111] rounded-bl-sm border border-[#E8E8E8]'
                          }`}
                        >
                          <p className="font-heading font-bold text-[10px] opacity-75 mb-0.5">
                            {msg.senderName}
                          </p>
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                          <p className={`mt-1 text-[10px] text-right ${isSelf ? 'text-white/70' : 'text-[#62666F]'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Offer Input Drawer */}
                {showOfferBox && (
                  <div className="p-4 bg-amber-50/90 border-t border-amber-200 animate-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-heading font-extrabold text-amber-900 uppercase">
                        {counterForOfferId ? 'Make a Counteroffer' : 'Make a Price Offer (in INR ₹)'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowOfferBox(false)}
                        className="text-amber-700 hover:text-amber-900 text-xs font-bold"
                      >
                        Cancel
                      </button>
                    </div>
                    <form onSubmit={handleSendOffer} className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-heading font-black text-amber-900 text-sm">
                          ₹
                        </span>
                        <input
                          type="number"
                          placeholder="e.g. 750"
                          value={offerInput}
                          onChange={(e) => setOfferInput(e.target.value)}
                          className="w-full rounded-2xl border border-amber-300 bg-white pl-8 pr-3 py-2 text-xs font-heading font-bold text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#0638C9]"
                        />
                      </div>
                      <Button variant="primary" size="sm" type="submit" icon={HandCoins}>
                        Send Offer
                      </Button>
                    </form>
                  </div>
                )}

                {/* Bottom Input Area */}
                <div className="p-4 border-t border-[#E8E8E8] bg-[#FBFBFA]">
                  <form onSubmit={handleSendText} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowOfferBox((prev) => !prev)}
                      className="shrink-0 flex items-center gap-1.5 rounded-full border border-[#0638C9] bg-white px-3.5 py-2.5 text-xs font-heading font-bold text-[#0638C9] hover:bg-[#0638C9] hover:text-white transition"
                    >
                      <HandCoins className="h-4 w-4" />
                      <span className="hidden sm:inline">Make Offer</span>
                    </button>

                    <input
                      type="text"
                      placeholder="Type a message (e.g. Can we meet near Hostel J at 5 PM?)..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="flex-1 rounded-full border border-[#E8E8E8] bg-white px-4 py-2.5 text-xs text-[#111111] placeholder:text-[#62666F]/60 focus:outline-none focus:ring-2 focus:ring-[#0638C9]"
                    />

                    <button
                      type="submit"
                      disabled={!inputText.trim()}
                      className="grid h-10 w-10 place-items-center rounded-full bg-[#0638C9] text-white disabled:opacity-40 hover:scale-105 transition shadow-sm"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </div>

              </>
            ) : (
              <div className="flex-1 grid place-items-center p-12 text-center text-[#62666F]">
                <div>
                  <MessageSquare className="h-12 w-12 text-[#0638C9]/30 mx-auto mb-3" />
                  <h3 className="font-heading font-bold text-sm text-[#111111]">
                    Select a conversation to start chatting
                  </h3>
                  <p className="mt-1 text-xs max-w-sm mx-auto">
                    Choose from your student negotiation threads on the left or reach out to sellers on the marketplace.
                  </p>
                </div>
              </div>
            )}
          </main>

        </div>

      </div>
    </div>
  );
}

