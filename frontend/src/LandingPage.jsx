import {
  CheckCircle2,
  ChevronRight,
  Globe2,
  Heart,
  LockKeyhole,
  PlusCircle,
  Share2,
  ShieldCheck,
  Store,
} from 'lucide-react';
import CampusNavbar from './CampusNavbar';
import { Component } from './components/ui/gradient-backgrounds';
import { getProductImageUrl, DEFAULT_PRODUCT_IMAGE } from './utils/imageUrl';

const products = [
  {
    title: 'Higher Engineering Mathematics',
    price: '₹450',
    condition: 'USED - LIKE NEW',
    seller: 'Ananya',
    avatar: 'A',
    image:
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=85',
  },
  {
    title: 'ThinkPad T480 (16GB RAM)',
    price: '₹24,500',
    condition: 'USED - EXCELLENT',
    seller: 'Aditya',
    avatar: 'A',
    image:
      'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=900&q=85',
  },
  {
    title: 'Hero Sprint Pro Bicycle',
    price: '₹2,800',
    condition: 'USED - GOOD',
    seller: 'Arjun',
    avatar: 'A',
    image:
      'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=900&q=85',
  },
];

export default function LandingPage({ user, onLogin, onNavigate, onLogout }) {
  return (
    <div className="relative min-h-screen">
      <Component />

      <div className="relative z-10 font-sans text-brand-navy">
        <CampusNavbar user={user} onLogin={onLogin} onNavigate={onNavigate} onLogout={onLogout} />

        <main>
          <section className="overflow-hidden bg-transparent">
           <div className="mx-auto grid max-w-7xl items-center gap-5 px-5 py-5 sm:px-8 sm:py-7 lg:grid-cols-[0.9fr_1.1fr] lg:px-12 lg:py-8">
              <div className="max-w-2xl">
                <div className="mb-7 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                  <span>Trusted by 10,000+ Students</span>
                </div>

                <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.02] tracking-normal text-brand-navy sm:text-6xl lg:text-7xl">
                  Buy. Sell. Reuse.
                  <span className="block text-blue-700">Right on Campus.</span>
                </h1>

                <p className="mt-6 max-w-xl text-base leading-7 text-brand-muted sm:text-lg">
                  Discover affordable second-hand products from your campus community. Secure,
                  verified, and eco-friendly.
                </p>

                <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                  <a
                    href="#browse"
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                  >
                    Explore Marketplace
                  </a>

                  <a
                    href="#sell"
                    className="inline-flex items-center justify-center rounded-lg border border-blue-600 bg-white px-6 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
                  >
                    Sell an Item
                  </a>
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-[560px] lg:mr-2">
                <div
                  className="absolute -inset-12 -z-0 rounded-[3rem] bg-blue-100/45 blur-3xl"
                  aria-hidden="true"
                />

                <div className="relative z-10 ml-auto rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl shadow-blue-500/5 sm:p-8">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="h-7 w-28 rounded bg-slate-100" />
                    <div className="h-9 w-9 rounded-full bg-slate-100" />
                  </div>

                  <img
                    src="https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1100&q=85"
                    alt="Student bicycle parked on an outdoor university campus"
                    className="h-64 w-full rounded-2xl object-cover sm:h-80"
                  />

                  <div className="mt-5 space-y-3">
                    <div className="h-4 w-3/4 rounded bg-slate-100" />
                    <div className="h-4 w-1/2 rounded bg-slate-100" />
                  </div>
                </div>

                <div className="absolute left-0 top-8 z-20 flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-brand-navy shadow-xl shadow-blue-500/10 sm:-left-10">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-teal-500 text-white">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  </span>
                  Verified Seller
                </div>

                <div className="absolute bottom-12 right-0 z-20 flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-brand-navy shadow-xl shadow-blue-500/10 sm:-right-10">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-600 text-white">
                    <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                  </span>
                  Payment Secured
                </div>
              </div>
            </div>
          </section>

          <section id="browse" className="bg-transparent py-14 sm:py-20">
            <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
              <div className="mb-8 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold tracking-normal text-brand-navy sm:text-3xl">
                  Trending on Campus
                </h2>

                <a
                  href="#browse"
                  className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-blue-600 transition hover:text-blue-700"
                >
                  View All
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {products.map((product) => (
                  <article
                    key={product.title}
                    className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl shadow-blue-500/5"
                  >
                    <div className="relative">
                      <img
                        src={getProductImageUrl(product)}
                        alt={product.title}
                        className="h-56 w-full object-cover sm:h-64 md:h-52 lg:h-60"
                        onError={(e) => {
                          if (e.currentTarget.src !== DEFAULT_PRODUCT_IMAGE) {
                            e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                          }
                        }}
                      />

                      <button
                        type="button"
                        aria-label={`Add ${product.title} to wishlist`}
                        className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white text-slate-500 shadow-lg shadow-slate-900/10 transition hover:text-blue-600"
                      >
                        <Heart className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-base font-bold text-brand-navy">{product.title}</h3>
                        <p className="text-base font-extrabold text-blue-700">{product.price}</p>
                      </div>

                      <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        {product.condition}
                      </p>

                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                            {product.avatar}
                          </span>
                          <span className="text-sm font-medium text-slate-500">
                            Seller: {product.seller}
                          </span>
                        </div>
                        <CheckCircle2 className="h-4 w-4 text-teal-500" aria-label="Verified seller" />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="sell" className="bg-slate-50 py-16 sm:py-24">
            <div className="mx-auto max-w-5xl px-5 sm:px-8">
              <div className="rounded-3xl bg-blue-600 px-6 py-14 text-center shadow-softblue sm:px-12 sm:py-16">
                <h2 className="mx-auto max-w-3xl text-3xl font-extrabold leading-tight tracking-normal text-white sm:text-5xl">
                  Have something you don't need anymore?
                </h2>

                <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-blue-50 sm:text-base">
                  Turn your old textbooks, electronics, and furniture into cash. It's fast, free,
                  and secure to list items on campus.
                </p>

                <a
                  href="#sell"
                  className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-blue-600 shadow-lg shadow-blue-950/10 transition hover:bg-slate-50"
                >
                  <PlusCircle className="h-4 w-4" aria-hidden="true" />
                  Sell it on Campus
                </a>
              </div>
            </div>
          </section>
        </main>

        <footer className="bg-slate-50">
          <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-12">
            <div className="grid gap-10 md:grid-cols-[1.5fr_0.8fr_0.8fr]">
              <div>
                <button
                type="button"
                onClick={() => onNavigate('/landing')}
                className="flex items-center gap-2 font-bold text-blue-700"
              >
                <Store className="h-5 w-5" />
                <span>CampusMarket</span>
              </button>
                <p className="mt-4 max-w-sm text-sm leading-6 text-slate-500">
                  Built for students, by students. A safer, smarter way to trade on campus.
                </p>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Platform
                </h3>
                <ul className="mt-4 space-y-3 text-sm text-slate-500">
                  <li>
                    <a href="#" className="transition hover:text-blue-600">
                      About Us
                    </a>
                  </li>
                  <li>
                    <a href="#" className="transition hover:text-blue-600">
                      How It Works
                    </a>
                  </li>
                  <li>
                    <a href="#" className="transition hover:text-blue-600">
                      Safety Tips
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Support
                </h3>
                <ul className="mt-4 space-y-3 text-sm text-slate-500">
                  <li>
                    <a href="#" className="transition hover:text-blue-600">
                      Contact Support
                    </a>
                  </li>
                  <li>
                    <a href="#" className="transition hover:text-blue-600">
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a href="#" className="transition hover:text-blue-600">
                      Terms of Service
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-12 flex flex-col gap-5 border-t border-slate-200 pt-7 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <p>&copy; 2024 CampusMarket. Built for students, by students.</p>

              <div className="flex items-center gap-3">
                <a
                  href="#"
                  aria-label="Language settings"
                  className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-white hover:text-blue-600"
                >
                  <Globe2 className="h-4 w-4" aria-hidden="true" />
                </a>

                <a
                  href="#"
                  aria-label="Share CampusMarket"
                  className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-white hover:text-blue-600"
                >
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
