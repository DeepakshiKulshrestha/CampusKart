import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  Edit2,
  Trash2,
  CheckCircle,
  Eye,
  Tag,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import {
  getCurrentUser,
  getStoredProducts,
  updateProduct,
  deleteProduct,
  formatINR,
  filesToDataUrls,
} from '../services/storage';
import { CATEGORIES } from '../data/mockData';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import ImageUploadDropzone from '../components/ImageUploadDropzone';
import {
  getProductImageUrl,
  getProductImages,
  DEFAULT_PRODUCT_IMAGE,
} from '../utils/imageUrl';

export default function MyListingsPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [listings, setListings] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');

  // Edit Modal State
  const [editingItem, setEditingItem] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCondition, setEditCondition] = useState('Good');
  const [editCategory, setEditCategory] = useState('textbooks');
  const [editStatus, setEditStatus] = useState('Active');
  const [editDescription, setEditDescription] = useState('');
  const [editExistingImages, setEditExistingImages] = useState([]);
  const [editNewFiles, setEditNewFiles] = useState([]);
  const [editError, setEditError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Modal State
  const [deletingId, setDeletingId] = useState(null);

  const loadListings = () => {
    const user = getCurrentUser();
    setCurrentUser(user);
    const all = getStoredProducts();
    const userEmail = user?.email?.toLowerCase();
    const userList = all.filter(
      (p) =>
        p.seller?.id === user?.id ||
        (userEmail && p.seller?.email?.toLowerCase() === userEmail)
    );
    setListings(userList);
  };

  useEffect(() => {
    loadListings();

    const handleUpdate = () => loadListings();
    window.addEventListener('campuskart_product_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('campuskart_product_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setEditTitle(item.title || '');
    setEditPrice(String(item.price || ''));
    setEditCondition(item.condition || 'Good');
    setEditCategory(item.category || 'books-academic');
    setEditStatus(item.status || 'Active');
    setEditDescription(item.description || '');
    const currentImgs = getProductImages(item).filter((url) => url !== DEFAULT_PRODUCT_IMAGE);
    setEditExistingImages(currentImgs);
    setEditNewFiles([]);
    setEditError('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    setEditError('');

    if (editExistingImages.length === 0 && editNewFiles.length === 0) {
      setEditError('Please retain or upload at least one image for your listing.');
      return;
    }

    setIsSavingEdit(true);
    try {
      let newUrls = [];
      if (editNewFiles.length > 0) {
        newUrls = await filesToDataUrls(editNewFiles);
      }
      const combined = [...editExistingImages, ...newUrls];

      await updateProduct(editingItem.id, {
        title: editTitle.trim(),
        price: parseFloat(editPrice) || 0,
        condition: editCondition,
        category: editCategory,
        status: editStatus,
        description: editDescription.trim(),
        images: combined,
        image: combined[0] || '',
      });

      setIsSavingEdit(false);
      setEditingItem(null);
      loadListings();
    } catch (err) {
      setIsSavingEdit(false);
      setEditError('Failed to save listing changes. Please try again.');
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingId) return;
    deleteProduct(deletingId);
    setDeletingId(null);
    loadListings();
  };

  const handleQuickToggleSold = (item) => {
    const isCurrentlySold = item.status?.toUpperCase() === 'SOLD';
    const nextStatus = isCurrentlySold ? 'AVAILABLE' : 'SOLD';
    updateProduct(item.id, { status: nextStatus });
    loadListings();
  };

  const filteredListings = listings.filter((item) => {
    if (statusFilter === 'All') return true;
    if (statusFilter === 'Active' || statusFilter === 'AVAILABLE') {
      return item.status !== 'Sold' && item.status?.toUpperCase() !== 'SOLD';
    }
    return item.status === 'Sold' || item.status?.toUpperCase() === 'SOLD';
  });

  return (
    <div className="min-h-screen bg-[#F5F5F2] pb-24 pt-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0638C9]/10 px-3.5 py-1 text-xs font-heading font-bold text-[#0638C9] uppercase tracking-wider mb-2">
              <span>My Campus Inventory</span>
            </div>
            <h1 className="text-3xl font-heading font-black text-[#111111] sm:text-4xl tracking-tight">
              My Campus Listings
            </h1>
            <p className="mt-1 text-xs text-[#62666F] sm:text-sm">
              Manage your active items, modify pricing, or mark items as sold.
            </p>
          </div>

          <Button
            variant="lime"
            size="md"
            icon={PlusCircle}
            onClick={() => navigate('/create-listing')}
            className="uppercase text-xs"
          >
            Create New Listing
          </Button>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {['All', 'Active', 'Sold'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-full px-5 py-2 text-xs font-heading font-bold uppercase tracking-wider transition-all ${
                statusFilter === status
                  ? 'bg-[#0638C9] text-white shadow-sm'
                  : 'bg-white text-[#62666F] border border-[#E8E8E8] hover:border-[#111111] hover:text-[#111111]'
              }`}
            >
              {status} ({status === 'All' ? listings.length : listings.filter((l) => l.status === status).length})
            </button>
          ))}
        </div>

        {/* Listings List */}
        {filteredListings.length > 0 ? (
          <div className="space-y-4">
            {filteredListings.map((item) => {
              const isSold = item.status === 'Sold' || item.status?.toUpperCase() === 'SOLD';
              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-5 rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card transition hover:shadow-softblue sm:flex-row sm:items-center sm:justify-between"
                >
                  {/* Left: Thumbnail & Details */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative aspect-square h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#F5F5F2] border border-[#E8E8E8]">
                      <img
                        src={getProductImageUrl(item)}
                        alt={item.title}
                        className={`h-full w-full object-cover ${isSold ? 'grayscale' : ''}`}
                        onError={(e) => {
                          if (e.currentTarget.src !== DEFAULT_PRODUCT_IMAGE) {
                            e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                          }
                        }}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-0.5 text-[10px] font-heading font-extrabold uppercase tracking-wider ${
                            isSold
                              ? 'bg-[#111111] text-white'
                              : 'bg-[#B7FF00] text-[#111111]'
                          }`}
                        >
                          {isSold ? 'SOLD' : 'AVAILABLE'}
                        </span>
                        <span className="text-xs text-[#62666F] font-heading font-bold uppercase tracking-wider text-[11px]">
                          {item.categoryName} &bull; {item.condition}
                        </span>
                      </div>

                      <h3 className="mt-1 font-heading font-bold text-[#111111] text-base truncate">
                        <Link to={`/product/${item.id}`} className="hover:text-[#0638C9]">
                          {item.title}
                        </Link>
                      </h3>

                      <div className="mt-1 flex items-center gap-3 text-xs text-[#62666F]">
                        <span className="font-heading font-black text-[#0638C9] text-base">
                          {formatINR(item.price)}
                        </span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5 text-[#0638C9]" />
                          <span>{item.views || 0} views</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 border-t border-[#E8E8E8] pt-3 sm:border-0 sm:pt-0">
                    <Button
                      size="sm"
                      variant="white"
                      onClick={() => handleQuickToggleSold(item)}
                      className="text-xs uppercase"
                    >
                      {isSold ? 'Mark Active' : 'Mark as Sold'}
                    </Button>

                    <Button
                      size="sm"
                      variant="white"
                      icon={Edit2}
                      onClick={() => handleOpenEdit(item)}
                      className="text-xs uppercase"
                    >
                      Edit
                    </Button>

                    <Link to={`/product/${item.id}`}>
                      <Button size="sm" variant="ghost" icon={ExternalLink} className="text-xs uppercase">
                        View
                      </Button>
                    </Link>

                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Trash2}
                      onClick={() => setDeletingId(item.id)}
                      className="text-red-600 hover:bg-red-50 text-xs uppercase"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No listings in this category"
            description="You don't have any listings matching the current filter. Post an item to reach thousands of campus buyers."
            actionLabel="Post New Listing"
            onAction={() => navigate('/create-listing')}
          />
        )}
      </div>

      {/* Edit Listing Modal */}
      <Modal
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        title="Edit Listing Details"
        size="lg"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {editError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {editError}
            </div>
          )}

          <Input
            id="edit-title"
            label="Listing Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              id="edit-price"
              label="Price (₹ INR)"
              type="number"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              required
            />

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Condition
              </label>
              <select
                value={editCondition}
                onChange={(e) => setEditCondition(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
              >
                <option value="New">New</option>
                <option value="Like New">Like New</option>
                <option value="Excellent">Used - Excellent</option>
                <option value="Good">Used - Good</option>
                <option value="Fair">Used - Fair</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Status
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
              >
                <option value="Active">Active</option>
                <option value="Sold">Sold</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Description
            </label>
            <textarea
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Product Images (Max 4 photos, 1MB each)
            </label>
            <ImageUploadDropzone
              files={editNewFiles}
              onChange={setEditNewFiles}
              existingImages={editExistingImages}
              onRemoveExisting={(url, idx) => {
                setEditExistingImages((prev) => prev.filter((_, i) => i !== idx));
              }}
              maxFiles={4}
              maxSizeMB={1}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditingItem(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSavingEdit}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        title="Delete Listing"
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleConfirmDelete}>
              Delete Listing
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3 py-2">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-100 text-red-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Are you sure?</h4>
            <p className="mt-1 text-xs text-slate-500">
              This action cannot be undone. The listing will be removed immediately from CampusKart.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

