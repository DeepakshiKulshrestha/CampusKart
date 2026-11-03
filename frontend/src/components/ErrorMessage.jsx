import { AlertCircle, RotateCcw, X } from 'lucide-react';
import Button from './Button';

export default function ErrorMessage({
  title = 'Something went wrong',
  message,
  onRetry,
  onDismiss,
  variant = 'card',
  className = '',
}) {
  if (!message && !title) return null;

  if (variant === 'inline') {
    return (
      <div
        role="alert"
        className={`flex items-center gap-2 text-xs font-medium text-red-600 ${className}`}
      >
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{message || title}</span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={`rounded-2xl border border-red-200 bg-red-50/80 p-5 text-red-900 shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red-100 text-red-600">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-red-900">{title}</h4>
            {message && <p className="mt-1 text-xs leading-relaxed text-red-700">{message}</p>}
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss error"
            className="rounded-lg p-1 text-red-500 hover:bg-red-100 hover:text-red-700 focus:outline-none"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {onRetry && (
        <div className="mt-4 flex justify-end">
          <Button
            size="sm"
            variant="outline"
            icon={RotateCcw}
            onClick={onRetry}
            className="border-red-300 bg-white text-red-700 hover:bg-red-50"
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}

