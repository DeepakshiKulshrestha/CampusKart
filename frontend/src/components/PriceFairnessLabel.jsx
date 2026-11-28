import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { aiApi } from '../services/api';

const STYLES = {
  'GOOD DEAL': 'bg-emerald-50 text-emerald-800 border-emerald-200',
  FAIR: 'bg-blue-50 text-blue-800 border-blue-200',
  'SLIGHTLY HIGH': 'bg-amber-50 text-amber-800 border-amber-200',
  OVERPRICED: 'bg-red-50 text-red-700 border-red-200',
};
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

// AI fair-price badge for a listing. If the AI service is unavailable it renders nothing (the page works as usual).
export default function PriceFairnessLabel({ productId }) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    let active = true;
    setResult(null);
    aiApi
      .priceFairness(productId)
      .then((data) => active && setResult(data))
      .catch(() => active && setResult(null));
    return () => {
      active = false;
    };
  }, [productId]);

  if (!result?.label) return null;
  return (
    <div data-testid="fairness-badge" className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border px-3.5 py-2 text-xs ${STYLES[result.label] || STYLES.FAIR}`}>
      <Sparkles className="h-3.5 w-3.5 shrink-0" />
      <span className="font-heading font-extrabold uppercase tracking-wider">{result.label}</span>
      <span>
        AI fair range {inr(result.fairPriceRange?.min)} – {inr(result.fairPriceRange?.max)}
      </span>
    </div>
  );
}
