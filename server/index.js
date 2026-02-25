import http from 'node:http';
import { URL } from 'node:url';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import {
  dbCategoryProductsCount,
  dbCreateCategory,
  dbCreateOrder,
  dbCreateOrUpdateProduct,
  dbDeleteCategory,
  dbDeleteProduct,
  dbGetCategories,
  dbGetAdminStats,
  dbGetAuditLogsPage,
  dbGetOrders,
  dbGetProducts,
  dbGetUserByPhone,
  dbListUsersPage,
  dbMoveProductsToCategory,
  dbSetUserRole,
  dbSetUserStatus,
  dbUpdateCategoryLabel,
  dbUpdateOrderStatus,
  dbUpsertUser,
  dbWriteAuditLog,
  orderStatusAllowed,
  productCategoryAllowed,
  userRoleAllowed,
  userStatusAllowed,
} from './db.js';

const PORT = Number(process.env.API_PORT || 8787);
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 1000 * 60 * 60 * 24);
const ADMIN_LOGIN_CODE = String(process.env.ADMIN_LOGIN_CODE || process.env.VITE_ADMIN_LOGIN_CODE || '').trim();
const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();
const LOGIN_RATE_LIMIT_WINDOW_MS = Math.max(
  1_000,
  Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1_000)
);
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = Math.max(
  1,
  Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || 10)
);
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const parseCsv = (value) =>
  (value || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
const normalizeOrigin = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    return new URL(raw).origin;
  } catch {
    return '';
  }
};
const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.trunc(parsed);
};
const toAuditBoundary = (value, boundary = 'start') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return boundary === 'end' ? `${raw}T23:59:59.999Z` : `${raw}T00:00:00.000Z`;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
};

const adminPhones = new Set(parseCsv(process.env.ADMIN_PHONES || process.env.VITE_ADMIN_PHONES));
const adminTelegramIds = new Set(
  parseCsv(process.env.ADMIN_TELEGRAM_IDS || process.env.VITE_ADMIN_TELEGRAM_IDS)
    .map(Number)
    .filter((n) => Number.isFinite(n))
);
const allowedOrigins = new Set(
  [
    ...DEFAULT_ALLOWED_ORIGINS,
    ...parseCsv(process.env.CORS_ALLOWED_ORIGINS || process.env.VITE_SITE_URL),
  ]
    .map(normalizeOrigin)
    .filter(Boolean)
);

const sessions = new Map();
const loginAttempts = new Map();

if ((adminPhones.size > 0 || adminTelegramIds.size > 0) && !ADMIN_LOGIN_CODE) {
  // eslint-disable-next-line no-console
  console.warn('ADMIN_LOGIN_CODE is missing: admin access will stay disabled.');
}

const isOriginAllowed = (originHeader) => {
  const normalized = normalizeOrigin(originHeader);
  return !!normalized && allowedOrigins.has(normalized);
};

const getCorsOrigin = (originHeader) => {
  const origin = String(originHeader || '').trim();
  if (!origin) return '*';
  return isOriginAllowed(origin) ? normalizeOrigin(origin) : 'null';
};

const getClientIp = (req) => {
  const forwarded = String(req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();
  const direct = String(req.socket?.remoteAddress || '').trim();
  return (forwarded || direct || 'unknown').replace(/^::ffff:/, '');
};

const consumeLoginRate = (key) => {
  const nowMs = Date.now();
  const existing = loginAttempts.get(key);

  if (!existing || !Number.isFinite(existing.resetAt) || existing.resetAt <= nowMs) {
    loginAttempts.set(key, {
      count: 1,
      resetAt: nowMs + LOGIN_RATE_LIMIT_WINDOW_MS,
    });
    return { ok: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - nowMs) / 1_000)),
    };
  }

  existing.count += 1;
  loginAttempts.set(key, existing);
  return { ok: true, retryAfterSeconds: 0 };
};

