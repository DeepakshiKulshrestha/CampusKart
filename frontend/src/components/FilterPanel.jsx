import { RotateCcw, SlidersHorizontal, ChevronDown, Check } from 'lucide-react';
import { CATEGORIES } from '../data/mockData';
import Button from './Button';

export default function FilterPanel({
  selectedCategory,
  onCategoryChange,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  selectedCondition,
  onConditionChange,
  sortBy,
  onSortChange,
  onReset,
  totalResults = 0,
  className = '',
}) {
  const conditions = ['All', 'New', 'Like New', 'Excellent', 'Good', 'Fair'];
  const sortOptions = [
    { value: 'newest', label: 'Newest Arrivals' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'popular', label: 'Most Popular' },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E8E8E8]">
        <div className="flex items-center gap-2 text-[#111111] font-heading font-bold">
          <SlidersHorizontal className="h-4 w-4 text-[#0638C9]" />
          <span>Filters</span>
          {totalResults !== undefined && (
            <span className="ml-1 rounded-full bg-[#0638C9]/10 px-2.5 py-0.5 text-xs font-heading font-bold text-[#0638C9]">
              {totalResults}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 text-xs font-heading font-bold text-[#0638C9] hover:underline transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Sort By */}
      <div>
        <label className="block text-xs font-heading font-bold uppercase tracking-wider text-[#62666F] mb-2">
          Sort By
        </label>
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full appearance-none rounded-2xl border border-[#E8E8E8] bg-white px-3.5 py-2.5 text-sm font-medium text-[#111111] shadow-sm focus:border-[#0638C9] focus:outline-none focus:ring-2 focus:ring-[#0638C9]/20 pr-10"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#62666F]" />
        </div>
      </div>

      {/* Categories */}
      <div>
        <label className="block text-xs font-heading font-bold uppercase tracking-wider text-[#62666F] mb-2.5">
          Category
        </label>
        <div className="space-y-1">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategoryChange(cat.id)}
                className={`flex w-full items-center justify-between rounded-full px-4 py-2 text-xs font-heading font-bold transition-all ${
                  isActive
                    ? 'bg-[#0638C9] text-white shadow-sm shadow-[#0638C9]/20'
                    : 'text-[#62666F] hover:bg-[#F5F5F2] hover:text-[#111111]'
                }`}
              >
                <span>{cat.name}</span>
                {isActive && <Check className="h-3.5 w-3.5 text-[#B7FF00]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <label className="block text-xs font-heading font-bold uppercase tracking-wider text-[#62666F] mb-2.5">
          Price Range (₹)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <input
              type="number"
              placeholder="Min ₹"
              min="0"
              value={minPrice}
              onChange={(e) => onMinPriceChange(e.target.value)}
              className="w-full rounded-2xl border border-[#E8E8E8] bg-white px-3.5 py-2 text-xs text-[#111111] placeholder:text-[#62666F]/60 focus:border-[#0638C9] focus:outline-none focus:ring-2 focus:ring-[#0638C9]/20"
            />
          </div>
          <div>
            <input
              type="number"
              placeholder="Max ₹"
              min="0"
              value={maxPrice}
              onChange={(e) => onMaxPriceChange(e.target.value)}
              className="w-full rounded-2xl border border-[#E8E8E8] bg-white px-3.5 py-2 text-xs text-[#111111] placeholder:text-[#62666F]/60 focus:border-[#0638C9] focus:outline-none focus:ring-2 focus:ring-[#0638C9]/20"
            />
          </div>
        </div>

        {/* Quick price presets */}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {[
            { label: 'Under ₹500', min: '', max: '500' },
            { label: '₹500 - ₹2,000', min: '500', max: '2000' },
            { label: '₹2,000+', min: '2000', max: '' },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                onMinPriceChange(preset.min);
                onMaxPriceChange(preset.max);
              }}
              className="rounded-full bg-[#F5F5F2] px-2.5 py-1 text-[11px] font-heading font-bold text-[#62666F] hover:bg-[#0638C9]/10 hover:text-[#0638C9] transition"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Condition */}
      <div>
        <label className="block text-xs font-heading font-bold uppercase tracking-wider text-[#62666F] mb-2.5">
          Condition
        </label>
        <div className="flex flex-wrap gap-1.5">
          {conditions.map((cond) => {
            const isSelected =
              cond === 'All'
                ? !selectedCondition || selectedCondition === 'All'
                : selectedCondition === cond;

            return (
              <button
                key={cond}
                type="button"
                onClick={() => onConditionChange(cond === 'All' ? '' : cond)}
                className={`rounded-full border px-3 py-1.5 text-xs font-heading font-bold transition ${
                  isSelected
                    ? 'border-[#0638C9] bg-[#0638C9] text-white shadow-sm'
                    : 'border-[#E8E8E8] bg-white text-[#62666F] hover:border-[#111111] hover:text-[#111111]'
                }`}
              >
                {cond}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

