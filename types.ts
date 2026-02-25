export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[]; // Changed from single string to array
  category: string;
  popular?: boolean;
  seoKeywords?: string; // New field for SEO tags
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  label: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export type UserRole = 'customer' | 'admin';
export type UserStatus = 'active' | 'blocked';

export interface User {
  phone: string;
  name?: string;
  addresses?: Address[];
  telegramId?: number; // Added for Telegram integration
  role?: UserRole;
  status?: UserStatus;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
  sessionToken?: string;
}

export interface Address {
  label: string; // e.g., "Home"
  lat: number;
  lng: number;
  details: string; // Floor, entrance
}

export type OrderStatus = 'new' | 'cooking' | 'delivering' | 'completed';

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  date: string;
  address: string;
  phone: string;
  customerName: string;
}

export interface AdminUser extends User {
  phone: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: number;
  actorPhone: string;
  action: string;
  entity: string;
  entityId: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type ToolFn = (args: Record<string, unknown>) => unknown;

// Add Telegram Type Definition
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
        };
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
      };
    };
  }
}
