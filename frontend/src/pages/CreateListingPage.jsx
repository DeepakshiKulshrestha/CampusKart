import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, CheckCircle2 } from 'lucide-react';
import { productApi, getErrorMessage, getFieldErrors } from '../services/api';
import { CATEGORIES, CONDITIONS, MAX_IMAGES, MAX_IMAGE_MB, MAX_AGE_MONTHS, formatAge } from '../utils/constants';
import Input from '../components/Input';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';
import Modal from '../components/Modal';
import ImageUploadDropzone from '../components/ImageUploadDropzone';
import PriceSuggestion from '../components/PriceSuggestion';

const selectClass =
  'w-full rounded-2xl border bg-white px-3.5 py-2.5 text-sm text-[#111111] focus:border-[#0638C9] focus:outline-none focus:ring-2 focus:ring-[#0638C9]/20';

// Same rules the backend enforces (backend/src/utils/validation.js + Product model), checked early for quick feedback
export function validateListing(f, { requireImages = true, imageCount = 0 } = {}) {
  const errors = {};
  if (f.title.trim().length < 3) errors.title = 'Title must be at least 3 characters';
  if (f.title.trim().length > 100) errors.title = 'Title must be at most 100 characters';
  if (!f.description.trim()) errors.description = 'Description is required';
  if (f.brand.trim().length > 50) errors.brand = 'Brand must be at most 50 characters';
  const original = Number(f.originalPrice);
  const price = Number(f.price);
  const age = Number(f.age);
  if (f.originalPrice === '' || Number.isNaN(original) || original < 0) errors.originalPrice = 'Enter what you paid (₹0 or more)';
  if (f.price === '' || Number.isNaN(price) || price < 0) errors.price = 'Enter your asking price (₹0 or more)';
  else if (!errors.originalPrice && price > original * 3) errors.price = 'Price can be at most 3× the original price';
  if (f.age === '' || !Number.isInteger(age) || age < 0 || age > MAX_AGE_MONTHS) errors.age = `Whole months between 0 and ${MAX_AGE_MONTHS}`;
  if (!f.location.trim()) errors.location = 'Location is required';
  if (requireImages && imageCount === 0) errors.images = 'Add at least one photo';
  return errors;
}

export const EMPTY_LISTING = {
  title: '',
  description: '',
  category: CATEGORIES[0],
  brand: '',
  condition: 'Good',
  originalPrice: '',
  price: '',
  age: '',
  location: '',
};

