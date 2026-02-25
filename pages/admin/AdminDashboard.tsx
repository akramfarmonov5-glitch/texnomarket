import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  DollarSign,
  Loader2,
  Package,
  RefreshCcw,
  ShoppingBag,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useOrders } from '../../context/OrderContext';
import { useMenu } from '../../context/MenuContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import { formatCurrency } from '../../utils/format';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}

interface AdminStats {
  totalOrders: number;
  totalRevenue: number;
  activeOrders: number;
  totalProducts: number;
  totalUsers: number;
  blockedUsers: number;
  adminUsers: number;
}

const parseApiError = (error: unknown): string => {
  if (!(error instanceof Error)) return 'Statistikani olishda xatolik yuz berdi.';
  try {
    const parsed = JSON.parse(error.message) as { error?: string };
    if (parsed?.error) return parsed.error;
  } catch {
    // Non-JSON error text.
  }
  return error.message || 'Statistikani olishda xatolik yuz berdi.';
};

const AdminDashboard: React.FC = () => {
  const { orders } = useOrders();
  const { products } = useMenu();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [stats, setStats] = React.useState<AdminStats | null>(null);

  const fallbackStats = React.useMemo<AdminStats>(
    () => ({
      totalOrders: orders.length,
      totalRevenue: orders.reduce((acc, order) => acc + order.total, 0),
      activeOrders: orders.filter((o) => o.status !== 'completed').length,
      totalProducts: products.length,
      totalUsers: 0,
      blockedUsers: 0,
      adminUsers: 0,
    }),
    [orders, products.length]
  );

  const currentStats = stats || fallbackStats;

  const statusSummary = React.useMemo(
    () => ({
      new: orders.filter((o) => o.status === 'new').length,
      cooking: orders.filter((o) => o.status === 'cooking').length,
      delivering: orders.filter((o) => o.status === 'delivering').length,
      completed: orders.filter((o) => o.status === 'completed').length,
    }),
    [orders]
  );

  const fetchStats = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const remote = await api.getAdminStats(user);
      setStats(remote);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const StatCard = ({ title, value, icon: Icon, color }: StatCardProps) => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
        <Icon className="text-white" size={24} />
      </div>
      <div>
        <p className="text-slate-500 text-xs font-bold uppercase">{title}</p>
        <h3 className="text-xl font-black text-slate-900">{value}</h3>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-500 font-semibold">Asosiy korsatkichlar va tezkor boshqaruv</p>
        </div>
        <button
          onClick={() => void fetchStats()}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
          Yangilash
        </button>
      </div>

      {!!error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <StatCard title="Total Revenue" value={formatCurrency(currentStats.totalRevenue)} icon={DollarSign} color="bg-green-500" />
        <StatCard title="Total Orders" value={currentStats.totalOrders} icon={ShoppingBag} color="bg-blue-500" />
        <StatCard title="Active Orders" value={currentStats.activeOrders} icon={Package} color="bg-orange-500" />
        <StatCard title="Menu Items" value={currentStats.totalProducts} icon={TrendingUp} color="bg-purple-500" />
        <StatCard title="Total Users" value={currentStats.totalUsers} icon={Users} color="bg-slate-700" />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <h3 className="font-bold text-slate-800 mb-3">Order holati</h3>
          <div className="space-y-2 text-sm font-semibold">
            <div className="flex justify-between"><span className="text-blue-600">Yangi</span><span>{statusSummary.new}</span></div>
            <div className="flex justify-between"><span className="text-orange-600">Tayyorlanmoqda</span><span>{statusSummary.cooking}</span></div>
            <div className="flex justify-between"><span className="text-purple-600">Yetkazilmoqda</span><span>{statusSummary.delivering}</span></div>
            <div className="flex justify-between"><span className="text-green-600">Yakunlangan</span><span>{statusSummary.completed}</span></div>
          </div>
          <button
            onClick={() => navigate('/admin/orders')}
            className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700"
          >
            Buyurtmalarni ochish <ArrowRight size={14} />
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <h3 className="font-bold text-slate-800 mb-3">Katalog</h3>
          <p className="text-sm text-slate-500">
            Jami <b>{currentStats.totalProducts}</b> ta mahsulot mavjud. Yangi mahsulot qoshish yoki narxlarni yangilash mumkin.
          </p>
          <button
            onClick={() => navigate('/admin/menu')}
            className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700"
          >
            Katalogni boshqarish <ArrowRight size={14} />
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <h3 className="font-bold text-slate-800 mb-3">Foydalanuvchilar</h3>
          <p className="text-sm text-slate-500">
            Jami <b>{currentStats.totalUsers}</b> foydalanuvchi, shundan <b>{currentStats.adminUsers}</b> admin va <b>{currentStats.blockedUsers}</b> bloklangan.
          </p>
          <button
            onClick={() => navigate('/admin/users')}
            className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700"
          >
            Users manager <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <h3 className="font-bold text-slate-800 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {orders.slice(0, 5).map((order) => (
            <div key={order.id} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2 last:border-0">
              <div>
                <span className="font-bold block">Order #{order.id}</span>
                <span className="text-xs text-slate-500">{new Date(order.date).toLocaleString()}</span>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                  order.status === 'new'
                    ? 'bg-blue-100 text-blue-600'
                    : order.status === 'cooking'
                      ? 'bg-orange-100 text-orange-600'
                      : order.status === 'delivering'
                        ? 'bg-purple-100 text-purple-600'
                        : 'bg-green-100 text-green-600'
                }`}
              >
                {order.status}
              </span>
            </div>
          ))}
          {orders.length === 0 && <p className="text-slate-400 text-sm">No orders yet.</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
