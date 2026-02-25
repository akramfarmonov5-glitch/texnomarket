import React, { useEffect, useMemo, useState } from 'react';
import { useMenu } from '../context/MenuContext';
import ProductCard from '../components/ProductCard';
import { Search } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useLocation } from 'react-router-dom';
import SEO from '../components/SEO';

const ALL_CATEGORY = 'All';

const Menu = () => {
    const { products, categories } = useMenu();
    const location = useLocation();
    const { t } = useLanguage();
    const siteUrl = (import.meta.env.VITE_SITE_URL || window.location.origin || 'https://texnomarket.uz').replace(/\/+$/, '');

    const [activeCat, setActiveCat] = useState(ALL_CATEGORY);
    const [search, setSearch] = useState('');

    const categoryIds = useMemo(() => {
        const merged = new Set<string>();
        categories.forEach((item) => merged.add(item.id));
        products.forEach((item) => {
            if (item.category) merged.add(item.category);
        });
        return [ALL_CATEGORY, ...Array.from(merged)];
    }, [categories, products]);

    const getCategoryLabel = (id: string) => {
        if (id === ALL_CATEGORY) return 'Barchasi';
        return categories.find((item) => item.id === id)?.label || id;
    };

    useEffect(() => {
        if (!location.state) return;
        const state = location.state as { category?: string; search?: string };
        if (state.category) setActiveCat(state.category);
        if (state.search) setSearch(state.search);
    }, [location]);

    useEffect(() => {
        if (!categoryIds.includes(activeCat)) {
            setActiveCat(ALL_CATEGORY);
        }
    }, [activeCat, categoryIds]);

    const filtered = products.filter((item) => {
        const matchesCat = activeCat === ALL_CATEGORY || item.category === activeCat;
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
        return matchesCat && matchesSearch;
    });

    const menuJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: activeCat === ALL_CATEGORY ? 'TexnoMarket katalogi' : `${getCategoryLabel(activeCat)} katalogi`,
        url: `${siteUrl}/menu`,
        mainEntity: {
            '@type': 'ItemList',
            numberOfItems: filtered.length,
            itemListElement: filtered.slice(0, 20).map((item, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                url: `${siteUrl}/product/${encodeURIComponent(item.id)}`,
                name: item.name,
            })),
        },
    };

    return (
        <div className="page-content">
            <SEO
                title={activeCat === ALL_CATEGORY ? t.menu : getCategoryLabel(activeCat)}
                description="TexnoMarket katalogi. Keng turdagi telefonlar, noutbuklar va aksessuarlar."
                url={`${siteUrl}/menu`}
                jsonLd={menuJsonLd}
            />

            <div className="cat-nav">
                <div className="cat-nav-inner hide-scrollbar">
                    {categoryIds.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => { setActiveCat(cat); setSearch(''); }}
                            className={`cat-nav-btn ${activeCat === cat ? 'active' : ''}`}
                        >
                            {getCategoryLabel(cat)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="container" style={{ paddingTop: 24, paddingBottom: 40 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
                    <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>
                        {activeCat === ALL_CATEGORY ? t.menu : getCategoryLabel(activeCat)}
                        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 8 }}>
                            ({filtered.length} ta)
                        </span>
                    </h1>
                    <div style={{ display: 'flex', gap: 8, minWidth: 280, flex: '0 1 400px' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder={t.searchPlaceholder}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 16px 10px 36px',
                                    border: '2px solid var(--border)',
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: 13,
                                    fontWeight: 500,
                                    outline: 'none',
                                    fontFamily: 'inherit',
                                    background: '#fff',
                                    transition: 'border-color 0.2s',
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                            />
                        </div>
                    </div>
                </div>

                <div className="product-grid">
                    {filtered.map((item) => (
                        <ProductCard key={item.id} product={item} />
                    ))}
                </div>

                {filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>No results</div>
                        <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Mahsulot topilmadi</p>
                        {(activeCat !== ALL_CATEGORY || search) && (
                            <button
                                onClick={() => { setActiveCat(ALL_CATEGORY); setSearch(''); }}
                                style={{
                                    marginTop: 12,
                                    background: 'var(--primary)',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '10px 24px',
                                    borderRadius: 'var(--radius-full)',
                                    fontWeight: 600,
                                    fontSize: 14,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit'
                                }}
                            >
                                Barchasini ko'rsatish
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Menu;
