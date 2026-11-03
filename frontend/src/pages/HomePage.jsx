import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  LockKeyhole,
  PlusCircle,
  ChevronRight,
  Sparkles,
  BookOpen,
  Laptop,
  Armchair,
  Bike,
  Shirt,
  PenTool,
  ArrowRight,
  TrendingUp,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { CATEGORIES } from '../data/mockData';
import { getStoredProducts } from '../services/storage';
import ProductCard from '../components/ProductCard';
import SearchBar from '../components/SearchBar';
import Button from '../components/Button';

const categoryIconMap = {
  textbooks: BookOpen,
  electronics: Laptop,
  furniture: Armchair,
  bikes: Bike,
  clothing: Shirt,
  supplies: PenTool,
};

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const all = getStoredProducts();
    setProducts(all);
  }, []);

  const handleSearchSubmit = (query) => {
    if (query && query.trim()) {
      navigate(`/marketplace?q=${encodeURIComponent(query.trim())}`);
    } else {
      navigate('/marketplace');
    }
  };

  const featuredProducts = products.filter((p) => p.featured || p.status === 'Active').slice(0, 6);

  return (
    <div className="relative min-h-screen bg-[#F5F5F2]">
      <main className="relative z-10 font-sans text-[#111111]">
        {/* Electric Blue Hero Section */}
        <section className="relative overflow-hidden bg-[#0638C9] text-white pt-10 pb-16 sm:pt-16 sm:pb-24 bg-grid-white">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-12">
            <div className="max-w-2xl">
              {/* Neon Lime Trust Pill */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#B7FF00] px-4 py-1.5 text-xs font-heading font-extrabold uppercase tracking-wider text-[#111111] shadow-sticker-sm">
                <ShieldCheck className="h-4 w-4 text-[#111111]" aria-hidden="true" />
                <span>★ 100% TIET STUDENT VERIFIED &bull; THAPAR EXCLUSIVE</span>
              </div>

              {/* Headline */}
              <h1 className="font-display uppercase text-4xl sm:text-6xl lg:text-7xl font-black leading-[0.96] tracking-tight text-white">
                BUY. SELL. REUSE.<br />
                <span className="text-[#B7FF00]">RIGHT ON THAPAR CAMPUS.</span>
              </h1>

              {/* Subtitle */}
              <p className="mt-6 max-w-xl text-base leading-relaxed text-blue-100 sm:text-lg">
                Discover semester textbooks, Casio calculators, mini drafters, mountain cycles, and hostel essentials from verified classmates. Walkable campus meetups at Hostel J, Central Library, and COS.
              </p>

              {/* Hero Search Bar */}
              <div className="mt-8 max-w-xl">
                <SearchBar
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onSubmit={handleSearchSubmit}
                  placeholder="What do you need for class? (e.g., Grewal Maths, Casio FX-991EX, Drafter)"
                  size="lg"
                />
              </div>

              {/* CTA Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Button
                  size="lg"
                  variant="lime"
                  icon={ArrowRight}
                  iconPosition="right"
                  onClick={() => navigate('/marketplace')}
                  className="uppercase text-sm"
                >
                  Explore Marketplace
                </Button>

                <Button
                  size="lg"
                  variant="white"
                  icon={PlusCircle}
                  onClick={() => navigate('/create-listing')}
                  className="uppercase text-sm"
                >
                  Sell an Item
                </Button>
              </div>

              {/* Quick Perks */}
              <div className="mt-10 grid grid-cols-3 gap-3 border-t border-white/20 pt-6 text-xs text-blue-100 font-heading font-bold uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#B7FF00] shrink-0" />
                  <span>Enrolled Students</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#B7FF00] shrink-0" />
                  <span>Walkup Pickup</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#B7FF00] shrink-0" />
                  <span>0% Commission</span>
                </div>
              </div>
            </div>

            {/* Visual Hero Mockup */}
            <div className="relative mx-auto w-full max-w-[540px] lg:mr-0">
              <div
                className="absolute -inset-6 -z-0 rounded-4xl bg-[#B7FF00]/20 blur-2xl"
                aria-hidden="true"
              />

              <div className="relative z-10 rounded-4xl border border-white/20 bg-white p-5 shadow-2xl sm:p-7 text-[#111111]">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-[#F5F5F2]">
                  <img
                    src="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80"
                    alt="Campus MacBook Listing"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute left-3 top-3 rounded-full bg-[#B7FF00] px-3 py-1 text-[11px] font-heading font-extrabold uppercase tracking-wider text-[#111111] shadow-sm">
                    ★ VERIFIED SELLER
                  </div>
                  <div className="absolute right-3 bottom-3 rounded-full bg-[#111111] px-3.5 py-1.5 text-xs font-heading font-bold text-white shadow-md">
                    ₹24,500 &bull; EXCELLENT
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-heading font-bold text-[#111111]">Lenovo ThinkPad T480</h3>
                    <p className="text-xs text-[#62666F]">COS / SAC &bull; Aditya Malhotra (COE '23)</p>
                  </div>
                  <Link
                    to="/marketplace"
                    className="rounded-full bg-[#0638C9] px-4 py-2 text-xs font-heading font-bold text-white hover:bg-[#064DE0] transition uppercase tracking-wider"
                  >
                    View Deal
                  </Link>
                </div>
              </div>

              {/* Floating Badges */}
              <div className="absolute -left-4 top-10 z-20 flex items-center gap-2.5 rounded-full border border-[#E8E8E8] bg-white px-4 py-2.5 shadow-xl sm:-left-8">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#B7FF00] text-[#111111]">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-heading font-bold text-[#111111]">Verified .edu Email</p>
                  <p className="text-[10px] text-[#62666F]">Trusted campus network</p>
                </div>
              </div>

              <div className="absolute -right-4 bottom-6 z-20 flex items-center gap-2.5 rounded-full border border-[#E8E8E8] bg-white px-4 py-2.5 shadow-xl sm:-right-8">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#0638C9] text-white">
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-heading font-bold text-[#111111]">Campus Handshake</p>
                  <p className="text-[10px] text-[#62666F]">Inspect before paying</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="border-b border-[#E8E8E8] bg-white py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <span className="text-xs font-heading font-bold uppercase tracking-wider text-[#0638C9]">
                  Campus Departments
                </span>
                <h2 className="mt-1 text-2xl font-heading font-black text-[#111111] sm:text-3xl">
                  Popular Categories
                </h2>
              </div>
              <Link
                to="/marketplace"
                className="inline-flex items-center gap-1 text-xs font-heading font-bold text-[#0638C9] hover:underline transition uppercase tracking-wider"
              >
                <span>View all categories</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => {
                const Icon = categoryIconMap[cat.id] || BookOpen;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => navigate(`/marketplace?category=${cat.id}`)}
                    className="group flex flex-col items-center rounded-3xl border border-[#E8E8E8] bg-[#F5F5F2] p-5 text-center shadow-card transition-all hover:-translate-y-1.5 hover:border-[#0638C9] hover:bg-white hover:shadow-softblue"
                  >
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#0638C9] shadow-sm transition group-hover:bg-[#0638C9] group-hover:text-white">
                      <Icon className="h-6 w-6 stroke-[2]" />
                    </div>
                    <span className="mt-3.5 text-xs font-heading font-bold text-[#111111] group-hover:text-[#0638C9]">
                      {cat.name}
                    </span>
                    <span className="mt-0.5 text-[11px] text-[#62666F]">
                      {cat.count} items
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Featured Products Section */}
        <section className="py-14 sm:py-20 bg-[#F5F5F2]">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="mb-10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#0638C9]" />
                  <span className="text-xs font-heading font-bold uppercase tracking-wider text-[#0638C9]">
                    Fresh listings
                  </span>
                </div>
                <h2 className="mt-1 text-2xl font-heading font-black text-[#111111] sm:text-3xl">
                  Featured on Campus
                </h2>
              </div>

              <Link
                to="/marketplace"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E8E8] bg-white px-5 py-2 text-xs font-heading font-bold text-[#111111] shadow-sm hover:border-[#111111] transition uppercase tracking-wider"
              >
                <span>Browse All</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>

        {/* Sell Banner Call-to-action */}
        <section className="pb-16 sm:pb-24 bg-[#F5F5F2]">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <div className="relative overflow-hidden rounded-4xl bg-[#082B91] px-6 py-14 text-center text-white shadow-2xl sm:px-12 sm:py-20 bg-grid-white">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#B7FF00] px-4 py-1 text-xs font-heading font-extrabold uppercase tracking-wider text-[#111111]">
                <span>TURN OLD GEAR INTO CASH</span>
              </div>

              <h2 className="mx-auto max-w-2xl font-display uppercase text-2xl sm:text-4xl lg:text-5xl font-black leading-tight">
                FINISHED WITH LAST SEMESTER'S TEXTBOOKS & GEAR?
              </h2>

              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-blue-100 sm:text-base">
                Turn your unused items into instant cash. Free to list, instant student buyer reach, and zero marketplace commission.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Button
                  size="lg"
                  variant="lime"
                  icon={PlusCircle}
                  onClick={() => navigate('/create-listing')}
                  className="uppercase text-sm"
                >
                  Create a Listing Now
                </Button>
                <Button
                  size="lg"
                  variant="white"
                  onClick={() => navigate('/marketplace')}
                  className="uppercase text-sm"
                >
                  See What Sells
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

