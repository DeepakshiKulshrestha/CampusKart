import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({
  size = 'md',
  color = 'blue',
  label = '',
  fullScreen = false,
  className = '',
}) {
  const sizeMap = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const colorMap = {
    blue: 'text-blue-600',
    white: 'text-white',
    slate: 'text-slate-500',
  };

  const spinner = (
    <div
      role="status"
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
    >
      <Loader2
        className={`animate-spin ${sizeMap[size] || sizeMap.md} ${
          colorMap[color] || colorMap.blue
        }`}
        aria-hidden="true"
      />
      {label && <p className="text-sm font-medium text-slate-500">{label}</p>}
      <span className="sr-only">Loading...</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return spinner;
}

