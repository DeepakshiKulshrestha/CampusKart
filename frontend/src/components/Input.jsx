import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function Input({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  helperText,
  icon: Icon,
  isPassword = false,
  required = false,
  disabled = false,
  className = '',
  ...rest
}) {
  const [showPassword, setShowPassword] = useState(false);

  const inputId = id || `input-${label ? label.toLowerCase().replace(/\s+/g, '-') : 'field'}`;
  const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700"
        >
          <span>
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </span>
        </label>
      )}

      <div className="relative">
        {Icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
        )}

        <input
          id={inputId}
          type={effectiveType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`w-full rounded-2xl border bg-white py-2.5 text-sm text-[#111111] placeholder:text-[#62666F]/60 transition-all focus:outline-none focus:ring-2 disabled:bg-[#F5F5F2] disabled:text-[#62666F] ${
            Icon ? 'pl-10' : 'pl-3.5'
          } ${isPassword ? 'pr-11' : 'pr-3.5'} ${
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
              : 'border-[#E8E8E8] focus:border-[#0638C9] focus:ring-[#0638C9]/20'
          }`}
          {...rest}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 transition hover:text-slate-700 focus:outline-none"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {error ? (
        <p className="mt-1.5 text-xs text-red-600 font-medium">{error}</p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
}

