import { Link } from 'react-router-dom';
import { Store, ShieldCheck, Heart, Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-[#0638C9]/20 bg-[#082B91] text-white font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-white pointer-events-none opacity-40" />

      <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand Info */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-[#B7FF00] text-[#111111] shadow-sm">
                <Store className="h-5 w-5 stroke-[2.4]" />
              </div>
              <span className="font-display text-xl tracking-tight text-white">
                CAMPUS<span className="text-[#B7FF00]">KART</span>
              </span>
            </Link>
            <p className="text-xs leading-relaxed text-blue-100/75 max-w-xs">
              The verified student-to-student marketplace built exclusively for Thapar Institute of Engineering & Technology (TIET), Patiala, Punjab. Buy, sell, and reuse textbooks, electronics, and hostel essentials safely.
            </p>
            <div className="flex items-center gap-2 text-xs font-heading font-bold text-[#111111] bg-[#B7FF00] px-3.5 py-1.5 rounded-full w-fit shadow-sm">
              <ShieldCheck className="h-4 w-4 text-[#111111]" />
              <span>100% TIET STUDENT VERIFIED</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-heading font-black uppercase tracking-wider text-white">
              Marketplace
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs text-blue-100/70">
              <li>
                <Link to="/marketplace" className="hover:text-[#B7FF00] transition">
                  Browse All Listings
                </Link>
              </li>
              <li>
                <Link to="/marketplace?category=textbooks" className="hover:text-[#B7FF00] transition">
                  Textbooks & Study
                </Link>
              </li>
              <li>
                <Link to="/marketplace?category=electronics" className="hover:text-[#B7FF00] transition">
                  Tech & Gadgets
                </Link>
              </li>
              <li>
                <Link to="/marketplace?category=furniture" className="hover:text-[#B7FF00] transition">
                  Dorm & Furniture
                </Link>
              </li>
              <li>
                <Link to="/create-listing" className="hover:text-[#B7FF00] transition font-bold text-[#B7FF00]">
                  + Sell Your Stuff
                </Link>
              </li>
            </ul>
          </div>

          {/* Student Hub */}
          <div>
            <h4 className="text-xs font-heading font-black uppercase tracking-wider text-white">
              Student Hub
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs text-blue-100/70">
              <li>
                <Link to="/dashboard" className="hover:text-[#B7FF00] transition">
                  Student Dashboard
                </Link>
              </li>
              <li>
                <Link to="/my-listings" className="hover:text-[#B7FF00] transition">
                  Manage My Listings
                </Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-[#B7FF00] transition">
                  My Profile & Verification
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-[#B7FF00] transition">
                  Student Login
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-[#B7FF00] transition">
                  Create Campus Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Safety & Trust */}
          <div>
            <h4 className="text-xs font-heading font-black uppercase tracking-wider text-white">
              Safety & Trust
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs text-blue-100/70">
              <li className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#B7FF00]" />
                <span>Meet in well-lit public campus spots</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#B7FF00]" />
                <span>Inspect items prior to payment</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#B7FF00]" />
                <span>Verify student identity cards</span>
              </li>
              <li className="pt-2">
                <Link to="/admin" className="text-blue-200/60 hover:text-white transition text-[11px] font-heading font-bold uppercase tracking-wider">
                  Moderator & Admin Portal &rarr;
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-blue-200/60 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} CampusKart. Built exclusively for Thapar Institute (TIET), Patiala.</p>
          <div className="flex items-center gap-4 text-xs">
            <span className="hover:text-white transition cursor-pointer">Privacy Policy</span>
            <span>&bull;</span>
            <span className="hover:text-white transition cursor-pointer">Terms of Service</span>
            <span>&bull;</span>
            <span className="hover:text-white transition cursor-pointer">Campus Safety Rules</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

