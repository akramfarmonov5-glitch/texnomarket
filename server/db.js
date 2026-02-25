import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'texnomarket.db');

const ORDER_STATUSES = new Set(['new', 'cooking', 'delivering', 'completed']);
const USER_ROLES = new Set(['customer', 'admin']);
const USER_STATUSES = new Set(['active', 'blocked']);
const DEFAULT_CATEGORIES = [
  { id: 'phones', label: 'Telefonlar' },
  { id: 'laptops', label: 'Noutbuklar' },
  { id: 'audio', label: 'Audio' },
  { id: 'watches', label: 'Soatlar' },
  { id: 'accessories', label: 'Aksessuarlar' },
];

const ensureDbDir = () => {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
};

const parseJson = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

ensureDbDir();
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  phone TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  telegram_id INTEGER,
  role TEXT NOT NULL DEFAULT 'customer',
  status TEXT NOT NULL DEFAULT 'active',
  last_login_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price INTEGER NOT NULL,
  images_json TEXT NOT NULL,
  category TEXT NOT NULL,
  popular INTEGER NOT NULL DEFAULT 0,
  seo_keywords TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  items_json TEXT NOT NULL,
  total INTEGER NOT NULL,
  status TEXT NOT NULL,
  date TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_phone TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  details_json TEXT,
  created_at TEXT NOT NULL
);
`);

const ensureUsersSchema = () => {
  const cols = db.prepare('PRAGMA table_info(users)').all();
  const names = new Set(cols.map((col) => col.name));

  if (!names.has('role')) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'customer'");
  }
  if (!names.has('status')) {
    db.exec("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
  }
  if (!names.has('last_login_at')) {
    db.exec('ALTER TABLE users ADD COLUMN last_login_at TEXT');
  }
};

ensureUsersSchema();
const slugToLabel = (slug) =>
  String(slug || '')
    .trim()
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
const ensureCategoriesSeed = () => {
  const stamp = new Date().toISOString();
  const insertCategory = db.prepare(`
    INSERT INTO categories (id, label, created_at, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      label = COALESCE(NULLIF(excluded.label, ''), categories.label),
      updated_at = excluded.updated_at
  `);

  DEFAULT_CATEGORIES.forEach((item) => {
    insertCategory.run(item.id, item.label, stamp, stamp);
  });

  const productCategories = db.prepare('SELECT DISTINCT category FROM products').all();
  productCategories.forEach((row) => {
    const id = String(row?.category || '').trim();
    if (!id) return;
    insertCategory.run(id, slugToLabel(id), stamp, stamp);
  });
};

ensureCategoriesSeed();

const productRowToDto = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  price: row.price,
  images: parseJson(row.images_json, []),
  category: row.category,
  popular: !!row.popular,
  seoKeywords: row.seo_keywords || '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
const categoryRowToDto = (row) => ({
  id: row.id,
  label: row.label,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const orderRowToDto = (row) => ({
  id: row.id,
  items: parseJson(row.items_json, []),
  total: row.total,
  status: row.status,
  date: row.date,
  address: row.address,
  phone: row.phone,
  customerName: row.customer_name,
});

const userRowToDto = (row) => ({
  phone: row.phone,
  name: row.name,
  telegramId: typeof row.telegram_id === 'number' ? row.telegram_id : undefined,
  role: row.role || 'customer',
  status: row.status || 'active',
  lastLoginAt: row.last_login_at || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const auditRowToDto = (row) => ({
  id: row.id,
  actorPhone: row.actor_phone,
  action: row.action,
  entity: row.entity,
  entityId: row.entity_id || '',
  details: parseJson(row.details_json || '{}', {}),
  createdAt: row.created_at,
});

const now = () => new Date().toISOString();
const clampInt = (value, min, max, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
};
const toLikePattern = (value) => `%${String(value).replace(/[\\%_]/g, '\\$&')}%`;
const categoryExistsStmt = db.prepare('SELECT 1 AS ok FROM categories WHERE id = ? LIMIT 1');

export const productCategoryAllowed = (category) =>
  !!category && !!categoryExistsStmt.get(String(category).trim());
export const orderStatusAllowed = (status) => ORDER_STATUSES.has(status);
export const userRoleAllowed = (role) => USER_ROLES.has(role);
export const userStatusAllowed = (status) => USER_STATUSES.has(status);
export const dbGetCategories = () => {
  const stmt = db.prepare(
    'SELECT id, label, created_at, updated_at FROM categories ORDER BY label COLLATE NOCASE ASC'
  );
  return stmt.all().map(categoryRowToDto);
};
export const dbCreateCategory = ({ id, label }) => {
  const stamp = now();
  db.prepare(`
    INSERT INTO categories (id, label, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `).run(id, label, stamp, stamp);

  const row = db
    .prepare('SELECT id, label, created_at, updated_at FROM categories WHERE id = ?')
    .get(id);
  return row ? categoryRowToDto(row) : null;
};
export const dbUpdateCategoryLabel = (id, label) => {
  const stamp = now();
  const result = db
    .prepare('UPDATE categories SET label = ?, updated_at = ? WHERE id = ?')
    .run(label, stamp, id);
  if (result.changes === 0) return null;
  const row = db
    .prepare('SELECT id, label, created_at, updated_at FROM categories WHERE id = ?')
    .get(id);
  return row ? categoryRowToDto(row) : null;
};
export const dbDeleteCategory = (id) => {
  const result = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  return result.changes > 0;
};
export const dbMoveProductsToCategory = ({ fromId, toId }) => {
  if (!fromId || !toId || fromId === toId) return 0;
  const stamp = now();
  const result = db
    .prepare('UPDATE products SET category = ?, updated_at = ? WHERE category = ?')
    .run(toId, stamp, fromId);
  return Number(result.changes || 0);
};
export const dbCategoryProductsCount = (id) => {
  const row = db.prepare('SELECT COUNT(*) AS total FROM products WHERE category = ?').get(id);
  return Number(row?.total || 0);
};

export const dbGetProducts = () => {
  const stmt = db.prepare(
    'SELECT id, name, description, price, images_json, category, popular, seo_keywords, created_at, updated_at FROM products ORDER BY created_at DESC'
  );
  return stmt.all().map(productRowToDto);
};

export const dbCreateOrUpdateProduct = (product) => {
  const stamp = now();
  db.prepare(`
    INSERT INTO products (id, name, description, price, images_json, category, popular, seo_keywords, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      price = excluded.price,
      images_json = excluded.images_json,
      category = excluded.category,
      popular = excluded.popular,
      seo_keywords = excluded.seo_keywords,
      updated_at = excluded.updated_at
  `).run(
    product.id,
    product.name,
    product.description,
    product.price,
    JSON.stringify(product.images || []),
    product.category,
    product.popular ? 1 : 0,
    product.seoKeywords || '',
    stamp,
    stamp
  );

  return product;
};

export const dbDeleteProduct = (id) => {
  const result = db.prepare('DELETE FROM products WHERE id = ?').run(id);
  return result.changes > 0;
};

export const dbGetUserByPhone = (phone) => {
  const row = db
    .prepare(
      'SELECT phone, name, telegram_id, role, status, last_login_at, created_at, updated_at FROM users WHERE phone = ?'
    )
    .get(phone);
  return row ? userRowToDto(row) : null;
};

export const dbListUsers = () => {
  const stmt = db.prepare(
    'SELECT phone, name, telegram_id, role, status, last_login_at, created_at, updated_at FROM users ORDER BY updated_at DESC'
  );
  return stmt.all().map(userRowToDto);
};

export const dbListUsersPage = ({
  query = '',
  role = 'all',
  status = 'all',
  page = 1,
  pageSize = 20,
} = {}) => {
  const where = [];
  const params = [];

  if (userRoleAllowed(role)) {
    where.push('role = ?');
    params.push(role);
  }
  if (userStatusAllowed(status)) {
    where.push('status = ?');
    params.push(status);
  }

  const term = String(query || '').trim();
  if (term) {
    const like = toLikePattern(term);
    where.push(`(
      phone LIKE ? ESCAPE '\\'
      OR name LIKE ? ESCAPE '\\'
      OR CAST(telegram_id AS TEXT) LIKE ? ESCAPE '\\'
    )`);
    params.push(like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const safePageSize = clampInt(pageSize, 1, 100, 20);
  const requestedPage = clampInt(page, 1, Number.MAX_SAFE_INTEGER, 1);

  const totalRow = db.prepare(`SELECT COUNT(*) AS total FROM users ${whereSql}`).get(...params);
  const total = Number(totalRow?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(requestedPage, totalPages);
  const offset = (safePage - 1) * safePageSize;

  const rows = db.prepare(`
    SELECT phone, name, telegram_id, role, status, last_login_at, created_at, updated_at
    FROM users
    ${whereSql}
    ORDER BY updated_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, safePageSize, offset);

  return {
    items: rows.map(userRowToDto),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  };
};

export const dbUpsertUser = (user) => {
  const stamp = now();
  db.prepare(`
    INSERT INTO users (phone, name, telegram_id, role, status, last_login_at, created_at, updated_at)
    VALUES (?, ?, ?, 'customer', 'active', ?, ?, ?)
    ON CONFLICT(phone) DO UPDATE SET
      name = excluded.name,
      telegram_id = excluded.telegram_id,
      last_login_at = excluded.last_login_at,
      updated_at = excluded.updated_at
  `).run(user.phone, user.name || 'Customer', user.telegramId ?? null, stamp, stamp, stamp);

  return dbGetUserByPhone(user.phone);
};

export const dbSetUserRole = (phone, role) => {
  const stamp = now();
  const result = db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE phone = ?').run(role, stamp, phone);
  if (result.changes === 0) return null;
  return dbGetUserByPhone(phone);
};

export const dbSetUserStatus = (phone, status) => {
  const stamp = now();
  const result = db
    .prepare('UPDATE users SET status = ?, updated_at = ? WHERE phone = ?')
    .run(status, stamp, phone);
  if (result.changes === 0) return null;
  return dbGetUserByPhone(phone);
};

export const dbCreateOrder = (order) => {
  const stamp = now();
  db.prepare(`
    INSERT INTO orders (id, items_json, total, status, date, address, phone, customer_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    order.id,
    JSON.stringify(order.items || []),
    order.total,
    order.status,
    order.date,
    order.address,
    order.phone,
    order.customerName,
    stamp,
    stamp
  );

  return order;
};

export const dbGetOrders = ({ isAdmin, phone }) => {
  if (isAdmin) {
    const stmt = db.prepare(
      'SELECT id, items_json, total, status, date, address, phone, customer_name FROM orders ORDER BY created_at DESC'
    );
    return stmt.all().map(orderRowToDto);
  }

  if (!phone) return [];
  const stmt = db.prepare(
    'SELECT id, items_json, total, status, date, address, phone, customer_name FROM orders WHERE phone = ? ORDER BY created_at DESC'
  );
  return stmt.all(phone).map(orderRowToDto);
};

export const dbUpdateOrderStatus = (id, status) => {
  const stamp = now();
  const update = db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').run(status, stamp, id);
  if (update.changes === 0) return null;
  const row = db
    .prepare('SELECT id, items_json, total, status, date, address, phone, customer_name FROM orders WHERE id = ?')
    .get(id);
  return row ? orderRowToDto(row) : null;
};

export const dbWriteAuditLog = ({ actorPhone, action, entity, entityId, details }) => {
  const stamp = now();
  db.prepare(`
    INSERT INTO audit_logs (actor_phone, action, entity, entity_id, details_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    actorPhone,
    action,
    entity,
    entityId || '',
    JSON.stringify(details || {}),
    stamp
  );
};

export const dbGetAuditLogs = ({ limit = 200 } = {}) => {
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 200));
  const stmt = db.prepare(`
    SELECT id, actor_phone, action, entity, entity_id, details_json, created_at
    FROM audit_logs
    ORDER BY id DESC
    LIMIT ?
  `);
  return stmt.all(safeLimit).map(auditRowToDto);
};

