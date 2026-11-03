import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  Image as ImageIcon,
  CheckCircle2,
  Tag,
  DollarSign,
  MapPin,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { CATEGORIES } from '../data/mockData';
import { productApi } from '../services/api';
import { filesToDataUrls } from '../services/storage';
import Input from '../components/Input';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';
import Modal from '../components/Modal';
import ImageUploadDropzone from '../components/ImageUploadDropzone';

const CATEGORY_MAP = {
  'books-academic': 'Books',
  'electronics': 'Electronics',
  'laptops-accessories': 'Accessories',
  'cycles-transportation': 'Cycles',
  'hostel-essentials': 'Furniture',
  'clothing-fashion': 'Other',
  'sports-equipment': 'Other',
  'gaming': 'Electronics',
  'lab-equipment': 'Stationery',
  'miscellaneous': 'Other',
};

const CONDITION_MAP = {
  'New': 'New',
  'Like New': 'Like New',
  'Excellent': 'Like New',
  'Good': 'Good',
  'Fair': 'Fair',
  'Poor': 'Poor',
};

export default function CreateListingPage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('books-academic');
  const [condition, setCondition] = useState('Like New');
  const [location, setLocation] = useState('Hostel J / Central Library');
  const [images, setImages] = useState([]);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [createdProduct, setCreatedProduct] = useState(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Product title is required.');
      return;
    }
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      setError('Please provide a valid price greater than ₹0.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide a brief item description.');
      return;
    }
    if (!images || images.length === 0) {
      setError('Please upload at least one image of your item (max 4 photos, 1MB each).');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Build multipart/form-data for backend API
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('price', parseFloat(price));
      formData.append('category', CATEGORY_MAP[category] || 'Other');
      formData.append('condition', CONDITION_MAP[condition] || condition);
      formData.append('location', location.trim() || 'TIET Campus, Patiala');

      images.forEach((file) => {
        formData.append('images', file);
      });

      // Convert images to Base64 data URLs for offline persistence
      let persistentDataUrls = [];
      if (images && images.length > 0) {
        persistentDataUrls = await filesToDataUrls(images);
      }

      // 2. Prepare fallback data for offline/mock persistent storage
      const fallbackData = {
        title: title.trim(),
        description: description.trim(),
        price: parseFloat(price),
        category,
        categoryName: CATEGORIES.find((c) => c.id === category)?.name || 'General',
        condition,
        location: location.trim() || 'TIET Campus, Patiala',
        images: persistentDataUrls,
        image: persistentDataUrls[0] || '',
      };

      const newListing = await productApi.createProduct(formData, fallbackData);

      setIsLoading(false);
      setCreatedProduct(newListing);
      setIsSuccessModalOpen(true);
    } catch (err) {
      setIsLoading(false);
      setError(err?.response?.data?.message || err?.message || 'Failed to publish listing. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F2] pb-24 pt-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0638C9]/10 px-3.5 py-1 text-xs font-heading font-bold text-[#0638C9] uppercase tracking-wider mb-2">
            <span>Student Marketplace</span>
          </div>
          <h1 className="text-3xl font-heading font-black text-[#111111] sm:text-4xl tracking-tight">
            Create a New Listing
          </h1>
          <p className="mt-1 text-xs text-[#62666F] sm:text-sm">
            List your textbooks, tech, dorm essentials, or bikes in front of verified students.
          </p>
        </div>

        {error && (
          <ErrorMessage
            title="Form Incomplete"
            message={error}
            onDismiss={() => setError('')}
            className="mb-6"
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 sm:p-8 shadow-card space-y-6">
            <h2 className="text-xs font-heading font-extrabold uppercase tracking-wider text-[#62666F]">
              Basic Details
            </h2>

            <Input
              id="listing-title"
              label="Listing Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Stewart Calculus 9th Edition with Study Guide"
              required
              helperText="Be descriptive so classmates can find it via search."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#111111]">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-2xl border border-[#E8E8E8] bg-white px-3.5 py-2.5 text-sm text-[#111111] focus:border-[#0638C9] focus:outline-none focus:ring-2 focus:ring-[#0638C9]/20"
                >
                  {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Condition */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#111111]">
                  Condition <span className="text-red-500">*</span>
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full rounded-2xl border border-[#E8E8E8] bg-white px-3.5 py-2.5 text-sm text-[#111111] focus:border-[#0638C9] focus:outline-none focus:ring-2 focus:ring-[#0638C9]/20"
                >
                  <option value="New">New / Unopened</option>
                  <option value="Like New">Like New</option>
                  <option value="Excellent">Used - Excellent</option>
                  <option value="Good">Used - Good</option>
                  <option value="Fair">Used - Fair</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Price */}
              <Input
                id="listing-price"
                label="Price (₹ INR)"
                type="number"
                min="1"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 450"
                required
              />

              {/* Pickup Location */}
              <Input
                id="listing-location"
                label="TIET Pickup Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Hostel J, Central Library, Block C"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#111111]">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe condition, what's included (cables, manuals), reason for selling, and best hours to meet."
                required
                className="w-full rounded-2xl border border-[#E8E8E8] p-3.5 text-sm text-[#111111] placeholder:text-[#62666F]/60 focus:border-[#0638C9] focus:outline-none focus:ring-2 focus:ring-[#0638C9]/20"
              />
            </div>
          </div>

          {/* Image Upload Dropzone Section */}
          <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 sm:p-8 shadow-card space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-heading font-extrabold uppercase tracking-wider text-[#62666F]">
                  Product Photos <span className="text-red-500">*</span>
                </h2>
                <span className="text-xs font-mono font-bold text-[#0638C9] bg-[#0638C9]/10 px-2.5 py-0.5 rounded-full">
                  {images.length}/4 selected
                </span>
              </div>
              <p className="mt-1 text-xs text-[#62666F]">
                Drag and drop or browse to upload real photos of your item (JPG, PNG, WEBP, max 1MB each). The first photo serves as the listing cover.
              </p>
            </div>

            <ImageUploadDropzone
              files={images}
              onChange={setImages}
              maxFiles={4}
              maxSizeMB={1}
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="white"
              onClick={() => navigate('/marketplace')}
              className="uppercase text-xs"
            >
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
              Publish Listing
            </Button>
          </div>
        </form>
      </div>

      {/* Success Modal */}
      <Modal
        isOpen={isSuccessModalOpen}
        onClose={() => navigate('/my-listings')}
        title="Listing Published!"
        size="md"
        footer={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/my-listings')}
            >
              View My Listings
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/product/${createdProduct?.id || createdProduct?._id}`)}
            >
              View Listing Page
            </Button>
          </div>
        }
      >
        <div className="py-4 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-xl font-bold text-slate-900">
            "{createdProduct?.title}" is Live!
          </h3>
          <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Your listing has been saved to your campus catalog. Classmates can now search, view, and message you.
          </p>
        </div>
      </Modal>
    </div>
  );
}
