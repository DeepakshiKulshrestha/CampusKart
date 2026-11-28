// Small building blocks shared by the admin tabs
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../../components/Button';

export const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: '7 days' },
  { value: 'month', label: '30 days' },
  { value: 'year', label: '12 months' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom' },
];

// value: { range, from, to }. Custom ranges only apply once both dates are filled in.
export function RangePicker({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex flex-wrap rounded-full border border-[#E8E8E8] bg-white p-1 shadow-sm">
        {RANGES.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => set({ range: r.value })}
            className={`rounded-full px-3.5 py-1.5 text-xs font-heading font-bold transition ${
              value.range === r.value ? 'bg-[#0638C9] text-white' : 'text-[#62666F] hover:text-[#111111]'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      {value.range === 'custom' && (
        <div className="flex items-center gap-1.5 text-xs">
          <input type="date" aria-label="From date" value={value.from || ''} max={value.to || undefined} onChange={(e) => set({ from: e.target.value })} className="rounded-full border border-[#E8E8E8] bg-white px-3 py-1.5" />
          <span className="text-[#62666F]">to</span>
          <input type="date" aria-label="To date" value={value.to || ''} min={value.from || undefined} onChange={(e) => set({ to: e.target.value })} className="rounded-full border border-[#E8E8E8] bg-white px-3 py-1.5" />
        </div>
      )}
    </div>
  );
}

// Query params for the backend; null while a custom range is incomplete
export function rangeParams({ range, from, to }) {
  if (range !== 'custom') return { range };
  return from && to ? { range, from, to } : null;
}

export function Card({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-lg font-heading font-black text-[#111111]">{title}</h2>}
            {subtitle && <p className="text-xs text-[#62666F]">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Pager({ pagination, page, setPage }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 pt-4">
      <Button variant="white" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
      <span className="text-xs font-heading font-bold text-[#62666F]">Page {page} of {pagination.totalPages} ({pagination.total})</span>
      <Button variant="white" size="sm" icon={ChevronRight} iconPosition="right" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
    </div>
  );
}

export const th = 'px-3 py-2.5 text-left text-[11px] font-heading font-extrabold uppercase tracking-wider text-[#62666F]';
export const td = 'px-3 py-3 align-top text-xs text-[#111111]';

export function SearchInput({ value, onChange, placeholder }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full sm:w-64 rounded-full border border-[#E8E8E8] bg-white px-4 py-2 text-xs focus:border-[#0638C9] focus:outline-none focus:ring-2 focus:ring-[#0638C9]/20"
    />
  );
}

export function FilterSelect({ value, onChange, options, label }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-full border border-[#E8E8E8] bg-white px-4 py-2 text-xs font-heading font-bold text-[#111111] focus:border-[#0638C9] focus:outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