export default function CreateListingPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_LISTING);
  const [images, setImages] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [createdProduct, setCreatedProduct] = useState(null);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setFieldErrors((errs) => ({ ...errs, [key]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const errors = validateListing(form, { imageCount: images.length });
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError('Please fix the highlighted fields.');
      return;
    }

    // multipart/form-data: text fields + files under "images". sellerId and status are set by the backend.
    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (String(v).trim() !== '') formData.append(k, String(v).trim());
    });
    images.forEach((file) => formData.append('images', file));

    setIsLoading(true);
    try {
      const { product } = await productApi.createProduct(formData);
      setCreatedProduct(product);
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      setError(getErrorMessage(err, 'Failed to publish listing. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F2] pb-24 pt-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0638C9]/10 px-3.5 py-1 text-xs font-heading font-bold text-[#0638C9] uppercase tracking-wider mb-2">
            <span>Student Marketplace</span>
          </div>
          <h1 className="text-3xl font-heading font-black text-[#111111] sm:text-4xl tracking-tight">Create a New Listing</h1>
          <p className="mt-1 text-xs text-[#62666F] sm:text-sm">List your books, tech, furniture or cycle for students on campus.</p>
        </div>

        {error && <ErrorMessage title="Could not publish" message={error} onDismiss={() => setError('')} />}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <ListingFields form={form} set={set} errors={fieldErrors} />

          <PriceSuggestion
            form={form}
            onUsePrice={(price) => {
              setForm((f) => ({ ...f, price }));
              setFieldErrors((errs) => ({ ...errs, price: undefined }));
            }}
          />

          <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 sm:p-8 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-heading font-extrabold uppercase tracking-wider text-[#62666F]">
                Product Photos <span className="text-red-500">*</span>
              </h2>
              <span className="text-xs font-mono font-bold text-[#0638C9] bg-[#0638C9]/10 px-2.5 py-0.5 rounded-full">
                {images.length}/{MAX_IMAGES} selected
              </span>
            </div>
            <p className="text-xs text-[#62666F]">
              JPG, PNG or WEBP, up to {MAX_IMAGE_MB} MB each. The first photo is the cover.
            </p>
            <ImageUploadDropzone
              files={images}
              onChange={(files) => {
                setImages(files);
                setFieldErrors((errs) => ({ ...errs, images: undefined }));
              }}
              maxFiles={MAX_IMAGES}
              maxSizeBytes={MAX_IMAGE_MB * 1024 * 1024}
              error={fieldErrors.images}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="white" onClick={() => navigate('/my-listings')} className="uppercase text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="lime"
              size="lg"
              isLoading={isLoading}
              icon={PlusCircle}
              className="uppercase text-xs font-heading font-extrabold tracking-wider"
            >
              {isLoading ? 'Uploading…' : 'Publish Listing'}
            </Button>
          </div>
        </form>
      </div>

      <Modal
        isOpen={Boolean(createdProduct)}
        onClose={() => navigate('/my-listings')}
        title="Listing Published!"
        size="md"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/my-listings')}>View My Listings</Button>
            <Button variant="primary" size="sm" onClick={() => navigate(`/product/${createdProduct?.id}`)}>View Listing Page</Button>
          </div>
        }
      >
        <div className="py-4 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-xl font-bold text-slate-900">"{createdProduct?.title}" is live!</h3>
          <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Students can now find it in the marketplace and send you interest requests.
          </p>
        </div>
      </Modal>
    </div>
  );
}

// The text fields, shared with the edit form in My Listings
export function ListingFields({ form, set, errors = {} }) {
  return (
    <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 sm:p-8 shadow-card space-y-6">
      <h2 className="text-xs font-heading font-extrabold uppercase tracking-wider text-[#62666F]">Basic Details</h2>

      <Input
        id="listing-title"
        label="Listing Title"
        value={form.title}
        onChange={set('title')}
        placeholder="e.g. Casio FX-991EX Scientific Calculator"
        required
        maxLength={100}
        error={errors.title}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="listing-category" className="mb-1.5 block text-xs font-semibold text-[#111111]">
            Category <span className="text-red-500">*</span>
          </label>
          <select id="listing-category" value={form.category} onChange={set('category')} className={`${selectClass} border-[#E8E8E8]`}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="listing-condition" className="mb-1.5 block text-xs font-semibold text-[#111111]">
            Condition <span className="text-red-500">*</span>
          </label>
          <select id="listing-condition" value={form.condition} onChange={set('condition')} className={`${selectClass} border-[#E8E8E8]`}>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <Input id="listing-brand" label="Brand" value={form.brand} onChange={set('brand')} placeholder="e.g. Casio (optional)" maxLength={50} error={errors.brand} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          id="listing-original-price"
          label="Original price (₹)"
          type="number"
          min="0"
          value={form.originalPrice}
          onChange={set('originalPrice')}
          placeholder="What you paid"
          required
          error={errors.originalPrice}
        />
        <Input
          id="listing-price"
          label="Your price (₹)"
          type="number"
          min="0"
          value={form.price}
          onChange={set('price')}
          placeholder="Asking price"
          required
          error={errors.price}
          helperText="At most 3× the original price"
        />
        <Input
          id="listing-age"
          label="Age (months)"
          type="number"
          min="0"
          max={MAX_AGE_MONTHS}
          step="1"
          value={form.age}
          onChange={set('age')}
          placeholder="e.g. 12"
          required
          error={errors.age}
          helperText={form.age !== '' && !Number.isNaN(Number(form.age)) ? `${formatAge(form.age)} old` : 'How long you have used it'}
        />
      </div>

      <Input
        id="listing-location"
        label="Pickup location"
        value={form.location}
        onChange={set('location')}
        placeholder="e.g. Hostel B"
        required
        error={errors.location}
        helperText="Buyers filter by this exact text, so keep it short and standard."
      />

      <div>
        <label htmlFor="listing-description" className="mb-1.5 block text-xs font-semibold text-[#111111]">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="listing-description"
          rows={4}
          maxLength={2000}
          value={form.description}
          onChange={set('description')}
          placeholder="Condition details, what's included, reason for selling, best time to meet."
          className={`w-full rounded-2xl border p-3.5 text-sm text-[#111111] placeholder:text-[#62666F]/60 focus:border-[#0638C9] focus:outline-none focus:ring-2 focus:ring-[#0638C9]/20 ${
            errors.description ? 'border-red-400' : 'border-[#E8E8E8]'
          }`}
        />
        {errors.description && <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.description}</p>}
      </div>
    </div>
  );
}
