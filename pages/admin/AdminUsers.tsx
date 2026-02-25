import React from 'react';
import { AlertCircle, Loader2, RefreshCcw, Search, ShieldCheck, UserCheck, UserX } from 'lucide-react';
import { AdminUser, UserRole, UserStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';

const roleBadge: Record<UserRole, string> = {
  admin: 'bg-red-100 text-red-700',
  customer: 'bg-slate-100 text-slate-700',
};

const statusBadge: Record<UserStatus, string> = {
  active: 'bg-green-100 text-green-700',
  blocked: 'bg-yellow-100 text-yellow-700',
};

const parseApiError = (error: unknown): string => {
  if (!(error instanceof Error)) return 'Amalni bajarishda xatolik yuz berdi.';
  try {
    const parsed = JSON.parse(error.message) as { error?: string };
    if (parsed?.error) return parsed.error;
  } catch {
    // Non-JSON error text.
  }
  return error.message || 'Amalni bajarishda xatolik yuz berdi.';
};

const toRecordByPhone = (rows: AdminUser[]) => {
  const map = new Map<string, AdminUser>();
  rows.forEach((row) => map.set(row.phone, row));
  return map;
};

const AdminUsers: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [totalUsers, setTotalUsers] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [updatingKey, setUpdatingKey] = React.useState('');
  const [bulkUpdating, setBulkUpdating] = React.useState(false);
  const [error, setError] = React.useState('');
  const [queryInput, setQueryInput] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = React.useState<'all' | UserStatus>('all');
  const [selectedPhones, setSelectedPhones] = React.useState<string[]>([]);
  const [pageSize, setPageSize] = React.useState(10);
  const [currentPage, setCurrentPage] = React.useState(1);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(queryInput.trim());
      setCurrentPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedPhones([]);
  }, [roleFilter, statusFilter, pageSize]);

  const loadUsers = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.getAdminUsers(user, {
        query,
        role: roleFilter,
        status: statusFilter,
        page: currentPage,
        pageSize,
      });
      setUsers(result.items);
      setTotalUsers(result.total);
      setTotalPages(result.totalPages || 1);
      if (result.page !== currentPage) setCurrentPage(result.page);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, query, roleFilter, statusFilter, user]);

  React.useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const isSelected = (phone: string) => selectedPhones.includes(phone);
  const pageAllSelected = users.length > 0 && users.every((row) => isSelected(row.phone));

  const toggleSelect = (phone: string) => {
    setSelectedPhones((prev) => (prev.includes(phone) ? prev.filter((p) => p !== phone) : [...prev, phone]));
  };

  const toggleSelectCurrentPage = () => {
    setSelectedPhones((prev) => {
      const pagePhones = users.map((row) => row.phone);
      const prevSet = new Set(prev);
      const everySelected = pagePhones.every((phone) => prevSet.has(phone));
      if (everySelected) {
        return prev.filter((phone) => !pagePhones.includes(phone));
      }
      pagePhones.forEach((phone) => prevSet.add(phone));
      return Array.from(prevSet);
    });
  };

  const mergeUpdatedUsers = (updatedRows: AdminUser[]) => {
    if (!updatedRows.length) return;
    const updatedMap = toRecordByPhone(updatedRows);
    setUsers((prev) => prev.map((row) => updatedMap.get(row.phone) || row));
  };

  const handleRoleChange = async (phone: string, role: UserRole) => {
    if (!user) return;
    setError('');
    setUpdatingKey(`${phone}:role`);
    try {
      const updated = await api.updateAdminUserRole(phone, role, user);
      mergeUpdatedUsers([updated]);
      if (roleFilter !== 'all' && updated.role !== roleFilter) {
        void loadUsers();
      }
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setUpdatingKey('');
    }
  };

  const handleStatusChange = async (phone: string, status: UserStatus) => {
    if (!user) return;
    setError('');
    setUpdatingKey(`${phone}:status`);
    try {
      const updated = await api.updateAdminUserStatus(phone, status, user);
      mergeUpdatedUsers([updated]);
      if (statusFilter !== 'all' && updated.status !== statusFilter) {
        void loadUsers();
      }
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setUpdatingKey('');
    }
  };

  const runBulkUpdate = async (
    updater: (phone: string) => Promise<AdminUser>,
    doneMessage: string
  ) => {
    if (!user || selectedPhones.length === 0 || bulkUpdating) return;
    setBulkUpdating(true);
    setError('');
    try {
      const targets = [...selectedPhones];
      const settled = await Promise.allSettled(targets.map((phone) => updater(phone)));
      const updatedRows: AdminUser[] = [];
      let failed = 0;
      settled.forEach((result) => {
        if (result.status === 'fulfilled') {
          updatedRows.push(result.value);
        } else {
          failed += 1;
        }
      });

      mergeUpdatedUsers(updatedRows);
      setSelectedPhones((prev) => prev.filter((phone) => !updatedRows.some((u) => u.phone === phone)));

      if (failed > 0) {
        setError(`${doneMessage}: ${updatedRows.length} ta muvaffaqiyatli, ${failed} ta muvaffaqiyatsiz.`);
      }

      if ((roleFilter !== 'all' || statusFilter !== 'all') && updatedRows.length > 0) {
        await loadUsers();
      }
    } finally {
      setBulkUpdating(false);
    }
  };

  const bulkSetRole = async (role: UserRole) => {
    await runBulkUpdate(
      (phone) => api.updateAdminUserRole(phone, role, user),
      `Bulk role "${role}" yakunlandi`
    );
  };

  const bulkSetStatus = async (status: UserStatus) => {
    await runBulkUpdate(
      (phone) => api.updateAdminUserStatus(phone, status, user),
      `Bulk status "${status}" yakunlandi`
    );
  };

  const pageAdmins = users.filter((row) => row.role === 'admin').length;
  const pageBlocked = users.filter((row) => row.status === 'blocked').length;

  return (
    <div className="space-y-4 pb-20">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Users Manager</h2>
            <p className="text-sm text-slate-500 font-semibold">
              Jami: {totalUsers} | Sahifa: {currentPage}/{Math.max(totalPages, 1)} | Bu sahifada admin: {pageAdmins}, blok: {pageBlocked}
            </p>
          </div>
          <button
            onClick={() => void loadUsers()}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
            Yangilash
          </button>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Telefon, ism yoki telegram ID boyicha qidiring..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-sm outline-none focus:bg-white focus:border-red-400"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'all' | UserRole)}
            className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm font-semibold outline-none focus:border-red-400"
          >
            <option value="all">Barcha rollar</option>
            <option value="admin">Admin</option>
            <option value="customer">Customer</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | UserStatus)}
            className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm font-semibold outline-none focus:border-red-400"
          >
            <option value="all">Barcha statuslar</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
          <select
            value={String(pageSize)}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm font-semibold outline-none focus:border-red-400"
          >
            <option value="10">10 / page</option>
            <option value="20">20 / page</option>
            <option value="50">50 / page</option>
          </select>
        </div>
      </div>

      {selectedPhones.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
          <div className="text-sm font-bold text-slate-700">
            Tanlandi: {selectedPhones.length} ta user
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void bulkSetRole('admin')}
              disabled={bulkUpdating}
              className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-bold disabled:opacity-60"
            >
              Bulk: Admin qilish
            </button>
            <button
              onClick={() => void bulkSetRole('customer')}
              disabled={bulkUpdating}
              className="px-3 py-2 rounded-lg bg-slate-700 text-white text-sm font-bold disabled:opacity-60"
            >
              Bulk: Customer qilish
            </button>
            <button
              onClick={() => void bulkSetStatus('active')}
              disabled={bulkUpdating}
              className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-bold disabled:opacity-60"
            >
              Bulk: Aktiv
            </button>
            <button
              onClick={() => void bulkSetStatus('blocked')}
              disabled={bulkUpdating}
              className="px-3 py-2 rounded-lg bg-yellow-600 text-white text-sm font-bold disabled:opacity-60"
            >
              Bulk: Block
            </button>
            <button
              onClick={() => setSelectedPhones([])}
              disabled={bulkUpdating}
              className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-bold disabled:opacity-60"
            >
              Tanlovni tozalash
            </button>
          </div>
          {bulkUpdating && (
            <div className="text-xs text-slate-500 inline-flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" />
              Bulk amal bajarilmoqda...
            </div>
          )}
        </div>
      )}

      {!!error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="space-y-3">
        {users.length > 0 && (
          <div className="bg-white border border-slate-100 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={pageAllSelected}
                onChange={toggleSelectCurrentPage}
                className="w-4 h-4 accent-red-600"
              />
              Joriy sahifadagilarni tanlash
            </label>
            <div className="text-xs text-slate-500">
              Korsatilmoqda: {users.length} / {totalUsers}
            </div>
          </div>
        )}

        {loading && users.length === 0 && (
          <div className="bg-white p-10 rounded-2xl border border-slate-100 text-center text-slate-400 font-semibold inline-flex items-center justify-center w-full gap-2">
            <Loader2 size={16} className="animate-spin" />
            Yuklanmoqda...
          </div>
        )}

        {!loading && users.length === 0 && (
          <div className="bg-white p-10 rounded-2xl border border-slate-100 text-center text-slate-400 font-semibold">
            Foydalanuvchilar topilmadi.
          </div>
        )}

        {users.map((row) => {
          const isRoleUpdating = updatingKey === `${row.phone}:role`;
          const isStatusUpdating = updatingKey === `${row.phone}:status`;

          return (
            <div key={row.phone} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <div className="flex flex-wrap justify-between gap-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected(row.phone)}
                    onChange={() => toggleSelect(row.phone)}
                    className="w-4 h-4 accent-red-600 mt-1"
                  />
                  <div>
                    <div className="font-black text-slate-900">{row.name}</div>
                    <div className="text-sm text-slate-500 font-semibold">{row.phone}</div>
                    {typeof row.telegramId === 'number' && (
                      <div className="text-xs text-slate-400 mt-0.5">TG ID: {row.telegramId}</div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${roleBadge[row.role]}`}>
                    {row.role}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${statusBadge[row.status]}`}>
                    {row.status}
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3 mt-4">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Role
                  <div className="mt-1 relative">
                    <select
                      value={row.role}
                      onChange={(e) => void handleRoleChange(row.phone, e.target.value as UserRole)}
                      disabled={isRoleUpdating || bulkUpdating}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm font-semibold outline-none focus:border-red-400 disabled:opacity-70"
                    >
                      <option value="customer">customer</option>
                      <option value="admin">admin</option>
                    </select>
                    {isRoleUpdating && (
                      <Loader2 size={14} className="animate-spin absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    )}
                  </div>
                </label>

                <label className="text-xs font-bold text-slate-500 uppercase">
                  Status
                  <div className="mt-1 relative">
                    <select
                      value={row.status}
                      onChange={(e) => void handleStatusChange(row.phone, e.target.value as UserStatus)}
                      disabled={isStatusUpdating || bulkUpdating}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm font-semibold outline-none focus:border-red-400 disabled:opacity-70"
                    >
                      <option value="active">active</option>
                      <option value="blocked">blocked</option>
                    </select>
                    {isStatusUpdating && (
                      <Loader2 size={14} className="animate-spin absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    )}
                  </div>
                </label>
              </div>

              <div className="mt-3 text-xs text-slate-400 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1"><ShieldCheck size={12} /> Updated: {new Date(row.updatedAt).toLocaleString()}</span>
                {row.lastLoginAt && <span className="inline-flex items-center gap-1"><UserCheck size={12} /> Last login: {new Date(row.lastLoginAt).toLocaleString()}</span>}
                {row.status === 'blocked' && <span className="inline-flex items-center gap-1 text-yellow-700"><UserX size={12} /> Bloklangan</span>}
              </div>
            </div>
          );
        })}
      </div>

      {totalUsers > 0 && (
        <div className="bg-white border border-slate-100 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-slate-500">
            Sahifa {currentPage} / {Math.max(totalPages, 1)}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage <= 1 || loading}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 disabled:opacity-50"
            >
              Oldingi
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(Math.max(totalPages, 1), prev + 1))}
              disabled={currentPage >= Math.max(totalPages, 1) || loading}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 disabled:opacity-50"
            >
              Keyingi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
