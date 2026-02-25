import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMenu } from '../context/MenuContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency } from '../utils/format';
import { ChevronLeft, ShoppingBag, Truck, ShieldCheck, Star, Check } from 'lucide-react';
import SEO from '../components/SEO';

const ProductDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { getProduct } = useMenu();
  const { addToCart } = useCart();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const product = id ? getProduct(id) : undefined;
  const [activeImage, setActiveImage] = useState<string>('');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (product) {
      const imgs = product.images && product.images.length > 0 ? product.images : ['https://via.placeholder.com/600'];
      setActiveImage(imgs[0]);
    }
  }, [product]);

  const handleAdd = () => {
    if (product) {
      addToCart(product);
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    }
  };

  if (!product) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>: (</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-muted)' }}>Mahsulot topilmadi</h2>
        <button onClick={() => navigate(-1)} style={{ marginTop: 16, color: 'var(--primary)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
          {'<-'} Ortga qaytish
        </button>
      </div>
    );
  }

  const images = product.images && product.images.length > 0 ? product.images : ['https://via.placeholder.com/600'];
  const displayImage = activeImage || images[0];
  const siteUrl = (import.meta.env.VITE_SITE_URL || window.location.origin || 'https://texnomarket.uz').replace(/\/+$/, '');
  const productUrl = `${siteUrl}/product/${encodeURIComponent(product.id)}`;
  const imageUrls = images.map((img) => (img.startsWith('http') ? img : `${siteUrl}${img.startsWith('/') ? '' : '/'}${img}`));

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    sku: product.id,
    category: product.category,
    image: imageUrls,
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'UZS',
      price: String(product.price),
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Bosh sahifa',
        item: `${siteUrl}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Katalog',
        item: `${siteUrl}/menu`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.name,
        item: productUrl,
      },
    ],
  };

  return (
    <div className="animate-slide-up" style={{ paddingBottom: 100 }}>
      <SEO
        title={product.name}
        description={product.description}
        image={displayImage.startsWith('http') ? displayImage : `${siteUrl}${displayImage.startsWith('/') ? '' : '/'}${displayImage}`}
        keywords={product.seoKeywords || `${product.category}, ${product.name}`}
        url={productUrl}
        jsonLd={[productJsonLd, breadcrumbJsonLd]}
      />

      {/* Breadcrumb / Back */}
      <div className="container" style={{ paddingTop: 16, paddingBottom: 8 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}
        >
          <ChevronLeft size={16} /> Ortga / <span style={{ color: 'var(--text-primary)' }}>{product.category}</span>
        </button>
      </div>

      <div className="container" style={{ display: 'flex', gap: 48, flexWrap: 'wrap', paddingTop: 16 }}>
        {/* Product Images */}
        <div style={{ flex: '1 1 400px', maxWidth: 560 }}>
          {/* Main Image */}
          <div style={{
            aspectRatio: '1',
            background: '#fff',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            border: '1px solid var(--border-light)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <img
              src={displayImage}
              alt={product.name}
              style={{ maxWidth: '85%', maxHeight: '85%', objectFit: 'contain', transition: 'transform 0.5s' }}
            />
            {product.popular && (
              <div style={{
                position: 'absolute', top: 16, left: 16,
                background: 'var(--primary)', color: '#fff',
                fontSize: 12, fontWeight: 800,
                padding: '6px 14px', borderRadius: 'var(--radius-full)',
                textTransform: 'uppercase'
              }}>
                Bestseller
              </div>
            )}
          </div>

          {/* Thumbnails */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, overflow: 'auto' }} className="hide-scrollbar">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(img)}
                style={{
                  width: 72, height: 72,
                  borderRadius: 'var(--radius-md)',
                  border: displayImage === img ? '2px solid var(--primary)' : '2px solid var(--border-light)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  flexShrink: 0,
                  background: '#fff',
                  padding: 4,
                  transition: 'all 0.2s',
                }}
              >
                <img src={img} alt={`View ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div style={{ flex: '1 1 360px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            {product.category}
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1.1, marginBottom: 12 }}>
            {product.name}
          </h1>

          {/* Rating (placeholder) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>
            {[1, 2, 3, 4, 5].map(i => <Star key={i} size={16} fill={i <= 4 ? '#f59e0b' : 'none'} color={i <= 4 ? '#f59e0b' : '#d1d5db'} />)}
            <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 4 }}>4.0 (128 sharh)</span>
          </div>

          {/* Price */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 24 }}>
            <span style={{ fontSize: 36, fontWeight: 900, color: 'var(--primary)' }}>
              {formatCurrency(product.price)}
            </span>
            <span style={{ fontSize: 16, color: 'var(--text-muted)', textDecoration: 'line-through' }}>
              {formatCurrency(Math.round(product.price * 1.15))}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: 'var(--danger)', padding: '3px 8px', borderRadius: 'var(--radius-full)' }}>
              -15%
            </span>
          </div>

          {/* Add to cart */}
          <button
            onClick={handleAdd}
            style={{
              width: '100%',
              background: added ? 'var(--success)' : 'var(--primary)',
              color: '#fff',
              border: 'none',
              padding: '18px 24px',
              borderRadius: 'var(--radius-full)',
              fontWeight: 700,
              fontSize: 16,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              transition: 'all 0.3s',
              marginBottom: 24,
            }}
          >
            {added ? <><Check size={20} /> Qo'shildi!</> : <><ShoppingBag size={20} /> {t.addToCart}</>}
          </button>

          {/* Description */}
          <div style={{ background: '#fff', borderRadius: 'var(--radius-xl)', padding: 24, border: '1px solid var(--border-light)', marginBottom: 20 }}>
            <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>{t.description}</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 14 }}>
              {product.description}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
              <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Kafolat</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>1 Yil</div>
              </div>
              <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Yetkazib berish</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Butun O'zbekiston</div>
              </div>
            </div>
          </div>

          {/* Trust */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', flexShrink: 0 }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 12 }}>Asl mahsulot</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>100% Original</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                <Truck size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 12 }}>Tezkor yetkazish</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>24 soat ichida</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Footer */}
      <div style={{
        position: 'fixed',
        bottom: 64,
        left: 0, right: 0,
        padding: '12px 16px',
        background: '#fff',
        borderTop: '1px solid var(--border)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }} className="mobile-only">
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Narxi</div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>{formatCurrency(product.price).split(" ")[0]}</div>
        </div>
        <button
          onClick={handleAdd}
          style={{
            flex: 1,
            background: added ? 'var(--success)' : 'var(--primary)',
            color: '#fff',
            border: 'none',
            padding: '14px',
            borderRadius: 'var(--radius-full)',
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.3s',
          }}
        >
          {added ? <><Check size={18} /> Qo'shildi!</> : <><ShoppingBag size={18} /> {t.addToCart}</>}
        </button>
      </div>
    </div>
  );
};

export default ProductDetails;
