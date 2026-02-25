import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Truck, Shield, CreditCard, Headphones, Smartphone, Laptop, Headphones as Audio, Watch, Cable, ChevronRight, Zap } from 'lucide-react';
import { useMenu } from '../context/MenuContext';
import { useLanguage } from '../context/LanguageContext';
import ProductCard from '../components/ProductCard';
import SEO from '../components/SEO';

const Home: React.FC = () => {
    const { products, categories } = useMenu();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const siteUrl = (import.meta.env.VITE_SITE_URL || window.location.origin || 'https://texnomarket.uz').replace(/\/+$/, '');

    const popular = products.filter(p => p.popular);
    const catMap: Record<string, number> = {};
    products.forEach(p => { catMap[p.category] = (catMap[p.category] || 0) + 1; });

    const catIcons: Record<string, React.ReactNode> = {
        phones: <Smartphone size={22} />,
        laptops: <Laptop size={22} />,
        audio: <Audio size={22} />,
        watches: <Watch size={22} />,
        accessories: <Cable size={22} />,
    };
    const catLabels = categories.reduce<Record<string, string>>((acc, item) => {
        acc[item.id] = item.label;
        return acc;
    }, {
        phones: 'Telefonlar',
        laptops: 'Noutbuklar',
        audio: 'Audio',
        watches: 'Soatlar',
        accessories: 'Aksessuarlar',
    });

    const openCategory = (category: string) => {
        navigate('/menu', { state: { category } });
    };

    const homeJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'TexnoMarket',
        url: siteUrl,
        potentialAction: {
            '@type': 'SearchAction',
            target: `${siteUrl}/menu?search={search_term_string}`,
            'query-input': 'required name=search_term_string',
        },
    };

    return (
        <>
            <SEO
                title="TexnoMarket - Elektronika Do'koni"
                description="Eng zamonaviy texnologiyalar va gadjetlar"
                url={`${siteUrl}/`}
                jsonLd={homeJsonLd}
            />

            <div className="container">
                {/* HERO */}
                <section className="hero-section">
                    <div className="hero-grid">
                        <div className="hero-main" onClick={() => navigate('/menu')}>
                            <img src="https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=900&auto=format&fit=crop&q=80" alt="iPhone" />
                            <div className="hero-main-overlay">
                                <span className="hero-main-badge">MEGA AKSIYA</span>
                                <h2>iPhone 15 Pro<br />Titanium</h2>
                                <p>Yengilroq. Kuchliroq. Pro daraja.</p>
                                <button className="hero-btn" onClick={() => navigate('/menu')}>
                                    Xarid qilish <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="hero-side">
                            <div className="hero-side-card" onClick={() => navigate('/menu')}>
                                <img src="https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=400&auto=format&fit=crop&q=80" alt="Laptops" />
                                <div className="hero-side-overlay">
                                    <h3>Gaming Laptops</h3>
                                    <span>Katalogga o'tish -&gt;</span>
                                </div>
                            </div>
                            <div className="hero-side-card" onClick={() => navigate('/menu')}>
                                <img src="https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=400&auto=format&fit=crop&q=80" alt="Audio" />
                                <div className="hero-side-overlay">
                                    <h3>Premium Audio</h3>
                                    <span>Tinglash -&gt;</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* TRUST BADGES */}
                <div className="trust-grid">
                    <div className="trust-card">
                        <div className="trust-icon orange"><Truck size={20} /></div>
                        <div>
                            <h4>Bepul yetkazish</h4>
                            <p>1 mln so'mdan oshiq xaridlarga</p>
                        </div>
                    </div>
                    <div className="trust-card">
                        <div className="trust-icon green"><Shield size={20} /></div>
                        <div>
                            <h4>1 yillik kafolat</h4>
                            <p>Barcha mahsulotlarga</p>
                        </div>
                    </div>
                    <div className="trust-card">
                        <div className="trust-icon blue"><CreditCard size={20} /></div>
                        <div>
                            <h4>Muddatli to'lov</h4>
                            <p>0% komisiya bilan</p>
                        </div>
                    </div>
                    <div className="trust-card">
                        <div className="trust-icon purple"><Headphones size={20} /></div>
                        <div>
                            <h4>24/7 qo'llab-quvvatlash</h4>
                            <p>Doimo aloqadamiz</p>
                        </div>
                    </div>
                </div>

                {/* CATEGORIES */}
                <section style={{ marginBottom: 28 }}>
                    <div className="section-header">
                        <h2 className="section-title">{t.categories}</h2>
                        <button className="section-more" onClick={() => navigate('/menu')}>
                            {t.seeAll} <ChevronRight size={14} />
                        </button>
                    </div>
                    <div className="cat-grid">
                        {Object.entries(catMap).map(([cat, count]) => (
                            <div key={cat} className="cat-card" onClick={() => openCategory(cat)}>
                                <div className="cat-icon">{catIcons[cat] || <Smartphone size={22} />}</div>
                                <span>{catLabels[cat] || cat}</span>
                                <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{count} ta</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* HIT PRODUCTS */}
                {popular.length > 0 && (
                    <section style={{ marginBottom: 36 }}>
                        <div className="section-header">
                            <h2 className="section-title">TOP {t.popular}</h2>
                            <button className="section-more" onClick={() => navigate('/menu')}>
                                {t.seeAll} <ChevronRight size={14} />
                            </button>
                        </div>
                        <div className="product-grid">
                            {popular.slice(0, 5).map(p => <ProductCard key={p.id} product={p} />)}
                        </div>
                    </section>
                )}

                {/* PROMO BANNER */}
                <div className="promo-banner">
                    <div className="promo-content">
                        <h3><Zap size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />Muddatli to'lov - 0% foiz</h3>
                        <p>Barcha mahsulotlarga 12 oygacha bo'lib to'lash imkoniyati</p>
                        <button className="hero-btn" onClick={() => navigate('/menu')}>
                            Hoziroq xarid qiling <ArrowRight size={16} />
                        </button>
                    </div>
                </div>

                {/* ALL PRODUCTS */}
                <section style={{ marginBottom: 40 }}>
                    <div className="section-header">
                        <h2 className="section-title">Barcha mahsulotlar</h2>
                        <button className="section-more" onClick={() => navigate('/menu')}>
                            {t.seeAll} <ChevronRight size={14} />
                        </button>
                    </div>
                    <div className="product-grid">
                        {products.map(p => <ProductCard key={p.id} product={p} />)}
                    </div>
                </section>

                {/* BRANDS */}
                <section className="brands-section">
                    <div className="brands-title">Rasmiy hamkorlar</div>
                    <div className="brands-row">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" alt="Apple" style={{ height: 28 }} />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" alt="Samsung" style={{ height: 20 }} />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_%282021-%29.svg" alt="Xiaomi" style={{ height: 18 }} />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/0/0a/ASUS_Logo.svg" alt="ASUS" style={{ height: 22 }} />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg" alt="Sony" style={{ height: 16 }} />
                    </div>
                </section>
            </div>
        </>
    );
};

export default Home;

