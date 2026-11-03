import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  type = 'button',
  onClick,
  ...rest
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-heading font-bold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.97] hover:scale-[1.02] tracking-tight';

  const variants = {
    primary:
      'bg-[#0638C9] hover:bg-[#064DE0] text-white shadow-md shadow-[#0638C9]/20 focus:ring-[#0638C9]',
    lime:
      'bg-[#B7FF00] hover:bg-[#9EF000] text-[#111111] font-extrabold shadow-sm focus:ring-[#B7FF00]',
    secondary:
      'bg-[#082B91] hover:bg-[#111111] text-white shadow-md shadow-[#082B91]/15 focus:ring-[#082B91]',
    white:
      'bg-white hover:bg-[#F5F5F2] text-[#111111] border border-[#E8E8E8] shadow-sm hover:border-[#111111] focus:ring-slate-400',
    outline:
      'border-2 border-[#111111] hover:bg-[#B7FF00] text-[#111111] focus:ring-[#0638C9] bg-white',
    danger:
      'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 focus:ring-red-500',
    ghost:
      'text-[#111111] hover:text-[#0638C9] hover:bg-[#0638C9]/10 focus:ring-[#0638C9]',
  };

  const sizes = {
    sm: 'text-xs px-4 py-2 gap-1.5',
    md: 'text-sm px-5 py-2.5 gap-2',
    lg: 'text-base px-7 py-3.5 gap-2.5',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : Icon && iconPosition === 'left' ? (
        <Icon className="h-4 w-4 shrink-0 stroke-[2.2]" aria-hidden="true" />
      ) : null}
      
      <span>{children}</span>

      {!isLoading && Icon && iconPosition === 'right' && (
        <Icon className="h-4 w-4 shrink-0 stroke-[2.2]" aria-hidden="true" />
      )}
    </button>
  );
}
