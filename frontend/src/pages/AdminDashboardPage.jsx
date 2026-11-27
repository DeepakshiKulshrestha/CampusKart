import { useSearchParams } from 'react-router-dom';
import { LayoutDashboard, Flag, Users, Tag, Percent, Sparkles } from 'lucide-react';
import OverviewTab from './admin/OverviewTab';
import ReportsTab from './admin/ReportsTab';
import UsersTab from './admin/UsersTab';
import ListingsTab from './admin/ListingsTab';
import CommissionTab from './admin/CommissionTab';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, Component: OverviewTab },
  { id: 'reports', label: 'Reports', icon: Flag, Component: ReportsTab },
  { id: 'users', label: 'Users', icon: Users, Component: UsersTab },
  { id: 'listings', label: 'Listings', icon: Tag, Component: ListingsTab },
  { id: 'commission', label: 'Commission', icon: Percent, Component: CommissionTab },
  { id: 'ai', label: 'AI', icon: Sparkles, Component: AiComingSoon },
];

// Only ADMIN users reach this page (ProtectedRoute requiredRole="ADMIN"), and every /api/admin call is
// checked again on the server, so hiding this page is not the only protection.
export default function AdminDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const active = TABS.find((t) => t.id === searchParams.get('tab')) || TABS[0];
  const { Component } = active;

  return (
    <div className="min-h-screen bg-[#F5F5F2] pb-24 pt-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#111111] px-3.5 py-1 text-xs font-heading font-bold text-[#B7FF00] uppercase tracking-wider mb-2">
            <span>Admin</span>
          </div>
          <h1 className="text-3xl font-heading font-black text-[#111111] sm:text-4xl tracking-tight">Admin Dashboard</h1>
          <p className="mt-1 text-xs text-[#62666F] sm:text-sm">Marketplace health, moderation and commission.</p>
        </div>

        <nav className="flex flex-wrap gap-2" aria-label="Admin sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSearchParams(t.id === 'overview' ? {} : { tab: t.id })}
              aria-current={active.id === t.id ? 'page' : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-heading font-bold uppercase tracking-wider transition ${
                active.id === t.id ? 'bg-[#0638C9] text-white shadow-sm' : 'bg-white text-[#62666F] border border-[#E8E8E8] hover:border-[#111111] hover:text-[#111111]'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </nav>

        <Component />
      </div>
    </div>
  );
}

// AI flags queue, AI analytics and model metrics arrive once the ML service is connected
function AiComingSoon() {
  return (
    <div className="rounded-4xl border-2 border-dashed border-[#E8E8E8] bg-white p-12 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-[#0638C9]/10 text-[#0638C9]">
        <Sparkles className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-xl font-heading font-black text-[#111111]">AI features coming soon</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#62666F]">
        The AI flags review queue, AI analytics (price model accuracy, search stats) and model metrics will appear here once the ML service is connected.
        The AI will only suggest; admins always make the final decision.
      </p>
    </div>
  );
}
