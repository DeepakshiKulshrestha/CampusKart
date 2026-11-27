import { useState, useEffect, useCallback } from 'react';
import { adminApi, getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/constants';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { Card, Pager, SearchInput, FilterSelect, th, td } from './shared';

export default function UsersTab() {
  const { user: me } = useAuth();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [target, setTarget] = useState(null);
  const [actionError, setActionError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Wait 400 ms after typing before searching
  useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setError('');
    setData(null);
    try {
      setData(await adminApi.getUsers({ search: query, role, page, limit: 15 }));
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load users'));
    }
  }, [query, role, page]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async () => {
    setIsSaving(true);
    setActionError('');
    try {
      await adminApi.setRestricted(target._id, !target.isRestricted);
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
      title="Users"
      subtitle="Restricted users are logged out and can't log in again until you lift the restriction."
      action={
        <div className="flex flex-wrap gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name or email" />
          <FilterSelect
            label="Role"
            value={role}
            onChange={(v) => { setRole(v); setPage(1); }}
            options={[{ value: '', label: 'All roles' }, { value: 'STUDENT', label: 'Students' }, { value: 'ADMIN', label: 'Admins' }]}
          />
        </div>
      }
    >
      {error ? (
        <ErrorMessage title="Could not load users" message={error} onRetry={load} />
      ) : !data ? (
        <LoadingSpinner label="Loading users..." className="py-10" />
      ) : data.items.length === 0 ? (
        <EmptyState title="No users found" description="Try a different search." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E8E8E8]">
              <thead>
                <tr>
                  <th className={th}>Name</th>
                  <th className={th}>Email</th>
                  <th className={th}>Role</th>
                  <th className={th}>Joined</th>
                  <th className={th}>Status</th>
                  <th className={th}></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E8E8]">
                {data.items.map((u) => {
                  const locked = u.role === 'ADMIN' || String(u._id) === String(me?.id);
                  return (
                    <tr key={u._id}>
                      <td className={`${td} font-heading font-bold`}>{u.name}</td>
                      <td className={td}>{u.email}</td>
                      <td className={td}>{u.role}</td>
                      <td className={td}>{formatDate(u.createdAt)}</td>
                      <td className={td}>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-heading font-extrabold ${u.isRestricted ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'}`}>
                          {u.isRestricted ? 'RESTRICTED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td className={td}>
                        {locked ? (
                          <span className="text-[11px] text-[#62666F]">{u.role === 'ADMIN' ? 'Admin' : 'You'}</span>
                        ) : (
                          <Button size="sm" variant={u.isRestricted ? 'white' : 'danger'} onClick={() => { setActionError(''); setTarget(u); }} className="text-[11px]">
                            {u.isRestricted ? 'Unrestrict' : 'Restrict'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pager pagination={data.pagination} page={page} setPage={setPage} />
        </>
      )}

      <Modal
        isOpen={Boolean(target)}
        onClose={() => setTarget(null)}
        title={target?.isRestricted ? 'Lift restriction?' : 'Restrict this user?'}
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setTarget(null)}>Cancel</Button>
            <Button variant={target?.isRestricted ? 'primary' : 'danger'} size="sm" isLoading={isSaving} onClick={toggle}>
              {target?.isRestricted ? 'Unrestrict' : 'Restrict'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-[#62666F]">
          {target?.isRestricted
            ? `${target?.name} will be able to log in and use CampusKart again.`
            : `${target?.name} (${target?.email}) will be logged out and blocked from using CampusKart. Their listings stay as they are.`}
        </p>
        {actionError && <ErrorMessage variant="inline" message={actionError} className="mt-3" />}
      </Modal>
    </Card>
  );
}
