import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, ArrowUpDown, Sparkles } from 'lucide-react';
import { getStoredProducts } from '../services/storage';
import ProductCard from '../components/ProductCard';
import SearchBar from '../components/SearchBar';
import FilterPanel from '../components/FilterPanel';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import Modal from '../components/Modal';

export default function MarketplacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [condition, setCondition] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Load products
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      const stored = getStoredProducts();
      setProducts(stored);
      setIsLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, []);

  // Sync URL search params
  useEffect(() => {
    const urlQ = searchParams.get('q');
    const urlCat = searchParams.get('category');
    if (urlQ !== null) setSearchQuery(urlQ);
    if (urlCat !== null) setCategory(urlCat);
  }, [searchParams]);

  const handleCategoryChange = (catId) => {
    setCategory(catId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (catId && catId !== 'all') {
        next.set('category', catId);
      } else {
        next.delete('category');
      }
      return next;
    });
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val.trim()) {
        next.set('q', val);
      } else {
        next.delete('q');
      }
      return next;
    });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategory('all');
    setMinPrice('');
    setMaxPrice('');
    setCondition('');
    setSortBy('newest');
    setSearchParams({});
  };

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(query);
        const matchesDesc = item.description?.toLowerCase().includes(query);
        const matchesLocation = item.location?.toLowerCase().includes(query);
        const matchesCategory = item.categoryName?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesLocation && !matchesCategory) {
          return false;
        }
      }

      // Category
      if (category && category !== 'all') {
        if (item.category !== category) return false;
      }

      // Price filter
      const priceNum = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
      if (minPrice !== '' && !isNaN(parseFloat(minPrice))) {
        if (priceNum < parseFloat(minPrice)) return false;
      }
      if (maxPrice !== '' && !isNaN(parseFloat(maxPrice))) {
        if (priceNum > parseFloat(maxPrice)) return false;
      }

      // Condition filter
      if (condition && condition !== 'All') {
        if (item.condition?.toLowerCase() !== condition.toLowerCase()) return false;
      }

      return true;
    }).sort((a, b) => {
      const priceA = typeof a.price === 'number' ? a.price : parseFloat(a.price) || 0;
      const priceB = typeof b.price === 'number' ? b.price : parseFloat(b.price) || 0;

      if (sortBy === 'price_asc') return priceA - priceB;
      if (sortBy === 'price_desc') return priceB - priceA;
      if (sortBy === 'popular') return (b.views || 0) - (a.views || 0);
      // Default: newest
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [products, searchQuery, category, minPrice, maxPrice, condition, sortBy]);

  const activeFilterCount = [
    category !== 'all',
    searchQuery.trim().length > 0,
    minPrice !== '',
    maxPrice !== '',
    condition !== '' && condition !== 'All',
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#F5F5F2] pb-24 pt-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Marketplace Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#0638C9]/10 px-3.5 py-1 text-xs font-heading font-bold text-[#0638C9] mb-2 uppercase tracking-wider">
              <span>TIET Patiala Campus Listings</span>
            </div>
            <h1 className="text-3xl font-heading font-black text-[#111111] sm:text-4xl tracking-tight">
              Thapar Campus Marketplace
            </h1>
            <p className="mt-1 text-xs text-[#62666F] sm:text-sm">
              Discover {products.length} student-listed items across TIET hostels and academic blocks
            </p>
          </div>

          {/* Search bar inside header */}
          <div className="w-full sm:w-80 lg:w-96">
            <SearchBar
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search items or locations..."
              size="md"
            />
          </div>
        </div>

        {/* Mobile Filter Toggle & Quick Stats */}
        <div className="mb-6 flex items-center justify-between rounded-3xl border border-[#E8E8E8] bg-white p-3.5 lg:hidden shadow-sm">
          <Button
            variant="lime"
            size="sm"
            icon={SlidersHorizontal}
            onClick={() => setIsMobileFiltersOpen(true)}
            className="text-xs uppercase"
          >
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-[#111111] px-1.5 py-0.5 text-[10px] text-white">
                {activeFilterCount}
              </span>
            )}
          </Button>

          <span className="text-xs font-heading font-bold text-[#111111]">
            {filteredProducts.length} items found
          </span>
        </div>

        {/* Main Grid & Sidebar Layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[270px_1fr]">
          {/* Desktop Filter Panel */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card">
              <FilterPanel
                selectedCategory={category}
                onCategoryChange={handleCategoryChange}
                minPrice={minPrice}
                maxPrice={maxPrice}
                onMinPriceChange={setMinPrice}
                onMaxPriceChange={setMaxPrice}
                selectedCondition={condition}
                onConditionChange={setCondition}
                sortBy={sortBy}
                onSortChange={setSortBy}
                onReset={handleResetFilters}
                totalResults={filteredProducts.length}
              />
            </div>
          </aside>

          {/* Product Listing Area */}
          <section className="min-w-0">
            {/* Active filter pills */}
            {activeFilterCount > 0 && (
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <span className="text-xs font-heading font-bold text-[#62666F] uppercase tracking-wider">Active:</span>
                {category !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#E8E8E8] px-3.5 py-1 text-xs font-heading font-bold text-[#111111] shadow-sm">
                    Category: {category}
                    <button
                      type="button"
                      onClick={() => handleCategoryChange('all')}
                      className="text-[#62666F] hover:text-[#111111]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#E8E8E8] px-3.5 py-1 text-xs font-heading font-bold text-[#111111] shadow-sm">
                    "{searchQuery}"
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-[#62666F] hover:text-[#111111]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {condition && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#E8E8E8] px-3.5 py-1 text-xs font-heading font-bold text-[#111111] shadow-sm">
                    Condition: {condition}
                    <button
                      type="button"
                      onClick={() => setCondition('')}
                      className="text-[#62666F] hover:text-[#111111]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {(minPrice || maxPrice) && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#E8E8E8] px-3.5 py-1 text-xs font-heading font-bold text-[#111111] shadow-sm">
                    ₹{minPrice || '0'} - ₹{maxPrice || '∞'}
                    <button
                      type="button"
                      onClick={() => {
                        setMinPrice('');
                        setMaxPrice('');
                      }}
                      className="text-[#62666F] hover:text-[#111111]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-heading font-bold text-red-600 hover:underline ml-1"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Results Grid or Empty State */}
            {isLoading ? (
              <div className="py-24">
                <LoadingSpinner size="lg" label="Loading marketplace listings..." />
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No listings matched your criteria"
                description="We couldn't find any items matching your current filters. Try loosening your price range or search terms."
                actionLabel="Reset All Filters"
                onAction={handleResetFilters}
              />
            )}
          </section>
        </div>
      </div>

      {/* Mobile Filters Modal */}
      <Modal
        isOpen={isMobileFiltersOpen}
        onClose={() => setIsMobileFiltersOpen(false)}
        title="Filter Listings"
        size="md"
        footer={
          <div className="flex w-full items-center justify-between">
            <Button variant="ghost" size="sm" onClick={handleResetFilters}>
              Reset All
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsMobileFiltersOpen(false)}
            >
              Show {filteredProducts.length} Results
            </Button>
          </div>
        }
      >
        <FilterPanel
          selectedCategory={category}
          onCategoryChange={handleCategoryChange}
          minPrice={minPrice}
          maxPrice={maxPrice}
          onMinPriceChange={setMinPrice}
          onMaxPriceChange={setMaxPrice}
          selectedCondition={condition}
          onConditionChange={setCondition}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onReset={handleResetFilters}
          totalResults={filteredProducts.length}
        />
      </Modal>
    </div>
  );
}