const clearLoginRate = (key) => {
  if (!key) return;
  loginAttempts.delete(key);
};

const json = (req, res, status, payload) => {
  const reqOrigin = String(req?.headers?.origin || '').trim();
  const corsOrigin = getCorsOrigin(reqOrigin);
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  };
  if (reqOrigin) {
    headers.Vary = 'Origin';
  }
  res.writeHead(status, {
    ...headers,
  });
  res.end(JSON.stringify(payload));
};

const parseBody = async (req) =>
  new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });

const sanitizeUser = (input) => {
  const phone = String(input?.phone || '').trim();
  const name = String(input?.name || 'Customer').trim() || 'Customer';
  const telegramId = typeof input?.telegramId === 'number' ? input.telegramId : undefined;
  const role = input?.role === 'admin' ? 'admin' : 'customer';
  const status = input?.status === 'blocked' ? 'blocked' : 'active';

  return {
    phone,
    name,
    telegramId,
    role,
    status,
  };
};

const secureEqual = (a, b) => {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length === 0 || right.length === 0 || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
};

const isAdminCodeValid = (adminCode) => !!ADMIN_LOGIN_CODE && secureEqual(adminCode, ADMIN_LOGIN_CODE);

const isListedAdmin = (user) => {
  return (
    (adminPhones.size > 0 && !!user.phone && adminPhones.has(user.phone)) ||
    (adminTelegramIds.size > 0 &&
      typeof user.telegramId === 'number' &&
      adminTelegramIds.has(user.telegramId))
  );
};

