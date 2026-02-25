import React from 'react';
import { AlertCircle, Clock3, Download, Loader2, RefreshCcw, Search } from 'lucide-react';
import { AuditLogEntry } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';

const actionLabel: Record<string, string> = {
  category_create: 'Kategoriya qo`shildi',
  category_update: 'Kategoriya yangilandi',
  category_delete: 'Kategoriya o`chirildi',
  ai_seo_generate: 'AI SEO yaratdi',
  product_create: 'Mahsulot qoshildi',
  product_update: 'Mahsulot yangilandi',
  product_delete: 'Mahsulot ochirildi',
  order_status_update: 'Buyurtma statusi yangilandi',
  user_role_update: 'User roli yangilandi',
  user_status_update: 'User statusi yangilandi',
};

const actionBadge: Record<string, string> = {
  category_create: 'bg-emerald-100 text-emerald-700',
  category_update: 'bg-sky-100 text-sky-700',
  category_delete: 'bg-rose-100 text-rose-700',
  ai_seo_generate: 'bg-violet-100 text-violet-700',
  product_create: 'bg-green-100 text-green-700',
  product_update: 'bg-blue-100 text-blue-700',
  product_delete: 'bg-red-100 text-red-700',
  order_status_update: 'bg-purple-100 text-purple-700',
  user_role_update: 'bg-orange-100 text-orange-700',
  user_status_update: 'bg-yellow-100 text-yellow-700',
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

const escapeCsv = (value: unknown) => {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
};

const buildCsvContent = (rows: AuditLogEntry[]) => {
  const header = ['id', 'created_at', 'actor_phone', 'action', 'entity', 'entity_id', 'details_json'];
  const lines = rows.map((row) =>
    [
      escapeCsv(row.id),
      escapeCsv(row.createdAt),
      escapeCsv(row.actorPhone),
      escapeCsv(row.action),
      escapeCsv(row.entity),
      escapeCsv(row.entityId),
      escapeCsv(JSON.stringify(row.details || {})),
    ].join(',')
  );
  return [header.join(','), ...lines].join('\n');
};

const triggerCsvDownload = (content: string, fileName: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const AdminAudit: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = React.useState<AuditLogEntry[]>([]);
  const [totalLogs, setTotalLogs] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [exportingAll, setExportingAll] = React.useState(false);
  const [error, setError] = React.useState('');
  const [queryInput, setQueryInput] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [actionFilter, setActionFilter] = React.useState('all');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [pageSize, setPageSize] = React.useState(20);
  const [currentPage, setCurrentPage] = React.useState(1);

  const dateRangeInvalid = !!dateFrom && !!dateTo && dateFrom > dateTo;

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(queryInput.trim());
      setCurrentPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [actionFilter, pageSize, dateFrom, dateTo]);

  const loadLogs = React.useCallback(async () => {
    if (!user) return;

    if (dateRangeInvalid) {
      setError('Sana oraligi notogri: Boshlanish sanasi tugash sanasidan katta bolmasligi kerak.');
      setLogs([]);
      setTotalLogs(0);
      setTotalPages(1);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await api.getAuditLogs(user, {
        query,
        action: actionFilter,
        dateFrom,
        dateTo,
        page: currentPage,
        pageSize,
      });
      setLogs(result.items);
      setTotalLogs(result.total);
      setTotalPages(result.totalPages || 1);
      if (result.page !== currentPage) setCurrentPage(result.page);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }, [actionFilter, currentPage, dateFrom, dateRangeInvalid, dateTo, pageSize, query, user]);

  React.useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const actions = React.useMemo(() => {
    const unique = new Set<string>(Object.keys(actionLabel));
    logs.forEach((row) => unique.add(row.action));
    return Array.from(unique);
  }, [logs]);

  const exportCurrentPageCsv = () => {
    if (logs.length === 0) return;
    const content = buildCsvContent(logs);
    triggerCsvDownload(content, `audit-page-${currentPage}-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportAllFilteredCsv = async () => {
    if (!user || totalLogs === 0 || exportingAll) return;
    if (dateRangeInvalid) {
      setError('Sana oraligi notogri: Boshlanish sanasi tugash sanasidan katta bolmasligi kerak.');
      return;
    }

    setExportingAll(true);
    setError('');
    try {
      const batchSize = 200;
      let page = 1;
      let pages = 1;
      const allRows: AuditLogEntry[] = [];

      do {
        const result = await api.getAuditLogs(user, {
          query,
          action: actionFilter,
          dateFrom,
          dateTo,
          page,
          pageSize: batchSize,
        });
        allRows.push(...result.items);
        pages = result.totalPages || 1;
        page += 1;
      } while (page <= pages);

      if (allRows.length === 0) {
        setError('Eksport uchun malumot topilmadi.');
        return;
      }

      const content = buildCsvContent(allRows);
      triggerCsvDownload(content, `audit-filtered-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setExportingAll(false);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Audit Log</h2>
            <p className="text-sm text-slate-500 font-semibold">
              Jami yozuvlar: {totalLogs} | Sahifa: {currentPage}/{Math.max(totalPages, 1)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportCurrentPageCsv}
              disabled={logs.length === 0 || loading || exportingAll}
              className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
            >
              <Download size={16} />
              CSV (sahifa)
            </button>
            <button
              onClick={() => void exportAllFilteredCsv()}
              disabled={totalLogs === 0 || loading || exportingAll}
              className="inline-flex items-center gap-2 bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
            >
              {exportingAll ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              CSV (filter)
            </button>
            <button
              onClick={() => void loadLogs()}
              disabled={loading || exportingAll}
              className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
              Yangilash
            </button>
          </div>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Actor, action, entity yoki details boyicha qidiring..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-sm outline-none focus:bg-white focus:border-red-400"
          />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm font-semibold outline-none focus:border-red-400"
          >
            <option value="all">Barcha actionlar</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {actionLabel[action] || action}
              </option>
            ))}
          </select>

          <select
            value={String(pageSize)}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm font-semibold outline-none focus:border-red-400"
          >
            <option value="20">20 / page</option>
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm font-semibold outline-none focus:border-red-400"
            title="Boshlanish sanasi"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm font-semibold outline-none focus:border-red-400"
            title="Tugash sanasi"
          />

          <button
            onClick={() => {
              setDateFrom('');
              setDateTo('');
            }}
            className="bg-slate-100 border border-slate-200 rounded-xl py-2 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            Sana filterni tozalash
          </button>
        </div>
      </div>

      {!!error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {loading && logs.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-slate-100 text-center text-slate-400 font-semibold inline-flex items-center justify-center w-full gap-2">
          <Loader2 size={16} className="animate-spin" />
          Yuklanmoqda...
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-slate-100 text-center text-slate-400 font-semibold">
          Audit log bosh.
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((row) => {
            const detailsText = JSON.stringify(row.details || {}, null, 2);
            return (
              <div key={row.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-black text-slate-900">{actionLabel[row.action] || row.action}</div>
                    <div className="text-xs text-slate-500 font-semibold mt-1">
                      Actor: {row.actorPhone} | Target: {row.entity}:{row.entityId || '-'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${actionBadge[row.action] || 'bg-slate-100 text-slate-700'}`}>
                      {row.action}
                    </span>
                    <div className="text-xs text-slate-400 mt-2 inline-flex items-center gap-1">
                      <Clock3 size={12} />
                      {new Date(row.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 overflow-x-auto">
{detailsText}
                </pre>
              </div>
            );
          })}
        </div>
      )}

      {totalLogs > 0 && (
        <div className="bg-white border border-slate-100 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-slate-500">
            Sahifa {currentPage} / {Math.max(totalPages, 1)}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage <= 1 || loading || exportingAll}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 disabled:opacity-50"
            >
              Oldingi
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(Math.max(totalPages, 1), prev + 1))}
              disabled={currentPage >= Math.max(totalPages, 1) || loading || exportingAll}
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

export default AdminAudit;
