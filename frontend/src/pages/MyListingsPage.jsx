import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, Edit2, Trash2, CheckCircle, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { productApi, getErrorMessage, getFieldErrors } from '../services/api';
import { STATUS_BADGE, formatAge, formatDate } from '../utils/constants';
import { getProductImageUrl, DEFAULT_PRODUCT_IMAGE } from '../utils/imageUrl';
import { ListingFields, validateListing } from './CreateListingPage';
import Button from '../components/Button';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';

const PAGE_SIZE = 20;
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const toForm = (p) => ({
  title: p.title || '',
  description: p.description || '',
  category: p.category,
  brand: p.brand || '',
  condition: p.condition,
  originalPrice: String(p.originalPrice ?? ''),
  price: String(p.price ?? ''),
  age: String(p.age ?? ''),
  location: p.location || '',
});

export default function MyListingsPage() {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 0, total: 0 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');

  // Edit
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const [editError, setEditError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Confirmations: { type: 'delete' | 'sold', item }
  const [confirm, setConfirm] = useState(null);
  const [confirmError, setConfirmError] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const loadListings = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const data = await productApi.getMyProducts({ page, limit: PAGE_SIZE });
      setListings(data.items);
      setPagination(data.pagination);
    } catch (err) {
      setLoadError(getErrorMessage(err, 'Could not load your listings'));
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setEditForm(toForm(item));
    setEditErrors({});
    setEditError('');
  };

  const setEditField = (key) => (e) => {
    setEditForm((f) => ({ ...f, [key]: e.target.value }));
    setEditErrors((errs) => ({ ...errs, [key]: undefined }));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    const errors = validateListing(editForm, { requireImages: false });
    setEditErrors(errors);
    if (Object.keys(errors).length) return setEditError('Please fix the highlighted fields.');

    // Only send what changed; numbers as numbers (this is a JSON request, not multipart)
    const original = toForm(editingItem);
    const changes = {};
    Object.keys(editForm).forEach((k) => {
      if (editForm[k] !== original[k]) {
        changes[k] = ['originalPrice', 'price', 'age'].includes(k) ? Number(editForm[k]) : editForm[k].trim();
      }
    });
    if (!Object.keys(changes).length) return setEditingItem(null);

    setIsSavingEdit(true);
    setEditError('');
    try {
      await productApi.updateProduct(editingItem.id, changes);
      setEditingItem(null);
      setNotice('Listing updated.');
      loadListings();
    } catch (err) {
      setEditErrors(getFieldErrors(err));
      setEditError(getErrorMessage(err, 'Could not save your changes'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    setConfirmError('');
    try {
      if (confirm.type === 'delete') {
        await productApi.deleteProduct(confirm.item.id);
        setNotice('Listing deleted. It no longer appears in the marketplace.');
      } else {
        await productApi.markSold(confirm.item.id);
        window.dispatchEvent(new CustomEvent('campuskart_product_updated', { detail: { productId: confirm.item.id, status: 'SOLD' } }));
        setNotice('Listing marked as sold.');
      }
      setConfirm(null);
      loadListings();
    } catch (err) {
      setConfirmError(getErrorMessage(err));
    } finally {
      setIsConfirming(false);
    }
  };

  const counts = {
    ALL: listings.length,
    AVAILABLE: listings.filter((l) => l.status === 'AVAILABLE').length,
    SOLD: listings.filter((l) => l.status === 'SOLD').length,
  };
  const filteredListings = statusFilter === 'ALL' ? listings : listings.filter((l) => l.status === statusFilter);

  return (
    <div className="min-h-screen bg-[#F5F5F2] pb-24 pt-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0638C9]/10 px-3.5 py-1 text-xs font-heading font-bold text-[#0638C9] uppercase tracking-wider mb-2">
              <span>My Inventory</span>
            </div>
            <h1 className="text-3xl font-heading font-black text-[#111111] sm:text-4xl tracking-tight">My Listings</h1>
            <p className="mt-1 text-xs text-[#62666F] sm:text-sm">Edit details, mark items as sold, or delete listings.</p>
          </div>
          <Button variant="lime" size="md" icon={PlusCircle} onClick={() => navigate('/create-listing')} className="uppercase text-xs">
            Create New Listing
          </Button>
        </div>

        {notice && (
          <div role="status" className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice('')} className="text-emerald-700 hover:underline">Dismiss</button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'AVAILABLE', 'SOLD'].map((status) => (
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
              {status === 'ALL' ? 'All' : status} ({counts[status]})
            </button>
          ))}
        </div>

        {isLoading ? (
          <LoadingSpinner size="lg" label="Loading your listings..." className="py-20" />
        ) : loadError ? (
          <ErrorMessage title="Could not load your listings" message={loadError} onRetry={loadListings} />
        ) : filteredListings.length > 0 ? (
          <div className="space-y-4">
            {filteredListings.map((item) => {
              const isSold = item.status === 'SOLD';
              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-5 rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card transition hover:shadow-softblue sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative aspect-square h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#F5F5F2] border border-[#E8E8E8]">
                      <img
                        src={getProductImageUrl(item)}
                        alt={item.title}
                        className={`h-full w-full object-cover ${isSold ? 'grayscale' : ''}`}
                        onError={(e) => {
                          if (e.currentTarget.src !== DEFAULT_PRODUCT_IMAGE) e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-0.5 text-[10px] font-heading font-extrabold uppercase tracking-wider ${STATUS_BADGE[item.status]}`}>
                          {item.status}
                        </span>
                        <span className="text-[#62666F] font-heading font-bold uppercase tracking-wider text-[11px]">
                          {item.category} &bull; {item.condition} &bull; {formatAge(item.age)}
                        </span>
                      </div>
                      <h3 className="mt-1 font-heading font-bold text-[#111111] text-base truncate">
                        <Link to={`/product/${item.id}`} className="hover:text-[#0638C9]">{item.title}</Link>
                      </h3>
                      <div className="mt-1 flex items-center gap-3 text-xs text-[#62666F]">
                        <span className="font-heading font-black text-[#0638C9] text-base">{inr(item.price)}</span>
                        <span>&bull;</span>
                        <span>Listed {formatDate(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-[#E8E8E8] pt-3 sm:border-0 sm:pt-0">
                    {!isSold && (
                      <>
                        <Button size="sm" variant="white" icon={CheckCircle} onClick={() => { setConfirmError(''); setConfirm({ type: 'sold', item }); }} className="text-xs uppercase">
                          Mark as Sold
                        </Button>
                        <Button size="sm" variant="white" icon={Edit2} onClick={() => handleOpenEdit(item)} className="text-xs uppercase">
                          Edit
                        </Button>
                      </>
                    )}
                    <Link to={`/product/${item.id}`}>
                      <Button size="sm" variant="ghost" icon={ExternalLink} className="text-xs uppercase">View</Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Trash2}
                      onClick={() => { setConfirmError(''); setConfirm({ type: 'delete', item }); }}
                      className="text-red-600 hover:bg-red-50 text-xs uppercase"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4">
                <Button variant="white" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <span className="text-xs font-heading font-bold text-[#62666F]">Page {page} of {pagination.totalPages}</span>
                <Button variant="white" size="sm" icon={ChevronRight} iconPosition="right" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            title={listings.length ? 'No listings with this status' : 'You have no listings yet'}
            description="Post an item to reach students on your campus."
            actionLabel="Post New Listing"
            onAction={() => navigate('/create-listing')}
          />
        )}
      </div>

      {/* Edit listing */}
      <Modal
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        title="Edit Listing"
        size="lg"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditingItem(null)}>Cancel</Button>
            <Button variant="primary" size="sm" isLoading={isSavingEdit} onClick={handleSaveEdit}>Save Changes</Button>
          </>
        }
      >
        {editForm && (
          <form onSubmit={handleSaveEdit} className="space-y-4" noValidate>
            {editError && <ErrorMessage variant="inline" message={editError} />}
            <ListingFields form={editForm} set={setEditField} errors={editErrors} />
            <p className="text-[11px] text-[#62666F]">Photos can't be changed after publishing. To use new photos, delete this listing and create a new one.</p>
          </form>
        )}
      </Modal>

      {/* Delete / mark sold confirmation */}
      <Modal
        isOpen={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.type === 'delete' ? 'Delete listing?' : 'Mark as sold?'}
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant={confirm?.type === 'delete' ? 'danger' : 'primary'} size="sm" isLoading={isConfirming} onClick={handleConfirm}>
              {confirm?.type === 'delete' ? 'Delete' : 'Mark as Sold'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-[#62666F]">
          {confirm?.type === 'delete'
            ? `"${confirm?.item.title}" will be removed from the marketplace. Past transactions and reports still keep a record of it.`
            : `Use this if "${confirm?.item.title}" was sold outside CampusKart. Buyers won't be able to send new requests. This can't be undone.`}
        </p>
        {confirmError && <ErrorMessage variant="inline" message={confirmError} className="mt-3" />}
      </Modal>
    </div>
  );
}
