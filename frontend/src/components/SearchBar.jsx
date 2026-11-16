import { Search, X } from 'lucide-react';

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  onClear,
  placeholder = 'Search textbooks, electronics, bikes...',
  className = '',
  size = 'md',
  autoFocus = false,
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit(value);
  };

  const handleClear = () => {
    if (onClear) onClear();
    else if (onChange) onChange({ target: { value: '' } });
  };

  const sizeClasses = {
    sm: 'py-2 pl-9 pr-8 text-xs',
    md: 'py-3 pl-11 pr-10 text-sm',
    lg: 'py-4 pl-12 pr-12 text-base',
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5 left-3',
    md: 'h-4 w-4 left-4',
    lg: 'h-5 w-5 left-4',
  };

  return (
    <form onSubmit={handleSubmit} className={`relative w-full ${className}`}>
      <div className={`pointer-events-none absolute inset-y-0 flex items-center text-slate-400 ${iconSizes[size]}`}>
        <Search className="h-full w-full" aria-hidden="true" />
      </div>

      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`w-full rounded-full border border-[#E8E8E8] bg-white text-[#111111] placeholder:text-[#62666F]/60 shadow-sm transition-all focus:border-[#0638C9] focus:outline-none focus:ring-2 focus:ring-[#0638C9]/20 ${sizeClasses[size]}`}
      />

      {value ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </form>
  );
}

