import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MapPin, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { isItemSaved, toggleSavedItem } from '../services/storage';
import { getProductImageUrl, DEFAULT_PRODUCT_IMAGE } from '../utils/imageUrl';

export default function ProductCard({
  product,
  onSaveToggle,
  className = '',
}) {
  const [saved, setSaved] = useState(() => isItemSaved(product.id));
  const [currentStatus, setCurrentStatus] = useState(() =>
    (product.status?.toUpperCase() === 'SOLD' ? 'SOLD' : 'AVAILABLE')
  );

  // Reactive listener for product status updates
  useEffect(() => {
    const handleUpdate = (e) => {
      if (e.detail?.productId && String(e.detail.productId) === String(product.id)) {
        setCurrentStatus(e.detail.status?.toUpperCase() === 'SOLD' ? 'SOLD' : 'AVAILABLE');
      }
    };
    window.addEventListener('campuskart_product_updated', handleUpdate);
    return () => window.removeEventListener('campuskart_product_updated', handleUpdate);
  }, [product.id]);

  const handleHeartClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const nextSaved = toggleSavedItem(product.id);
    setSaved(nextSaved);
    if (onSaveToggle) onSaveToggle(product.id, nextSaved);
  };

  const conditionColors = {
    'New': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Like New': 'bg-blue-50 text-blue-700 border-blue-200',
    'Excellent': 'bg-teal-50 text-teal-700 border-teal-200',
    'Good': 'bg-amber-50 text-amber-700 border-amber-200',
    'Fair': 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const isSold = currentStatus === 'SOLD';

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-3xl border border-[#E8E8E8] bg-white shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-softblue ${className}`}
    >
      <Link
        to={`/product/${product.id}`}
        className="block relative aspect-[4/3] w-full overflow-hidden bg-[#F5F5F2]"
      >
        <img
          src={getProductImageUrl(product)}
          alt={product.title}
          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
            isSold ? 'grayscale opacity-75' : ''
          }`}
          loading="lazy"
          onError={(e) => {
            if (e.currentTarget.src !== DEFAULT_PRODUCT_IMAGE) {
              e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
            }
          }}
        />

        {/* Reactive Status Badges */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {isSold ? (
            <span className="rounded-full bg-[#111111] px-3 py-1 text-[10px] font-heading font-extrabold uppercase tracking-wider text-white shadow-sm">
              SOLD
            </span>
          ) : (
            <span className="rounded-full bg-[#B7FF00] px-3 py-1 text-[10px] font-heading font-extrabold uppercase tracking-wider text-[#111111] shadow-sm">
              AVAILABLE
            </span>
          )}

          <span
            className="rounded-full border border-white/40 bg-white/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-heading font-bold uppercase tracking-wider text-[#111111] shadow-sm"
          >
            {product.condition}
          </span>
        </div>

        {/* Heart / Wishlist Button */}
        <button
          type="button"
          onClick={handleHeartClick}
          aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-[#62666F] shadow-sm border border-[#E8E8E8] backdrop-blur-sm transition-all hover:scale-110 hover:text-red-500 hover:border-red-200 focus:outline-none"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              saved ? 'fill-red-500 text-red-500' : 'text-[#62666F]'
            }`}
            aria-hidden="true"
          />
        </button>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        {/* Category & Location */}
        <div className="flex items-center justify-between text-xs">
          <span className="font-heading font-bold uppercase text-[11px] tracking-wider text-[#0638C9]">
            {product.categoryName || 'General'}
          </span>
          {product.location && (
            <span className="inline-flex items-center gap-1 truncate max-w-[140px] text-[#62666F] text-[11px]">
              <MapPin className="h-3 w-3 shrink-0 text-[#0638C9]" />
              <span className="truncate">{product.location}</span>
            </span>
          )}
        </div>

        {/* Title & Price */}
        <div className="mt-2.5 flex-1">
          <h3 className="line-clamp-2 text-sm font-heading font-bold text-[#111111] group-hover:text-[#0638C9] transition-colors leading-snug">
            <Link to={`/product/${product.id}`}>{product.title}</Link>
          </h3>
        </div>

        <div className="mt-3.5 flex items-baseline gap-1.5">
          <span className="font-heading text-2xl font-black text-[#111111] tracking-tight">
            ₹{typeof product.price === 'number' ? product.price.toLocaleString('en-IN') : product.price}
          </span>
          <span className="text-[11px] text-[#62666F] font-heading font-semibold uppercase tracking-wider">INR</span>
        </div>

        {/* Seller Info Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-[#E8E8E8] pt-3.5">
          <div className="flex items-center gap-2">
            {product.seller?.avatarUrl ? (
              <img
                src={product.seller.avatarUrl}
                alt={product.seller.name}
                className="h-6 w-6 rounded-full object-cover ring-1 ring-[#E8E8E8]"
              />
            ) : (
              <span className="grid h-6 w-6 place-items-center rounded-full bg-[#0638C9]/10 text-[10px] font-heading font-bold text-[#0638C9]">
                {product.seller?.avatar || 'S'}
              </span>
            )}
            <span className="text-xs font-medium text-[#62666F] truncate max-w-[110px]">
              {product.seller?.name || 'Student'}
            </span>
          </div>

          {product.seller?.verified && (
            <span
              title="Verified Student"
              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-heading font-bold text-emerald-700"
            >
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              <span className="hidden sm:inline">Verified</span>
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