export const dbGetAuditLogsPage = ({
  query = '',
  action = 'all',
  dateFrom = '',
  dateTo = '',
  page = 1,
  pageSize = 50,
} = {}) => {
  const where = [];
  const params = [];

  const actionValue = String(action || '').trim();
  if (actionValue && actionValue !== 'all') {
    where.push('action = ?');
    params.push(actionValue);
  }

  const fromValue = String(dateFrom || '').trim();
  if (fromValue) {
    where.push('created_at >= ?');
    params.push(fromValue);
  }

  const toValue = String(dateTo || '').trim();
  if (toValue) {
    where.push('created_at <= ?');
    params.push(toValue);
  }

  const term = String(query || '').trim();
  if (term) {
    const like = toLikePattern(term);
    where.push(`(
      actor_phone LIKE ? ESCAPE '\\'
      OR action LIKE ? ESCAPE '\\'
      OR entity LIKE ? ESCAPE '\\'
      OR entity_id LIKE ? ESCAPE '\\'
      OR details_json LIKE ? ESCAPE '\\'
    )`);
    params.push(like, like, like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const safePageSize = clampInt(pageSize, 1, 200, 50);
  const requestedPage = clampInt(page, 1, Number.MAX_SAFE_INTEGER, 1);

  const totalRow = db.prepare(`SELECT COUNT(*) AS total FROM audit_logs ${whereSql}`).get(...params);
  const total = Number(totalRow?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(requestedPage, totalPages);
  const offset = (safePage - 1) * safePageSize;

  const rows = db.prepare(`
    SELECT id, actor_phone, action, entity, entity_id, details_json, created_at
    FROM audit_logs
    ${whereSql}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `).all(...params, safePageSize, offset);

  return {
    items: rows.map(auditRowToDto),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  };
};

export const dbGetAdminStats = () => {
  const totals = db
    .prepare(
      'SELECT COUNT(*) AS total_orders, COALESCE(SUM(total), 0) AS total_revenue, SUM(CASE WHEN status != \'completed\' THEN 1 ELSE 0 END) AS active_orders FROM orders'
    )
    .get();
  const products = db.prepare('SELECT COUNT(*) AS total_products FROM products').get();
  const users = db
    .prepare(
      'SELECT COUNT(*) AS total_users, SUM(CASE WHEN status = \'blocked\' THEN 1 ELSE 0 END) AS blocked_users, SUM(CASE WHEN role = \'admin\' THEN 1 ELSE 0 END) AS admin_users FROM users'
    )
    .get();
  return {
    totalOrders: totals.total_orders || 0,
    totalRevenue: totals.total_revenue || 0,
    activeOrders: totals.active_orders || 0,
    totalProducts: products.total_products || 0,
    totalUsers: users.total_users || 0,
    blockedUsers: users.blocked_users || 0,
    adminUsers: users.admin_users || 0,
  };
};