const createSession = (user, isAdmin) => {
  const token = randomBytes(32).toString('hex');
  sessions.set(token, {
    user: sanitizeUser(user),
    isAdmin: !!isAdmin,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
};

const revokeSessionsByPhone = (phone) => {
  const target = String(phone || '').trim();
  if (!target) return;
  for (const [token, session] of sessions.entries()) {
    if (session?.user?.phone === target) sessions.delete(token);
  }
};

const writeAudit = (session, action, entity, entityId, details = {}) => {
  const actorPhone = String(session?.user?.phone || '').trim();
  if (!actorPhone) return;
  try {
    dbWriteAuditLog({
      actorPhone,
      action,
      entity,
      entityId: String(entityId || ''),
      details,
    });
  } catch {
    // Keep API response stable even if audit insert fails.
  }
};

const readBearerToken = (req) => {
  const auth = String(req.headers.authorization || '').trim();
  if (!auth) return null;
  const [scheme, token] = auth.split(' ');
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') return null;
  return token.trim() || null;
};

const getSession = (req) => {
  const token = readBearerToken(req);
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (!Number.isFinite(session.expiresAt) || session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  return session;
};

const requireSession = (req, res) => {
  const session = getSession(req);
  if (!session) {
    json(req, res, 401, { error: 'Unauthorized' });
    return null;
  }
  if (session.user?.phone) {
    const dbUser = dbGetUserByPhone(session.user.phone);
    if (dbUser?.status === 'blocked') {
      revokeSessionsByPhone(session.user.phone);
      json(req, res, 403, { error: 'User is blocked' });
      return null;
    }
    if (dbUser) session.user = sanitizeUser(dbUser);
  }
  return session;
};

const requireAdminSession = (req, res) => {
  const session = requireSession(req, res);
  if (!session) return null;
  if (!session.isAdmin) {
    json(req, res, 403, { error: 'Admin access required' });
    return null;
  }
  return session;
};

const toCategoryId = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
const normalizeCategoryLabel = (value) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
const categoryLabelKey = (value) => normalizeCategoryLabel(value).toLowerCase();

const normalizeCategory = (input) => {
  const label = normalizeCategoryLabel(input?.label);
  const id = toCategoryId(input?.id || label);
  if (!label || !id) return null;
  return { id, label };
};

const normalizeProduct = (input) => {
  const product = {
    id: String(input.id || '').trim(),
    name: String(input.name || '').trim(),
    description: String(input.description || '').trim(),
    price: Number(input.price || 0),
    images: Array.isArray(input.images)
      ? input.images.map((img) => String(img || '').trim()).filter(Boolean)
      : [],
    category: String(input.category || '').trim(),
    popular: !!input.popular,
    seoKeywords: String(input.seoKeywords || '').trim(),
  };

  if (!product.id || !product.name || !product.description) return null;
  if (!Number.isFinite(product.price) || product.price < 0) return null;
  if (!productCategoryAllowed(product.category)) return null;
  if (!product.images.length) product.images = ['https://via.placeholder.com/400'];
  return product;
};

const normalizeOrder = (input) => {
  const id = String(input.id || '').trim();
  const address = String(input.address || '').trim();
  const phone = String(input.phone || '').trim();
  const customerName = String(input.customerName || '').trim() || 'Customer';
  const total = Number(input.total || 0);
  const status = String(input.status || 'new');
  const date = String(input.date || new Date().toISOString());
  const items = Array.isArray(input.items) ? input.items : [];

  if (!id || !address) return null;
  if (!Number.isFinite(total) || total <= 0) return null;
  if (!orderStatusAllowed(status)) return null;
  if (!items.length) return null;

  return { id, items, total, status, date, address, phone, customerName };
};

const stripCodeFence = (value) => {
  let text = String(value || '').trim();
  if (!text) return '';
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  return text;
};

const extractGeminiText = (payload) => {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((part) => String(part?.text || '').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
};

const callGemini = async ({ prompt, responseMimeType }) => {
  if (!GEMINI_API_KEY) throw new Error('AI key missing');

  const body = {
    contents: [{ parts: [{ text: String(prompt || '').trim() }] }],
  };
  if (responseMimeType) {
    body.generationConfig = { responseMimeType };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${details || 'unknown'}`);
  }

  const payload = await response.json();
  const text = extractGeminiText(payload);
  if (!text) throw new Error('Empty AI response');
  return text;
};

const generateSeoContent = async ({ name, category }) => {
  const prompt = `
Mahsulot: "${name}"
Kategoriya: "${category || 'Texnika'}"

Vazifa:
1) O'zbek tilida 1-2 gapdan iborat qisqa sotuvbop tavsif yozing.
2) 5-8 ta SEO kalit so'zni vergul bilan ajratib yozing.
3) Hech qanday izoh qo'shmang.

Javob formati faqat JSON:
{
  "description": "...",
  "keywords": "..., ..., ..."
}
  `;

  const raw = await callGemini({
    prompt,
    responseMimeType: 'application/json',
  });
  const normalized = stripCodeFence(raw);

  let parsed = null;
  try {
    parsed = JSON.parse(normalized);
  } catch {
    parsed = null;
  }

  const description = String(parsed?.description || '').trim();
  const keywords = String(parsed?.keywords || '').trim();

  if (!description || !keywords) {
    throw new Error('Invalid AI SEO payload');
  }

  return { description, keywords };
};

const generateAssistantReply = async ({ message, menu }) => {
  const safeMenu = Array.isArray(menu)
    ? menu
      .slice(0, 60)
      .map((item) => ({
        id: String(item?.id || '').trim(),
        name: String(item?.name || '').trim(),
        price: Number(item?.price || 0),
      }))
      .filter((item) => item.id && item.name && Number.isFinite(item.price))
    : [];

  const prompt = `
You are TexnoMarket AI sales assistant.
Primary language: Uzbek. If user writes in Russian or English, reply in that language.
Be concise and practical.

Rules:
1. Never claim you added anything to cart or placed order.
2. If user wants to buy, tell them to use "Savatga qo'shish" manually.
3. If user asks for phone/laptop recommendations, ask budget if needed.
4. For phones, suggest accessories (case/earphones). For laptops, suggest bag/mouse.

Current menu JSON:
${JSON.stringify(safeMenu)}

User message:
${String(message || '').trim()}
  `;

  const answer = await callGemini({ prompt });
  return stripCodeFence(answer).slice(0, 2400);
};

const server = http.createServer(async (req, res) => {
  if (!req.url || !req.method) return json(req, res, 400, { error: 'Bad request' });

  const requestOrigin = String(req.headers.origin || '').trim();
  if (requestOrigin && !isOriginAllowed(requestOrigin)) {
    return json(req, res, 403, { error: 'Origin not allowed' });
  }
  if (req.method === 'OPTIONS') return json(req, res, 204, {});

  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const { pathname } = url;

  try {
    if (req.method === 'GET' && pathname === '/health') {
      return json(req, res, 200, { ok: true, now: new Date().toISOString() });
    }

    if (req.method === 'POST' && pathname === '/api/auth/login') {
      const body = await parseBody(req);
      const phone = String(body.phone || '').trim();
      const ipKey = `ip:${getClientIp(req)}`;
      const phoneKey = phone ? `phone:${phone}` : null;
      const keys = [ipKey, phoneKey].filter(Boolean);

      for (const key of keys) {
        const allowed = consumeLoginRate(key);
        if (!allowed.ok) {
          return json(req, res, 429, {
            error: 'Too many login attempts',
            retryAfterSeconds: allowed.retryAfterSeconds,
          });
        }
      }

      if (!phone) return json(req, res, 400, { error: 'Phone is required' });

      const user = dbUpsertUser({
        phone,
        name: String(body.name || 'Customer').trim(),
        telegramId: typeof body.telegramId === 'number' ? body.telegramId : undefined,
      });
      if (!user) return json(req, res, 500, { error: 'Unable to login user' });
      if (user.status === 'blocked') return json(req, res, 403, { error: 'User is blocked' });

      const adminCode = String(body.adminCode || '').trim();
      const isAdmin = isAdminCodeValid(adminCode) && (isListedAdmin(user) || user.role === 'admin');
      const token = createSession(user, isAdmin);
      keys.forEach(clearLoginRate);

      return json(req, res, 200, {
        user,
        isAdmin,
        token,
      });
    }

    if (req.method === 'GET' && pathname === '/api/auth/session') {
      const session = requireSession(req, res);
      if (!session) return;
      return json(req, res, 200, { user: session.user, isAdmin: session.isAdmin });
    }

    if (req.method === 'POST' && pathname === '/api/ai/assistant') {
      const body = await parseBody(req);
      const message = String(body?.message || '').trim();
      if (!message) return json(req, res, 400, { error: 'Message is required' });
      if (message.length > 1000) return json(req, res, 400, { error: 'Message is too long' });
      if (!GEMINI_API_KEY) return json(req, res, 503, { error: 'AI service is not configured' });

      try {
        const answer = await generateAssistantReply({
          message,
          menu: Array.isArray(body?.menu) ? body.menu : [],
        });
        return json(req, res, 200, { answer });
      } catch (error) {
        const details = error instanceof Error ? error.message : 'unknown';
        return json(req, res, 502, { error: `AI assistant failed: ${details}` });
      }
    }

    if (req.method === 'POST' && pathname === '/api/ai/seo') {
      const adminSession = requireAdminSession(req, res);
      if (!adminSession) return;
      if (!GEMINI_API_KEY) return json(req, res, 503, { error: 'AI service is not configured' });

      const body = await parseBody(req);
      const name = String(body?.name || '').trim();
      const category = String(body?.category || '').trim();
      if (!name) return json(req, res, 400, { error: 'Product name is required' });

      try {
        const result = await generateSeoContent({ name, category });
        writeAudit(adminSession, 'ai_seo_generate', 'product', String(body?.id || name), {
          name,
          category,
        });
        return json(req, res, 200, result);
      } catch (error) {
        const details = error instanceof Error ? error.message : 'unknown';
        return json(req, res, 502, { error: `AI SEO generation failed: ${details}` });
      }
    }

    if (req.method === 'GET' && pathname === '/api/categories') {
      return json(req, res, 200, dbGetCategories());
    }

    if (req.method === 'POST' && pathname === '/api/categories') {
      const adminSession = requireAdminSession(req, res);
      if (!adminSession) return;
      const body = await parseBody(req);
      const category = normalizeCategory(body);
      if (!category) return json(req, res, 400, { error: 'Invalid category payload' });
      const existingCategories = dbGetCategories();
      if (existingCategories.some((item) => item.id === category.id)) {
        return json(req, res, 409, { error: 'Category already exists' });
      }
      if (existingCategories.some((item) => categoryLabelKey(item.label) === categoryLabelKey(category.label))) {
        return json(req, res, 409, { error: 'Category label already exists' });
      }
      try {
        const saved = dbCreateCategory(category);
        if (!saved) return json(req, res, 500, { error: 'Unable to create category' });
        writeAudit(adminSession, 'category_create', 'category', saved.id, { label: saved.label });
        return json(req, res, 201, saved);
      } catch {
        return json(req, res, 409, { error: 'Category already exists' });
      }
    }

    if (req.method === 'PATCH' && pathname.startsWith('/api/categories/')) {
      const adminSession = requireAdminSession(req, res);
      if (!adminSession) return;
      const categoryId = decodeURIComponent(pathname.split('/').pop() || '').trim();
      if (!categoryId) return json(req, res, 400, { error: 'Category id is required' });

      const body = await parseBody(req);
      const nextLabel = normalizeCategoryLabel(body?.label);
      if (!nextLabel) return json(req, res, 400, { error: 'Category label is required' });

      const existingCategories = dbGetCategories();
      const currentCategory = existingCategories.find((item) => item.id === categoryId);
      if (!currentCategory) return json(req, res, 404, { error: 'Category not found' });

      const hasDuplicateLabel = existingCategories.some(
        (item) => item.id !== categoryId && categoryLabelKey(item.label) === categoryLabelKey(nextLabel)
      );
      if (hasDuplicateLabel) {
        return json(req, res, 409, { error: 'Category label already exists' });
      }

      const updated = dbUpdateCategoryLabel(categoryId, nextLabel);
      if (!updated) return json(req, res, 404, { error: 'Category not found' });

      writeAudit(adminSession, 'category_update', 'category', categoryId, {
        fromLabel: currentCategory.label,
        toLabel: updated.label,
      });
      return json(req, res, 200, updated);
    }

    if (req.method === 'DELETE' && pathname.startsWith('/api/categories/')) {
      const adminSession = requireAdminSession(req, res);
      if (!adminSession) return;
      const categoryId = decodeURIComponent(pathname.split('/').pop() || '').trim();
      if (!categoryId) return json(req, res, 400, { error: 'Category id is required' });
      const moveToCategoryId = decodeURIComponent(url.searchParams.get('moveTo') || '').trim();
      const existingCategories = dbGetCategories();
      const currentCategory = existingCategories.find((item) => item.id === categoryId);
      if (!currentCategory) return json(req, res, 404, { error: 'Category not found' });

      const linkedProducts = dbCategoryProductsCount(categoryId);

      if (moveToCategoryId && moveToCategoryId === categoryId) {
        return json(req, res, 400, { error: 'moveTo category must be different' });
      }

      if (linkedProducts > 0) {
        if (!moveToCategoryId) {
          return json(req, res, 409, {
            error: 'Category has products. Provide moveTo to reassign products before delete',
          });
        }
        if (!productCategoryAllowed(moveToCategoryId)) {
          return json(req, res, 404, { error: 'moveTo category not found' });
        }
      }

      let movedProducts = 0;
      if (linkedProducts > 0 && moveToCategoryId) {
        movedProducts = dbMoveProductsToCategory({
          fromId: categoryId,
          toId: moveToCategoryId,
        });
      }

      const removed = dbDeleteCategory(categoryId);
      if (removed) {
        writeAudit(adminSession, 'category_delete', 'category', categoryId, {
          label: currentCategory.label,
          linkedProducts,
          movedProducts,
          moveTo: moveToCategoryId || null,
        });
      }
      return json(
        req,
        res,
        removed ? 200 : 404,
        removed
          ? { ok: true, movedProducts, moveTo: moveToCategoryId || null }
          : { error: 'Category not found' }
      );
    }

    if (req.method === 'GET' && pathname === '/api/products') {
      return json(req, res, 200, dbGetProducts());
    }

    if (req.method === 'POST' && pathname === '/api/products') {
      const adminSession = requireAdminSession(req, res);
      if (!adminSession) return;
      const body = await parseBody(req);
      const product = normalizeProduct(body);
      if (!product) return json(req, res, 400, { error: 'Invalid product payload' });
      const saved = dbCreateOrUpdateProduct(product);
      writeAudit(adminSession, 'product_create', 'product', saved.id, {
        name: saved.name,
      });
      return json(req, res, 201, saved);
    }

    if (req.method === 'PUT' && pathname.startsWith('/api/products/')) {
      const adminSession = requireAdminSession(req, res);
      if (!adminSession) return;
      const productId = decodeURIComponent(pathname.split('/').pop() || '');
      const body = await parseBody(req);
      const product = normalizeProduct({ ...body, id: productId });
      if (!product) return json(req, res, 400, { error: 'Invalid product payload' });
      const saved = dbCreateOrUpdateProduct(product);
      writeAudit(adminSession, 'product_update', 'product', saved.id, {
        name: saved.name,
      });
      return json(req, res, 200, saved);
    }

    if (req.method === 'DELETE' && pathname.startsWith('/api/products/')) {
      const adminSession = requireAdminSession(req, res);
      if (!adminSession) return;
      const productId = decodeURIComponent(pathname.split('/').pop() || '');
      const removed = dbDeleteProduct(productId);
      if (removed) writeAudit(adminSession, 'product_delete', 'product', productId, {});
      return json(req, res, removed ? 200 : 404, removed ? { ok: true } : { error: 'Product not found' });
    }

    if (req.method === 'GET' && pathname === '/api/orders') {
      const session = requireSession(req, res);
      if (!session) return;
      const rows = dbGetOrders({ isAdmin: session.isAdmin, phone: session.user.phone });
      return json(req, res, 200, rows);
    }

    if (req.method === 'POST' && pathname === '/api/orders') {
      const session = requireSession(req, res);
      if (!session) return;
      const body = await parseBody(req);
      const order = normalizeOrder(body);
      if (!order) return json(req, res, 400, { error: 'Invalid order payload' });

      if (!session.user.phone) return json(req, res, 403, { error: 'Session phone is missing' });
      if (order.phone && order.phone !== session.user.phone) {
        return json(req, res, 403, { error: 'Phone mismatch for current session' });
      }

      const normalizedOrder = {
        ...order,
        phone: session.user.phone,
        customerName: order.customerName || session.user.name || 'Customer',
      };

      return json(req, res, 201, dbCreateOrder(normalizedOrder));
    }

    if (req.method === 'PATCH' && pathname.startsWith('/api/orders/') && pathname.endsWith('/status')) {
      const adminSession = requireAdminSession(req, res);
      if (!adminSession) return;
      const orderId = decodeURIComponent(pathname.split('/')[3] || '');
      const body = await parseBody(req);
      const status = String(body.status || '');
      if (!orderStatusAllowed(status)) return json(req, res, 400, { error: 'Invalid status' });
      const updated = dbUpdateOrderStatus(orderId, status);
      if (updated) {
        writeAudit(adminSession, 'order_status_update', 'order', orderId, { status });
      }
      return json(req, res, updated ? 200 : 404, updated || { error: 'Order not found' });
    }

    if (req.method === 'GET' && pathname === '/api/admin/users') {
      const adminSession = requireAdminSession(req, res);
      if (!adminSession) return;
      const query = String(url.searchParams.get('query') || '').trim();
      const role = String(url.searchParams.get('role') || 'all').trim();
      const status = String(url.searchParams.get('status') || 'all').trim();
      const page = toPositiveInt(url.searchParams.get('page'), 1);
      const pageSize = toPositiveInt(url.searchParams.get('pageSize'), 20);
      return json(
        req,
        res,
        200,
        dbListUsersPage({
          query,
          role,
          status,
          page,
          pageSize,
        })
      );
    }

    if (req.method === 'PATCH' && pathname.startsWith('/api/admin/users/') && pathname.endsWith('/role')) {
      const adminSession = requireAdminSession(req, res);
      if (!adminSession) return;
      const targetPhone = decodeURIComponent(pathname.split('/')[4] || '').trim();
      const body = await parseBody(req);
      const role = String(body.role || '').trim();
      if (!targetPhone) return json(req, res, 400, { error: 'User phone is required' });
      if (!userRoleAllowed(role)) return json(req, res, 400, { error: 'Invalid role' });

      const updated = dbSetUserRole(targetPhone, role);
      if (!updated) return json(req, res, 404, { error: 'User not found' });

      writeAudit(adminSession, 'user_role_update', 'user', targetPhone, { role });
      return json(req, res, 200, updated);
    }

    if (req.method === 'PATCH' && pathname.startsWith('/api/admin/users/') && pathname.endsWith('/status')) {
      const adminSession = requireAdminSession(req, res);
      if (!adminSession) return;
      const targetPhone = decodeURIComponent(pathname.split('/')[4] || '').trim();
      const body = await parseBody(req);
      const status = String(body.status || '').trim();
      if (!targetPhone) return json(req, res, 400, { error: 'User phone is required' });
      if (!userStatusAllowed(status)) return json(req, res, 400, { error: 'Invalid status' });
      if (targetPhone === adminSession.user.phone && status === 'blocked') {
        return json(req, res, 400, { error: 'You cannot block your own account' });
      }

      const updated = dbSetUserStatus(targetPhone, status);
      if (!updated) return json(req, res, 404, { error: 'User not found' });

      if (status === 'blocked') revokeSessionsByPhone(targetPhone);
      writeAudit(adminSession, 'user_status_update', 'user', targetPhone, { status });
      return json(req, res, 200, updated);
    }

    if (req.method === 'GET' && pathname === '/api/admin/audit-logs') {
      const adminSession = requireAdminSession(req, res);
      if (!adminSession) return;
      const query = String(url.searchParams.get('query') || '').trim();
      const action = String(url.searchParams.get('action') || 'all').trim();
      const dateFrom = toAuditBoundary(url.searchParams.get('dateFrom'), 'start');
      const dateTo = toAuditBoundary(url.searchParams.get('dateTo'), 'end');
      const page = toPositiveInt(url.searchParams.get('page'), 1);
      const limit = toPositiveInt(url.searchParams.get('limit'), 50);
      const pageSize = toPositiveInt(url.searchParams.get('pageSize'), limit);
      if (dateFrom && dateTo && dateFrom > dateTo) {
        return json(req, res, 400, { error: 'dateFrom must be before dateTo' });
      }
      return json(
        req,
        res,
        200,
        dbGetAuditLogsPage({
          query,
          action,
          dateFrom,
          dateTo,
          page,
          pageSize,
        })
      );
    }

    if (req.method === 'GET' && pathname === '/api/admin/stats') {
      const adminSession = requireAdminSession(req, res);
      if (!adminSession) return;
      return json(req, res, 200, dbGetAdminStats());
    }

    return json(req, res, 404, { error: 'Not found' });
  } catch (error) {
    return json(req, res, 500, { error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`API running on http://127.0.0.1:${PORT}`);
});
