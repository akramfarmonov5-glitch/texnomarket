import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import * as ts from 'typescript';
import { dbGetProducts } from '../server/db.js';

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const INDEX_PATH = path.join(DIST_DIR, 'index.html');
const SITE_NAME = 'TexnoMarket';
const SITE_URL = String(process.env.VITE_SITE_URL || 'https://texnomarket.uz')
  .trim()
  .replace(/\/+$/, '');
const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&q=80&w=1200';

const normalizePath = (routePath) => {
  if (!routePath || routePath === '/') return '/';
  return `/${String(routePath).replace(/^\/+|\/+$/g, '')}`;
};

const buildRouteUrl = (routePath) => {
  const normalized = normalizePath(routePath);
  return normalized === '/' ? `${SITE_URL}/` : `${SITE_URL}${normalized}`;
};

const toAbsoluteUrl = (value, fallback = `${SITE_URL}/`) => {
  try {
    return new URL(String(value || ''), `${SITE_URL}/`).toString();
  } catch {
    return fallback;
  }
};

const stripAndCollapse = (value) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

const truncate = (value, max = 160) => {
  const text = stripAndCollapse(value);
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}...`;
};

const toDateOnly = (value) => {
  if (!value) return '';
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const setTitle = (html, title) => {
  if (/<title>.*?<\/title>/is.test(html)) {
    return html.replace(/<title>.*?<\/title>/is, `<title>${escapeHtml(title)}</title>`);
  }
  return html.replace('</head>', `  <title>${escapeHtml(title)}</title>\n</head>`);
};

const upsertMeta = (html, name, content, attribute = 'name') => {
  const escapedName = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`<meta\\s+${attribute}=[\"']${escapedName}[\"'][^>]*>`, 'i');
  const safeContent = escapeHtml(content);
  const tag = `<meta ${attribute}="${name}" content="${safeContent}">`;
  if (regex.test(html)) {
    return html.replace(regex, tag);
  }
  return html.replace('</head>', `  ${tag}\n</head>`);
};

const upsertCanonical = (html, href) => {
  const regex = /<link\s+rel=["']canonical["'][^>]*>/i;
  const tag = `<link rel="canonical" href="${escapeHtml(href)}">`;
  if (regex.test(html)) {
    return html.replace(regex, tag);
  }
  return html.replace('</head>', `  ${tag}\n</head>`);
};

const upsertJsonLd = (html, blocks) => {
  const cleaned = html.replace(
    /\s*<script type="application\/ld\+json" data-prerender-jsonld="true">[\s\S]*?<\/script>/g,
    ''
  );
  const validBlocks = Array.isArray(blocks) ? blocks.filter(Boolean) : [];
  if (validBlocks.length === 0) return cleaned;
  const scripts = validBlocks
    .map(
      (entry) =>
        `  <script type="application/ld+json" data-prerender-jsonld="true">${JSON.stringify(entry)}</script>`
    )
    .join('\n');
  return cleaned.replace('</head>', `${scripts}\n</head>`);
};

const routeToOutputPath = (routePath) => {
  const normalized = normalizePath(routePath);
  if (normalized === '/') return path.join(DIST_DIR, 'index.html');
  const segments = normalized.slice(1).split('/').filter(Boolean);
  return path.join(DIST_DIR, ...segments, 'index.html');
};

const routeToSitemapPriority = (routePath) => {
  const normalized = normalizePath(routePath);
  if (normalized === '/') return '1.0';
  if (normalized === '/menu') return '0.9';
  if (normalized.startsWith('/product/')) return '0.8';
  return '0.5';
};

const routeToChangeFreq = (routePath) => {
  const normalized = normalizePath(routePath);
  if (normalized === '/' || normalized === '/menu') return 'daily';
  if (normalized.startsWith('/product/')) return 'weekly';
  return 'monthly';
};

const sanitizeProducts = (rows) =>
  rows
    .filter((row) => !!row && !!row.id && !!row.name)
    .map((row) => ({
      id: String(row.id),
      name: stripAndCollapse(row.name),
      description: stripAndCollapse(row.description),
      price: Number(row.price || 0),
      category: stripAndCollapse(row.category || 'product'),
      images: Array.isArray(row.images) ? row.images.map((img) => toAbsoluteUrl(img, DEFAULT_IMAGE)) : [],
      seoKeywords: stripAndCollapse(row.seoKeywords || ''),
      updatedAt: toDateOnly(row.updatedAt || row.updated_at || row.createdAt || row.created_at),
    }));

const loadProductsFromConstants = async () => {
  const constantsPath = path.resolve(process.cwd(), 'constants.ts');
  try {
    const source = await fs.readFile(constantsPath, 'utf8');
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText;

    const sandbox = {
      module: { exports: {} },
      exports: {},
      require: () => ({}),
    };
    vm.runInNewContext(transpiled, sandbox, { filename: constantsPath });
    const exported =
      sandbox.module.exports?.MENU_ITEMS ||
      sandbox.exports?.MENU_ITEMS ||
      [];
    return sanitizeProducts(Array.isArray(exported) ? exported : []);
  } catch {
    return [];
  }
};

const loadProducts = async () => {
  try {
    const rows = dbGetProducts();
    const fromDb = sanitizeProducts(rows);
    if (fromDb.length > 0) return fromDb;
  } catch {
    // fallback below
  }
  return loadProductsFromConstants();
};

const buildHomeSchemas = () => [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: DEFAULT_IMAGE,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/menu?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  },
];

