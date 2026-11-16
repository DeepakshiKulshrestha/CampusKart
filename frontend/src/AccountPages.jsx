import { Bookmark, Package, Settings, Store, Tags } from 'lucide-react';
import CampusNavbar from './CampusNavbar';
import { Component } from './components/ui/gradient-backgrounds';
import { getCollegeFromEmail, getFullName, getInitials } from './authStorage';

function AccountShell({ user, onLogin, onNavigate, onLogout, children }) {
  return (
    <div className="relative min-h-screen">
      <Component />

      <div className="relative z-10 font-sans text-brand-navy">
        <CampusNavbar user={user} onLogin={onLogin} onNavigate={onNavigate} onLogout={onLogout} />
        <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8 lg:px-12">{children}</main>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm shadow-blue-500/5">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value || 'Not provided'}</p>
    </div>
  );
}

function EmptyStatePage({
  user,
  onLogin,
  onNavigate,
  onLogout,
  icon: Icon,
  title,
  message,
  ctaLabel,
  ctaPath,
}) {
  return (
    <AccountShell user={user} onLogin={onLogin} onNavigate={onNavigate} onLogout={onLogout}>
      <section className="rounded-3xl border border-slate-100 bg-white px-6 py-12 text-center shadow-2xl shadow-blue-500/5 sm:px-10">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-blue-50 text-blue-600">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-3xl font-extrabold tracking-normal text-brand-navy">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">{message}</p>
        {ctaLabel ? (
          <button
            type="button"
            onClick={() => onNavigate(ctaPath)}
            className="mt-7 inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            {ctaLabel}
          </button>
        ) : null}
      </section>
    </AccountShell>
  );
}

export function ProfilePage({ user, onLogin, onNavigate, onLogout }) {
  return (
    <AccountShell user={user} onLogin={onLogin} onNavigate={onNavigate} onLogout={onLogout}>
      <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl shadow-blue-500/5">
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-slate-950 px-6 py-10 text-white sm:px-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-white text-2xl font-extrabold text-blue-700 shadow-lg shadow-blue-950/20">
              {getInitials(user)}
            </span>
            <div>
              <h1 className="text-3xl font-extrabold tracking-normal text-white">{getFullName(user)}</h1>
              <p className="mt-2 text-sm text-blue-100/80">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-8 sm:px-10">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Personal Information</h2>
            <p className="mt-1 text-sm text-slate-500">Your account details collected during signup or login.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <DetailRow label="First Name" value={user.firstName} />
            <DetailRow label="Last Name" value={user.lastName} />
            <DetailRow label="Email" value={user.email} />
            <DetailRow label="College / University" value={getCollegeFromEmail(user.email)} />
            <DetailRow label="Account Status" value="Logged in" />
          </div>
        </div>
      </section>
    </AccountShell>
  );
}

export function OrdersPage(props) {
  return (
    <EmptyStatePage
      {...props}
      icon={Package}
      title="My Orders"
      message="You haven't placed any orders yet."
      ctaLabel="Browse Marketplace"
      ctaPath="/landing#browse"
    />
  );
}

export function ListingsPage(props) {
  return (
    <EmptyStatePage
      {...props}
      icon={Tags}
      title="My Listings"
      message="You haven't listed anything yet."
      ctaLabel="Sell an Item"
      ctaPath="/landing#sell"
    />
  );
}

export function SavedItemsPage(props) {
  return (
    <EmptyStatePage
      {...props}
      icon={Bookmark}
      title="Saved Items"
      message="Saved marketplace items will appear here."
      ctaLabel="Browse Marketplace"
      ctaPath="/landing#browse"
    />
  );
}

export function SettingsPage(props) {
  return (
    <EmptyStatePage
      {...props}
      icon={Settings}
      title="Account Settings"
      message="Account preferences will be available here."
      ctaLabel="View Profile"
      ctaPath="/profile"
    />
  );
}

export function FallbackAccountPage(props) {
  return (
    <EmptyStatePage
      {...props}
      icon={Store}
      title="CampusMarket"
      message="This section is ready for future account data."
      ctaLabel="Back to Marketplace"
      ctaPath="/landing"
    />
  );
}
