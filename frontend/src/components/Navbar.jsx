import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Store,
  PlusCircle,
  UserRound,
  Package,
  Tags,
  Bookmark,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  Inbox,
  Receipt,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from './Button';

export default function Navbar({ onLogout }) {
  const { user, logout, isAdmin } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    const handlePointerDown = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    await logout();
    if (onLogout) onLogout();
    navigate('/');
  };

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Marketplace', path: '/marketplace' },
    { label: 'Dashboard', path: '/dashboard', authRequired: true },
    { label: 'Messages', path: '/chat', authRequired: true },
    { label: 'My Listings', path: '/my-listings', authRequired: true },
  ];

  const initials = user
    ? [user.firstName, user.lastName]
        .filter(Boolean)
        .map((p) => p[0]?.toUpperCase())
        .join('')
        .slice(0, 2) || (user.email?.[0] || 'S').toUpperCase()
    : 'U';

  return (
    <header className="sticky top-0 z-40 border-b border-[#E8E8E8] bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2.5 transition-transform hover:scale-[1.02] focus:outline-none"
        >
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#0638C9] text-white shadow-md shadow-[#0638C9]/25">
            <Store className="h-5 w-5 stroke-[2.4]" aria-hidden="true" />
          </div>
          <span className="font-display text-xl tracking-tight text-[#111111]">
            CAMPUS<span className="text-[#0638C9]">KART</span>
            <span className="inline-block ml-0.5 text-[#B7FF00] font-black text-2xl leading-none">.</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
          {navLinks.map((link) => {
            if (link.authRequired && !user) return null;
            return (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `rounded-full px-4 py-1.5 text-xs font-heading font-bold uppercase tracking-wider transition-all duration-200 ${
                    isActive
                      ? 'bg-[#0638C9] text-white shadow-sm shadow-[#0638C9]/20'
                      : 'text-[#62666F] hover:bg-[#F5F5F2] hover:text-[#111111]'
                  }`
                }
              >
                {link.label}
              </NavLink>
            );
          })}

          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-heading font-bold uppercase tracking-wider transition-all ${
                  isActive
                    ? 'bg-purple-700 text-white shadow-sm'
                    : 'text-purple-700 bg-purple-50 hover:bg-purple-100'
                }`
              }
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Admin</span>
            </NavLink>
          )}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          {/* Sell button */}
          <Link to="/create-listing">
            <Button
              variant="lime"
              size="sm"
              icon={PlusCircle}
              className="shadow-sm uppercase text-xs"
            >
              Sell Item
            </Button>
          </Link>

          {/* User state / dropdown */}
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2.5 rounded-full border border-[#E8E8E8] bg-white p-1 pr-3 shadow-sm hover:border-[#111111] transition-all focus:outline-none"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.firstName || 'Student'}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[#0638C9] text-xs font-heading font-bold text-white">
                    {initials}
                  </span>
                )}
                <span className="text-xs font-heading font-bold text-[#111111] max-w-[90px] truncate">
                  {user.firstName || 'Account'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-[#62666F]" />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-3xl border border-[#E8E8E8] bg-white p-2 shadow-xl shadow-black/5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-2.5 border-b border-[#E8E8E8]">
                    <p className="text-xs font-heading font-bold text-[#111111] truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-[11px] text-[#62666F] truncate">{user.email}</p>
                    {user.college && (
                      <span className="mt-1.5 inline-block rounded-full bg-[#0638C9]/10 px-2.5 py-0.5 text-[10px] font-heading font-bold text-[#0638C9]">
                        {user.college}
                      </span>
                    )}
                  </div>

                  <div className="py-1 space-y-0.5">
                    <Link
                      to="/dashboard"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-2xl px-3 py-2 text-xs font-medium text-[#111111] hover:bg-[#F5F5F2] transition"
                    >
                      <LayoutDashboard className="h-4 w-4 text-[#0638C9]" />
                      <span>Student Dashboard</span>
                    </Link>
                    <Link
                      to="/profile"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-2xl px-3 py-2 text-xs font-medium text-[#111111] hover:bg-[#F5F5F2] transition"
                    >
                      <UserRound className="h-4 w-4 text-[#62666F]" />
                      <span>My Profile</span>
                    </Link>
                    <Link
                      to="/my-listings"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-2xl px-3 py-2 text-xs font-medium text-[#111111] hover:bg-[#F5F5F2] transition"
                    >
                      <Tags className="h-4 w-4 text-[#62666F]" />
                      <span>My Listings</span>
                    </Link>
                    <Link
                      to="/chat"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-2xl px-3 py-2 text-xs font-medium text-[#111111] hover:bg-[#F5F5F2] transition"
                    >
                      <MessageSquare className="h-4 w-4 text-[#0638C9]" />
                      <span>Negotiation Chat</span>
                    </Link>
                    <Link
                      to="/interests"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-2xl px-3 py-2 text-xs font-medium text-[#111111] hover:bg-[#F5F5F2] transition"
                    >
                      <Inbox className="h-4 w-4 text-[#0638C9]" />
                      <span>Interest Inbox</span>
                    </Link>
                    <Link
                      to="/transactions"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-2xl px-3 py-2 text-xs font-medium text-[#111111] hover:bg-[#F5F5F2] transition"
                    >
                      <Receipt className="h-4 w-4 text-[#0638C9]" />
                      <span>Transactions</span>
                    </Link>
                    <Link
                      to="/create-listing"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-2xl px-3 py-2 text-xs font-medium text-[#111111] hover:bg-[#F5F5F2] transition"
                    >
                      <PlusCircle className="h-4 w-4 text-[#62666F]" />
                      <span>Create Listing</span>
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-2xl px-3 py-2 text-xs font-heading font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 transition"
                      >
                        <ShieldAlert className="h-4 w-4 text-purple-600" />
                        <span>Admin Console</span>
                      </Link>
                    )}
                  </div>

                  <div className="border-t border-[#E8E8E8] pt-1 mt-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Log In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center gap-2 md:hidden">
          <Link to="/create-listing">
            <Button size="sm" variant="lime" icon={PlusCircle}>
              Sell
            </Button>
          </Link>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="grid h-10 w-10 place-items-center rounded-2xl border border-[#E8E8E8] text-[#111111] hover:bg-[#F5F5F2] focus:outline-none"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="border-b border-[#E8E8E8] bg-white px-5 py-4 md:hidden animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col gap-1.5 pb-3">
            {navLinks.map((link) => {
              if (link.authRequired && !user) return null;
              return (
                <NavLink
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `rounded-full px-4 py-2.5 text-xs font-heading font-bold uppercase tracking-wider transition ${
                      isActive ? 'bg-[#0638C9] text-white' : 'text-[#62666F] hover:bg-[#F5F5F2]'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              );
            })}

            {isAdmin && (
              <NavLink
                to="/admin"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-full bg-purple-50 px-4 py-2.5 text-xs font-heading font-bold text-purple-700"
              >
                Admin Dashboard
              </NavLink>
            )}
          </nav>

          <div className="border-t border-[#E8E8E8] pt-3">
            {user ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 px-2 py-1">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0638C9] text-xs font-heading font-bold text-white">
                    {initials}
                  </span>
                  <div>
                    <p className="text-sm font-heading font-bold text-[#111111]">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-[#62666F]">{user.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Link
                    to="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="rounded-full border border-[#E8E8E8] py-2 text-center text-xs font-heading font-bold text-[#111111]"
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-full border border-red-200 py-2 text-center text-xs font-heading font-bold text-red-600"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-full border border-[#E8E8E8] py-2 text-center text-xs font-heading font-bold text-[#111111]"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-full bg-[#0638C9] py-2 text-center text-xs font-heading font-bold text-white"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