const buildMenuSchema = (products) => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: `${SITE_NAME} katalogi`,
  url: `${SITE_URL}/menu`,
  mainEntity: {
    '@type': 'ItemList',
    numberOfItems: products.length,
    itemListElement: products.slice(0, 50).map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: buildRouteUrl(`/product/${encodeURIComponent(product.id)}`),
      name: product.name,
    })),
  },
});

const buildProductSchemas = (product, routeUrl) => {
  const mainImage = product.images[0] || DEFAULT_IMAGE;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description,
      image: product.images.length ? product.images : [mainImage],
      sku: product.id,
      category: product.category,
      offers: {
        '@type': 'Offer',
        url: routeUrl,
        priceCurrency: 'UZS',
        price: String(product.price || 0),
        availability: 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/NewCondition',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Bosh sahifa',
          item: `${SITE_URL}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Katalog',
          item: `${SITE_URL}/menu`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: product.name,
          item: routeUrl,
        },
      ],
    },
  ];
};

const createBaseRoutes = (products) => [
  {
    path: '/',
    title: `${SITE_NAME} - Elektronika Do'koni`,
    description:
      "Eng so'nggi gadjetlar, telefonlar va noutbuklar. Arzon narxlar va tezkor yetkazib berish.",
    keywords: "texnika, telefonlar, noutbuklar, online do'kon",
    robots: 'index, follow',
    ogType: 'website',
    image: DEFAULT_IMAGE,
    jsonLd: buildHomeSchemas(),
    sitemap: true,
  },
  {
    path: '/menu',
    title: `Katalog | ${SITE_NAME}`,
    description: `${SITE_NAME} katalogi. Telefonlar, noutbuklar, audio va aksessuarlar.`,
    keywords: 'katalog, telefonlar, noutbuklar, audio, aksessuarlar',
    robots: 'index, follow',
    ogType: 'website',
    image: DEFAULT_IMAGE,
    jsonLd: [buildMenuSchema(products)],
    sitemap: true,
  },
  {
    path: '/cart',
    title: `Savat | ${SITE_NAME}`,
    description: `${SITE_NAME} savat sahifasi.`,
    keywords: 'savat',
    robots: 'noindex, nofollow',
    ogType: 'website',
    image: DEFAULT_IMAGE,
    jsonLd: [],
    sitemap: false,
  },
  {
    path: '/profile',
    title: `Profil | ${SITE_NAME}`,
    description: `${SITE_NAME} profil sahifasi.`,
    keywords: 'profil, login',
    robots: 'noindex, nofollow',
    ogType: 'website',
    image: DEFAULT_IMAGE,
    jsonLd: [],
    sitemap: false,
  },
];

