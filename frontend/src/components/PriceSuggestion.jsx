import { useState } from 'react';
import { Sparkles, Check } from 'lucide-react';
import { aiApi, getErrorMessage } from '../services/api';
import Button from './Button';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

// "Suggest a price" for the Create Listing form. The AI only suggests: the seller decides the price.
export default function PriceSuggestion({ form, onUsePrice }) {
  const [state, setState] = useState({ status: 'idle', data: null, message: '' });

  const missing = [];
  if (!(Number(form.originalPrice) > 0)) missing.push('original price');
  if (form.age === '' || !Number.isInteger(Number(form.age))) missing.push('age');

  const suggest = async () => {
    setState({ status: 'loading', data: null, message: '' });
    try {
      const data = await aiApi.predictPrice({
        category: form.category,
        brand: form.brand.trim() || undefined,
        originalPrice: Number(form.originalPrice),
        age: Number(form.age),
        condition: form.condition,
      });
      setState({ status: 'done', data, message: '' });
    } catch (err) {
      const unavailable = err.response?.status === 503 || !err.response;
      setState({
        status: 'error',
        data: null,
        message: unavailable ? 'Price suggestions are unavailable right now. You can still set your own price.' : getErrorMessage(err),
      });
    }
  };

  const { status, data, message } = state;
  return (
    <div className="rounded-4xl border border-[#0638C9]/20 bg-[#0638C9]/5 p-6 sm:p-8 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-heading font-extrabold uppercase tracking-wider text-[#0638C9]">
            <Sparkles className="h-4 w-4" /> AI price suggestion
          </h2>
          <p className="mt-1 text-xs text-[#62666F]">Based on category, brand, original price, age and condition. It's only a suggestion.</p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          icon={Sparkles}
          isLoading={status === 'loading'}
          disabled={missing.length > 0}
          onClick={suggest}
          className="uppercase text-xs"
        >
          Suggest a price
        </Button>
      </div>
      {missing.length > 0 && <p className="text-[11px] text-[#62666F]">Fill in the {missing.join(' and ')} first.</p>}

      {status === 'done' && data && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-4 border border-[#E8E8E8]">
          <div>
            <p className="text-xs text-[#62666F]">Recommended price</p>
            <p className="font-heading text-3xl font-black text-[#111111]">{inr(data.predictedPrice)}</p>
            <p className="text-xs text-[#62666F]">
              Fair range {inr(data.fairPriceRange?.min)} – {inr(data.fairPriceRange?.max)}
            </p>
          </div>
          <Button type="button" variant="lime" size="sm" icon={Check} onClick={() => onUsePrice(String(Math.round(data.predictedPrice)))} className="uppercase text-xs">
            Use this price
          </Button>
          {data.dataNote && <p className="w-full text-[11px] text-[#62666F]">{data.dataNote}</p>}
        </div>
      )}
      {status === 'error' && <p className="text-xs font-semibold text-amber-800">{message}</p>}
    </div>
  );
}
