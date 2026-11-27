import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, getErrorMessage } from '../../services/api';
import { STATUS_BADGE, PRODUCT_STATUS, formatDate } from '../../utils/constants';
import { DEFAULT_PRODUCT_IMAGE } from '../../utils/imageUrl';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { Card, Pager, SearchInput, FilterSelect, th, td, inr } from './shared';

export default function ListingsTab() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [target, setTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setError('');
    setData(null);
    try {
      setData(await adminApi.getProducts({ search: query, status, page, limit: 15 }));
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load listings'));
    }
  }, [query, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async () => {
    setIsSaving(true);
    setActionError('');
    try {
      await adminApi.removeProduct(target._id, reason.trim() || undefined);
      setTarget(null);
      load();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card
      title="Listings"
      subtitle="Every listing, including sold and removed ones. Removing is a soft delete."
      action={
        <div className="flex flex-wrap gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search title" />
          <FilterSelect
            label="Listing status"
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            options={[{ value: '', label: 'All statuses' }, ...PRODUCT_STATUS.map((s) => ({ value: s, label: s }))]}
          />
        </div>
      }
    >
      {error ? (
        <ErrorMessage title="Could not load listings" message={error} onRetry={load} />
      ) : !data ? (
        <LoadingSpinner label="Loading listings..." className="py-10" />
      ) : data.items.length === 0 ? (
        <EmptyState title="No listings found" description="Try a different search or status." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E8E8E8]">
              <thead>
                <tr>
                  <th className={th}>Listing</th>
                  <th className={th}>Seller</th>
                  <th className={th}>Price</th>
                  <th className={th}>Status</th>
                  <th className={th}>Listed</th>
                  <th className={th}></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E8E8]">
                {data.items.map((p) => (
                  <tr key={p._id}>
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        <img src={p.images?.[0] || DEFAULT_PRODUCT_IMAGE} alt="" className="h-10 w-10 rounded-xl object-cover" />
                        <div>
                          {p.status === 'REMOVED' ? (
                            <span className="font-heading font-bold">{p.title}</span>
                          ) : (
                            <Link to={`/product/${p._id}`} className="font-heading font-bold hover:text-[#0638C9]">{p.title}</Link>
                          )}
                          <div className="text-[#62666F]">{p.category} &bull; {p.condition}</div>
                        </div>
                      </div>
                    </td>
                    <td className={td}>{p.sellerId?.name}<div className="text-[#62666F]">{p.sellerId?.email}</div></td>
                    <td className={td}>{inr(p.price)}</td>
                    <td className={td}>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-heading font-extrabold ${STATUS_BADGE[p.status]}`}>{p.status}</span>
                    </td>
                    <td className={td}>{formatDate(p.createdAt)}</td>
                    <td className={td}>
                      {p.status !== 'REMOVED' && (
                        <Button size="sm" variant="danger" onClick={() => { setTarget(p); setReason(''); setActionError(''); }} className="text-[11px]">
                          Remove
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager pagination={data.pagination} page={page} setPage={setPage} />
        </>
      )}

      <Modal
        isOpen={Boolean(target)}
        onClose={() => setTarget(null)}
        title="Remove this listing?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setTarget(null)}>Cancel</Button>
            <Button variant="danger" size="sm" isLoading={isSaving} onClick={remove}>Remove listing</Button>
          </>
        }
      >
        <p className="text-sm text-[#62666F]">"{target?.title}" by {target?.sellerId?.name} will disappear from the marketplace.</p>
        <label htmlFor="remove-reason" className="mt-4 mb-1 block text-xs font-semibold text-slate-700">Reason (optional, for the server log)</label>
        <input
          id="remove-reason"
          value={reason}
          maxLength={500}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-blue-600 focus:outline-none"
        />
        {actionError && <ErrorMessage variant="inline" message={actionError} className="mt-3" />}
      </Modal>
    </Card>
  );
}
