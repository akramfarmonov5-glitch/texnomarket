import React, { createContext, useContext, useEffect, useState } from 'react';
import { CartItem, Order } from '../types';
import { storage } from '../utils/storage';
import { useAuth } from './AuthContext';
import { api } from '../utils/api';

interface OrderContextType {
  orders: Order[];
  placeOrder: (
    items: CartItem[],
    total: number,
    address: string,
    phone: string,
    userName: string
  ) => Promise<boolean>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<boolean>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

const ORDERS_KEY = 'texno_orders';
const LEGACY_ORDERS_KEY = 'kfc_orders';

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>(() => {
    return (
      storage.get<Order[] | null>(ORDERS_KEY, null) ??
      storage.get<Order[] | null>(LEGACY_ORDERS_KEY, null) ??
      []
    );
  });

  useEffect(() => {
    storage.set(ORDERS_KEY, orders);
    storage.remove(LEGACY_ORDERS_KEY);
  }, [orders]);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      return;
    }
    let canceled = false;
    const loadOrders = async () => {
      try {
        const remoteOrders = await api.getOrders(user);
        if (!canceled) setOrders(remoteOrders);
      } catch {
        // Keep local orders if API is unreachable.
      }
    };
    void loadOrders();
    return () => {
      canceled = true;
    };
  }, [user?.phone, user?.telegramId, user?.sessionToken]);

  const placeOrder = async (
    items: CartItem[],
    total: number,
    address: string,
    phone: string,
    userName: string
  ) => {
    if (!items.length || total <= 0 || !user) return false;

    const generatedId = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 12);
    const optimisticOrder: Order = {
      id: generatedId.replace(/-/g, '').slice(0, 10).toUpperCase(),
      items,
      total,
      status: 'new',
      date: new Date().toISOString(),
      address,
      phone,
      customerName: userName,
    };

    setOrders((prev) => [optimisticOrder, ...prev]);
    try {
      const savedOrder = await api.createOrder(optimisticOrder, user);
      setOrders((prev) => prev.map((order) => (order.id === optimisticOrder.id ? savedOrder : order)));
      return true;
    } catch {
      setOrders((prev) => prev.filter((order) => order.id !== optimisticOrder.id));
      return false;
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    let previous: Order[] = [];
    setOrders((prev) => {
      previous = prev;
      return prev.map((order) => (order.id === orderId ? { ...order, status } : order));
    });
    try {
      await api.updateOrderStatus(orderId, status, user);
      return true;
    } catch {
      setOrders(previous);
      return false;
    }
  };

  return (
    <OrderContext.Provider value={{ orders, placeOrder, updateOrderStatus }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) throw new Error('useOrders must be used within OrderProvider');
  return context;
};