const createProductRoutes = (products) =>
  products.map((product) => {
    const routePath = `/product/${encodeURIComponent(product.id)}`;
    const routeUrl = buildRouteUrl(routePath);
    const description = truncate(
      `${product.description} Narxi: ${Number(product.price || 0).toLocaleString('uz-UZ')} so'm.`
    );
    const keywords = product.seoKeywords || `${product.name}, ${product.category}, ${SITE_NAME}`;
    const image = product.images[0] || DEFAULT_IMAGE;

    return {
      path: routePath,
      title: `${product.name} narxi | ${SITE_NAME}`,
      description,
      keywords,
      robots: 'index, follow',
      ogType: 'product',
      image,
      jsonLd: buildProductSchemas(product, routeUrl),
      sitemap: true,
      lastmod: product.updatedAt || new Date().toISOString().slice(0, 10),
    };
  });

const renderRouteHtml = (template, route) => {
  const routeUrl = buildRouteUrl(route.path);
  const image = toAbsoluteUrl(route.image || DEFAULT_IMAGE, DEFAULT_IMAGE);
  let html = template;

  html = setTitle(html, route.title);
  html = upsertMeta(html, 'title', route.title, 'name');
  html = upsertMeta(html, 'description', route.description, 'name');
  html = upsertMeta(html, 'keywords', route.keywords || '', 'name');
  html = upsertMeta(html, 'robots', route.robots || 'index, follow', 'name');
  html = upsertMeta(html, 'og:title', route.title, 'property');
  html = upsertMeta(html, 'og:description', route.description, 'property');
  html = upsertMeta(html, 'og:url', routeUrl, 'property');
  html = upsertMeta(html, 'og:type', route.ogType || 'website', 'property');
  html = upsertMeta(html, 'og:site_name', SITE_NAME, 'property');
  html = upsertMeta(html, 'og:locale', 'uz_UZ', 'property');
  html = upsertMeta(html, 'og:image', image, 'property');
  html = upsertMeta(html, 'twitter:card', 'summary_large_image', 'name');
  html = upsertMeta(html, 'twitter:title', route.title, 'name');
  html = upsertMeta(html, 'twitter:description', route.description, 'name');
  html = upsertMeta(html, 'twitter:url', routeUrl, 'name');
  html = upsertMeta(html, 'twitter:image', image, 'name');
  html = upsertCanonical(html, routeUrl);
  html = upsertJsonLd(html, route.jsonLd || []);

  return html;
};

const writeRouteHtml = async (route, html) => {
  const outputPath = routeToOutputPath(route.path);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, html, 'utf8');
};

const generateSitemap = (routes) => {
  const indexable = routes.filter(
    (route) => route.sitemap !== false && !String(route.robots || '').toLowerCase().includes('noindex')
  );

  const entries = indexable
    .map((route) => {
      const loc = buildRouteUrl(route.path);
      const lastmod = route.lastmod || new Date().toISOString().slice(0, 10);
      const changefreq = route.changefreq || routeToChangeFreq(route.path);
      const priority = route.priority || routeToSitemapPriority(route.path);
      return [
        '  <url>',
        `    <loc>${escapeHtml(loc)}</loc>`,
        `    <lastmod>${escapeHtml(lastmod)}</lastmod>`,
        `    <changefreq>${escapeHtml(changefreq)}</changefreq>`,
        `    <priority>${escapeHtml(priority)}</priority>`,
        '  </url>',
      ].join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
};

const generateRobots = () =>
  [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /cart',
    'Disallow: /profile',
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
  ].join('\n');

const main = async () => {
  const template = await fs.readFile(INDEX_PATH, 'utf8');
  const products = await loadProducts();
  const routes = [...createBaseRoutes(products), ...createProductRoutes(products)];

  for (const route of routes) {
    const html = renderRouteHtml(template, route);
    await writeRouteHtml(route, html);
  }

  await fs.writeFile(path.join(DIST_DIR, 'sitemap.xml'), generateSitemap(routes), 'utf8');
  await fs.writeFile(path.join(DIST_DIR, 'robots.txt'), generateRobots(), 'utf8');

  // eslint-disable-next-line no-console
  console.log(`SEO prerender completed: ${routes.length} routes (${products.length} product pages).`);
};

await main();
