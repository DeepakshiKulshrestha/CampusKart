import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { productApi, getErrorMessage } from '../services/api';
import ProductCard from '../components/ProductCard';
import SearchBar from '../components/SearchBar';
import FilterPanel from '../components/FilterPanel';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import Modal from '../components/Modal';

const PAGE_SIZE = 12;
const FILTER_KEYS = ['q', 'category', 'condition', 'location', 'minPrice', 'maxPrice', 'sort', 'page'];

export default function MarketplacePage() {
  // The URL is the single source of truth for filters, so filtered views can be shared as links
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, searchParams.get(k) || '']));
  const category = filters.category || 'all';
  const sortBy = filters.sort || 'newest';
  const page = Math.max(1, Number(filters.page) || 1);

  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Text inputs are typed locally and pushed to the URL after a 400 ms pause (debounce)
  const [searchInput, setSearchInput] = useState(filters.q);
  const [locationInput, setLocationInput] = useState(filters.location);
  const [minInput, setMinInput] = useState(filters.minPrice);
  const [maxInput, setMaxInput] = useState(filters.maxPrice);

  const updateParams = useCallback(
    (changes, { resetPage = true } = {}) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(changes).forEach(([k, v]) => {
            if (v === '' || v === undefined || v === null || v === 'all') next.delete(k);
            else next.set(k, String(v));
          });
          if (resetPage && !('page' in changes)) next.delete('page');
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== filters.q || locationInput !== filters.location || minInput !== filters.minPrice || maxInput !== filters.maxPrice) {
        updateParams({ q: searchInput.trim(), location: locationInput.trim(), minPrice: minInput, maxPrice: maxInput });
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, locationInput, minInput, maxInput]);

  // Keep inputs in sync when the URL changes from outside (back button, "Clear all", Home page search)
  useEffect(() => {
    setSearchInput(filters.q);
    setLocationInput(filters.location);
    setMinInput(filters.minPrice);
    setMaxInput(filters.maxPrice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await productApi.getProducts({
        search: filters.q,
        category,
        condition: filters.condition,
        location: filters.location,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        sort: filters.sort,
        page,
        limit: PAGE_SIZE,
      });
      setProducts(data.items);
      setPagination(data.pagination);
    } catch (err) {
      setProducts([]);
      setError(getErrorMessage(err, 'Could not load listings'));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleResetFilters = () => {
    setSearchInput('');
    setLocationInput('');
    setMinInput('');
    setMaxInput('');
    setSearchParams({}, { replace: true });
  };

  const goToPage = (p) => {
    updateParams({ page: p > 1 ? p : '' }, { resetPage: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeFilterCount = [
    category !== 'all',
    Boolean(filters.q),
    Boolean(filters.minPrice || filters.maxPrice),
    Boolean(filters.condition),
    Boolean(filters.location),
  ].filter(Boolean).length;

  const filterPanelProps = {
    selectedCategory: category,
    onCategoryChange: (c) => updateParams({ category: c }),
    minPrice: minInput,
    maxPrice: maxInput,
    onMinPriceChange: setMinInput,
    onMaxPriceChange: setMaxInput,
    selectedCondition: filters.condition,
    onConditionChange: (c) => updateParams({ condition: c }),
    sortBy,
    onSortChange: (s) => updateParams({ sort: s === 'newest' ? '' : s }),
    location: locationInput,
    onLocationChange: setLocationInput,
    onReset: handleResetFilters,
    totalResults: pagination.total,
  };

  const pill = (label, onClear) => (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#E8E8E8] px-3.5 py-1 text-xs font-heading font-bold text-[#111111] shadow-sm">
      {label}
      <button type="button" onClick={onClear} className="text-[#62666F] hover:text-[#111111]" aria-label={`Remove ${label}`}>
        <X className="h-3 w-3" />
      </button>
    </span>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F2] pb-24 pt-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Marketplace Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#0638C9]/10 px-3.5 py-1 text-xs font-heading font-bold text-[#0638C9] mb-2 uppercase tracking-wider">
              <span>Campus Listings</span>
            </div>
            <h1 className="text-3xl font-heading font-black text-[#111111] sm:text-4xl tracking-tight">
              Campus Marketplace
            </h1>
            <p className="mt-1 text-xs text-[#62666F] sm:text-sm">
              {isLoading ? 'Loading listings…' : `${pagination.total} item${pagination.total === 1 ? '' : 's'} available from fellow students`}
            </p>
          </div>

          <div className="w-full sm:w-80 lg:w-96">
            <SearchBar
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onSubmit={() => updateParams({ q: searchInput.trim() })}
              placeholder="Search title, brand or description..."
              size="md"
            />
          </div>
        </div>

        {/* Mobile Filter Toggle */}
        <div className="mb-6 flex items-center justify-between rounded-3xl border border-[#E8E8E8] bg-white p-3.5 lg:hidden shadow-sm">
          <Button variant="lime" size="sm" icon={SlidersHorizontal} onClick={() => setIsMobileFiltersOpen(true)} className="text-xs uppercase">
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-[#111111] px-1.5 py-0.5 text-[10px] text-white">{activeFilterCount}</span>
            )}
          </Button>
          <span className="text-xs font-heading font-bold text-[#111111]">{pagination.total} items found</span>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[270px_1fr]">
          {/* Desktop Filter Panel */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card">
              <FilterPanel {...filterPanelProps} />
            </div>
          </aside>

          <section className="min-w-0">
            {activeFilterCount > 0 && (
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <span className="text-xs font-heading font-bold text-[#62666F] uppercase tracking-wider">Active:</span>
                {category !== 'all' && pill(`Category: ${category}`, () => updateParams({ category: '' }))}
                {filters.q && pill(`"${filters.q}"`, () => { setSearchInput(''); updateParams({ q: '' }); })}
                {filters.condition && pill(`Condition: ${filters.condition}`, () => updateParams({ condition: '' }))}
                {filters.location && pill(`Location: ${filters.location}`, () => { setLocationInput(''); updateParams({ location: '' }); })}
                {(filters.minPrice || filters.maxPrice) &&
                  pill(`₹${filters.minPrice || '0'} - ₹${filters.maxPrice || '∞'}`, () => {
                    setMinInput('');
                    setMaxInput('');
                    updateParams({ minPrice: '', maxPrice: '' });
                  })}
                <button type="button" onClick={handleResetFilters} className="text-xs font-heading font-bold text-red-600 hover:underline ml-1">
                  Clear all
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="py-24">
                <LoadingSpinner size="lg" label="Loading marketplace listings..." />
              </div>
            ) : error ? (
              <ErrorMessage title="Could not load listings" message={error} onRetry={loadProducts} />
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {pagination.totalPages > 1 && (
                  <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
                    <Button variant="white" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                      Previous
                    </Button>
                    {pageNumbers(page, pagination.totalPages).map((p, i) =>
                      p === '…' ? (
                        <span key={`gap-${i}`} className="px-1 text-sm text-[#62666F]">…</span>
                      ) : (
                        <button
                          key={p}
                          type="button"
                          onClick={() => goToPage(p)}
                          aria-current={p === page ? 'page' : undefined}
                          className={`h-9 min-w-9 rounded-full px-3 text-sm font-heading font-bold transition ${
                            p === page ? 'bg-[#0638C9] text-white' : 'bg-white text-[#111111] border border-[#E8E8E8] hover:border-[#111111]'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                    <Button
                      variant="white"
                      size="sm"
                      icon={ChevronRight}
                      iconPosition="right"
                      disabled={page >= pagination.totalPages}
                      onClick={() => goToPage(page + 1)}
                    >
                      Next
                    </Button>
                  </nav>
                )}
              </>
            ) : (
              <EmptyState
                title="No listings matched your criteria"
                description="Try loosening your price range, removing a filter or searching for something else."
                actionLabel="Reset All Filters"
                onAction={handleResetFilters}
              />
            )}
          </section>
        </div>
      </div>

      <Modal
        isOpen={isMobileFiltersOpen}
        onClose={() => setIsMobileFiltersOpen(false)}
        title="Filter Listings"
        size="md"
        footer={
          <div className="flex w-full items-center justify-between">
            <Button variant="ghost" size="sm" onClick={handleResetFilters}>Reset All</Button>
            <Button variant="primary" size="sm" onClick={() => setIsMobileFiltersOpen(false)}>
              Show {pagination.total} Results
            </Button>
          </div>
        }
      >
        <FilterPanel {...filterPanelProps} />
      </Modal>
    </div>
  );
}

// 1 … 4 5 6 … 20
function pageNumbers(current, total) {
  const pages = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...pages].sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}
