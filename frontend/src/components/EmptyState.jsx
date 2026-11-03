import { PackageOpen } from 'lucide-react';
import Button from './Button';

export default function EmptyState({
  icon: Icon = PackageOpen,
  title = 'No items found',
  description = 'Try adjusting your filters or search terms to find what you are looking for.',
  actionLabel,
  onAction,
  actionIcon,
  className = '',
  children,
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-4xl border-2 border-dashed border-[#E8E8E8] bg-white p-12 text-center ${className}`}
    >
      <div className="grid h-16 w-16 place-items-center rounded-3xl bg-[#0638C9]/10 text-[#0638C9] shadow-inner">
        <Icon className="h-8 w-8 stroke-[2]" aria-hidden="true" />
      </div>

      <h3 className="mt-5 text-xl font-heading font-black text-[#111111]">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[#62666F] leading-relaxed">
        {description}
      </p>

      {actionLabel && onAction && (
        <div className="mt-6">
          <Button
            variant="lime"
            size="md"
            icon={actionIcon}
            onClick={onAction}
            className="uppercase"
          >
            {actionLabel}
          </Button>
        </div>
      )}

      {children}
    </div>
  );
}

