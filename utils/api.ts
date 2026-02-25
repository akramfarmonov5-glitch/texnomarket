import {
  AdminUser,
  AuditLogEntry,
  Category,
  Order,
  PaginatedResponse,
  Product,
  User,
  UserRole,
  UserStatus,
} from '../types';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

type ApiOptions = RequestInit & { user?: User | null };

const buildHeaders = (options: ApiOptions) => {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.user?.sessionToken) {
    headers.set('Authorization', `Bearer ${options.user.sessionToken}`);
  }
  return headers;
};

const buildQueryString = (params: Record<string, string | number | undefined>) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    qs.set(key, String(value));
  });
  const encoded = qs.toString();
  return encoded ? `?${encoded}` : '';
};

const request = async <T>(path: string, options: ApiOptions = {}): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: buildHeaders(options),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
};

export const api = {
  health: () => request<{ ok: boolean; now: string }>('/health', { method: 'GET' }),

  login: (payload: { phone: string; name?: string; telegramId?: number; adminCode?: string }) =>
    request<{ user: User; isAdmin: boolean; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getSession: (user?: User | null) =>
    request<{ user: User; isAdmin: boolean }>('/api/auth/session', {
      method: 'GET',
      user,
    }),

  askAssistant: (payload: { message: string; menu: Array<{ id: string; name: string; price: number }> }) =>
    request<{ answer: string }>('/api/ai/assistant', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  generateSeo: (payload: { id?: string; name: string; category?: string }, user?: User | null) =>
    request<{ description: string; keywords: string }>('/api/ai/seo', {
      method: 'POST',
      user,
      body: JSON.stringify(payload),
    }),

  getProducts: () => request<Product[]>('/api/products', { method: 'GET' }),

  getCategories: () => request<Category[]>('/api/categories', { method: 'GET' }),

  createCategory: (payload: { label: string }, user?: User | null) =>
    request<Category>('/api/categories', {
      method: 'POST',
      user,
      body: JSON.stringify(payload),
    }),

  updateCategory: (id: string, payload: { label: string }, user?: User | null) =>
    request<Category>(`/api/categories/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      user,
      body: JSON.stringify(payload),
    }),

  deleteCategory: (id: string, user?: User | null, moveToCategoryId?: string) =>
    request<{ ok: boolean; movedProducts?: number; moveTo?: string | null }>(
      `/api/categories/${encodeURIComponent(id)}${buildQueryString({
        moveTo: moveToCategoryId,
      })}`,
      {
        method: 'DELETE',
        user,
      }
    ),

  createProduct: (product: Product, user?: User | null) =>
    request<Product>('/api/products', {
      method: 'POST',
      user,
      body: JSON.stringify(product),
    }),

  updateProduct: (id: string, product: Product, user?: User | null) =>
    request<Product>(`/api/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      user,
      body: JSON.stringify(product),
    }),

  deleteProduct: (id: string, user?: User | null) =>
    request<{ ok: boolean }>(`/api/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      user,
    }),

  getOrders: (user?: User | null) =>
    request<Order[]>('/api/orders', {
      method: 'GET',
      user,
    }),

  createOrder: (
    payload: Pick<Order, 'id' | 'items' | 'total' | 'status' | 'date' | 'address' | 'phone' | 'customerName'>,
    user?: User | null
  ) =>
    request<Order>('/api/orders', {
      method: 'POST',
      user,
      body: JSON.stringify(payload),
    }),

  updateOrderStatus: (id: string, status: Order['status'], user?: User | null) =>
    request<Order>(`/api/orders/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      user,
      body: JSON.stringify({ status }),
    }),

  getAdminStats: (user?: User | null) =>
    request<{
      totalOrders: number;
      totalRevenue: number;
      activeOrders: number;
      totalProducts: number;
      totalUsers: number;
      blockedUsers: number;
      adminUsers: number;
    }>(
      '/api/admin/stats',
      { method: 'GET', user }
    ),

  getAdminUsers: (
    user?: User | null,
    params: {
      query?: string;
      role?: 'all' | UserRole;
      status?: 'all' | UserStatus;
      page?: number;
      pageSize?: number;
    } = {}
  ) =>
    request<PaginatedResponse<AdminUser>>(
      `/api/admin/users${buildQueryString({
        query: params.query,
        role: params.role,
        status: params.status,
        page: params.page,
        pageSize: params.pageSize,
      })}`,
      {
        method: 'GET',
        user,
      }
    ),

  updateAdminUserRole: (phone: string, role: UserRole, user?: User | null) =>
    request<AdminUser>(`/api/admin/users/${encodeURIComponent(phone)}/role`, {
      method: 'PATCH',
      user,
      body: JSON.stringify({ role }),
    }),

  updateAdminUserStatus: (phone: string, status: UserStatus, user?: User | null) =>
    request<AdminUser>(`/api/admin/users/${encodeURIComponent(phone)}/status`, {
      method: 'PATCH',
      user,
      body: JSON.stringify({ status }),
    }),

  getAuditLogs: (
    user?: User | null,
    params: {
      query?: string;
      action?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      pageSize?: number;
      limit?: number;
    } = {}
  ) =>
    request<PaginatedResponse<AuditLogEntry>>(
      `/api/admin/audit-logs${buildQueryString({
        query: params.query,
        action: params.action,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        page: params.page,
        pageSize: params.pageSize,
        limit: params.limit,
      })}`,
      {
        method: 'GET',
        user,
      }
    ),
};
