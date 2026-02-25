import React from 'react';
import { useOrders } from '../../context/OrderContext';
import { Order } from '../../types';
import { AlertCircle, Clock, Loader2, MapPin, Phone, Search } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

type OrderFilter = 'all' | 'new' | 'in_progress' | 'completed';

const statusLabel: Record<Order['status'], string> = {
  new: 'Yangi',
  cooking: 'Tayyorlanmoqda',
  delivering: 'Yetkazilmoqda',
  completed: 'Yakunlangan',
};

const statusClass: Record<Order['status'], string> = {
  new: 'bg-blue-100 text-blue-700',
  cooking: 'bg-orange-100 text-orange-700',
  delivering: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
};

const AdminOrders = () => {
  const { orders, updateOrderStatus } = useOrders();
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState<OrderFilter>('all');
  const [updatingKey, setUpdatingKey] = React.useState<string>('');
  const [actionError, setActionError] = React.useState('');

  const matchesFilter = (order: Order) => {
    if (filter === 'all') return true;
    if (filter === 'new') return order.status === 'new';
    if (filter === 'completed') return order.status === 'completed';
    return order.status === 'cooking' || order.status === 'delivering';
  };

  const visibleOrders = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (!matchesFilter(order)) return false;
      if (!term) return true;

      const haystack = [
        order.id,
        order.customerName,
        order.phone,
        order.address,
        ...order.items.map((item) => item.name),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [orders, query, filter]);

  const visibleTotal = visibleOrders.reduce((sum, order) => sum + order.total, 0);

  const handleStatusChange = async (orderId: string, status: Order['status']) => {
    setActionError('');
    const key = `${orderId}:${status}`;
    setUpdatingKey(key);
    const ok = await updateOrderStatus(orderId, status);
    if (!ok) setActionError('Buyurtma statusini yangilashda xatolik yuz berdi.');
    setUpdatingKey('');
  };

  const filterItems: Array<{ id: OrderFilter; label: string; count: number }> = [
    { id: 'all', label: 'Barchasi', count: orders.length },
    { id: 'new', label: 'Yangi', count: orders.filter((o) => o.status === 'new').length },
    {
      id: 'in_progress',
      label: 'Jarayonda',
      count: orders.filter((o) => o.status === 'cooking' || o.status === 'delivering').length,
    },
    { id: 'completed', label: 'Yakunlangan', count: orders.filter((o) => o.status === 'completed').length },
  ];

  const OrderCard: React.FC<{ order: Order }> = ({ order }) => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-black text-lg text-slate-900">#{order.id}</h3>
          <p className="text-sm text-slate-600 font-semibold">{order.customerName}</p>
          <p className="text-xs text-slate-400">{new Date(order.date).toLocaleString()}</p>
        </div>
        <div className="text-right">
          <span className="font-bold text-red-600 block">{formatCurrency(order.total)}</span>
          <span className={`inline-block px-2 py-1 rounded text-[11px] font-bold mt-1 ${statusClass[order.status]}`}>
            {statusLabel[order.status]}
          </span>
        </div>
      </div>

      <div className="space-y-1 mb-3">
        {!!order.phone && (
          <div className="flex items-center text-sm text-slate-600 space-x-2">
            <Phone size={14} /> <span>{order.phone}</span>
          </div>
        )}
        {!!order.address && (
          <div className="flex items-center text-sm text-slate-600 space-x-2">
            <MapPin size={14} /> <span className="line-clamp-1">{order.address}</span>
          </div>
        )}
      </div>

      <div className="bg-slate-50 p-2 rounded-lg mb-3">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm text-slate-700 gap-4">
            <span>{item.quantity}x {item.name}</span>
            <span className="text-slate-500">{formatCurrency(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="flex space-x-2 overflow-x-auto hide-scrollbar">
        {(['new', 'cooking', 'delivering', 'completed'] as const).map((status) => (
          <button
            key={status}
            onClick={() => void handleStatusChange(order.id, status)}
            disabled={order.status === status || updatingKey === `${order.id}:${status}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase whitespace-nowrap transition-all border flex items-center gap-1.5 ${
              order.status === status
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-500 border-slate-200 hover:border-red-200 hover:text-red-600'
            }`}
          >
            {updatingKey === `${order.id}:${status}` && <Loader2 size={12} className="animate-spin" />}
            {status}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="pb-20 space-y-4">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900">Order Manager</h2>
          <div className="text-sm text-slate-500 font-semibold">
            {visibleOrders.length} ta buyurtma • {formatCurrency(visibleTotal)}
          </div>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ID, ism, telefon, manzil bo‘yicha qidiring..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-sm outline-none focus:bg-white focus:border-red-400"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {filterItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                filter === item.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
            >
              {item.label} ({item.count})
            </button>
          ))}
        </div>
      </div>

      {!!actionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 flex items-center gap-2">
          <AlertCircle size={16} />
          {actionError}
        </div>
      )}
      
      {visibleOrders.length === 0 ? (
        <div className="text-center py-20 opacity-50">
          <Clock size={48} className="mx-auto mb-4 text-slate-400" />
          <p>Mos buyurtma topilmadi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
