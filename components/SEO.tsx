import React, { useEffect } from 'react';

interface SEOProps {
  title: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  noIndex?: boolean;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const SITE_NAME = 'TexnoMarket';
const DEFAULT_DESCRIPTION = "Eng so'nggi gadjetlar va elektronika mahsulotlari do'koni.";
const DEFAULT_KEYWORDS = "texnika, telefonlar, noutbuklar, online do'kon";
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&q=80&w=1200';
const FALLBACK_SITE_URL = 'https://texnomarket.uz';

const getSiteUrl = () => {
  const envUrl = String(import.meta.env.VITE_SITE_URL || '').trim();
  if (envUrl) return envUrl.replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return FALLBACK_SITE_URL;
};

const toAbsoluteUrl = (value: string, base: string) => {
  try {
    return new URL(value, `${base}/`).toString();
  } catch {
    return `${base}/`;
  }
};

const normalizeCanonicalUrl = (rawUrl: string | undefined, siteUrl: string) => {
  let value = String(rawUrl || '').trim();
  if (!value && typeof window !== 'undefined') value = window.location.href;
  if (!value) value = siteUrl;

  const hashRouteIndex = value.indexOf('#/');
  if (hashRouteIndex >= 0) {
    value = `${value.slice(0, hashRouteIndex)}${value.slice(hashRouteIndex + 1)}`;
  }
  value = value.split('#')[0];

  let absolute = toAbsoluteUrl(value, siteUrl);
  try {
    const parsed = new URL(absolute);
    parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    absolute = parsed.toString();
  } catch {
    // Keep fallback absolute url.
  }
  return absolute;
};

const SEO: React.FC<SEOProps> = ({ 
  title, 
  description = DEFAULT_DESCRIPTION, 
  keywords = DEFAULT_KEYWORDS,
  image = DEFAULT_IMAGE,
  url,
  noIndex = false,
  jsonLd,
}) => {
  const siteUrl = getSiteUrl();
  const canonicalUrl = normalizeCanonicalUrl(url, siteUrl);
  const absoluteImage = toAbsoluteUrl(image, siteUrl);
  const fullTitle = title.toLowerCase().includes(SITE_NAME.toLowerCase())
    ? title
    : `${title} | ${SITE_NAME}`;

  useEffect(() => {
    document.title = fullTitle;

    const updateMeta = (name: string, content: string, attribute: 'name' | 'property' = 'name') => {
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    updateMeta('description', description);
    updateMeta('keywords', keywords);
    updateMeta('robots', noIndex ? 'noindex, nofollow' : 'index, follow');

    updateMeta('og:title', fullTitle, 'property');
    updateMeta('og:description', description, 'property');
    updateMeta('og:image', absoluteImage, 'property');
    updateMeta('og:url', canonicalUrl, 'property');
    updateMeta('og:type', 'website', 'property');
    updateMeta('og:site_name', SITE_NAME, 'property');
    updateMeta('og:locale', 'uz_UZ', 'property');

    updateMeta('twitter:card', 'summary_large_image', 'name');
    updateMeta('twitter:title', fullTitle, 'name');
    updateMeta('twitter:description', description, 'name');
    updateMeta('twitter:image', absoluteImage, 'name');
    updateMeta('twitter:url', canonicalUrl, 'name');

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    document.querySelectorAll('script[data-seo-json-ld="true"]').forEach((node) => node.remove());
    const blocks = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];
    blocks.forEach((entry) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-json-ld', 'true');
      script.text = JSON.stringify(entry);
      document.head.appendChild(script);
    });

  }, [absoluteImage, canonicalUrl, description, fullTitle, jsonLd, keywords, noIndex]);

  return null;
};

export default SEO;
