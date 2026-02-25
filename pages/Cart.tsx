import React from 'react';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { Minus, Plus, CheckCircle, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency } from '../utils/format';
import SEO from '../components/SEO';

const Cart = () => {
    const { items, updateQuantity, removeFromCart, total, clearCart } = useCart();
    const { placeOrder } = useOrders();
    const { user, currentAddress } = useAuth();
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [success, setSuccess] = React.useState(false);
    const [checkoutError, setCheckoutError] = React.useState('');

    const handleCheckout = async () => {
        if (!items.length || total <= 0) return;
        if (!user) { navigate('/profile'); return; }
        setCheckoutError('');

        const placed = await placeOrder(items, total, currentAddress, user.phone, user.name || 'Mijoz');
        if (!placed) {
            setCheckoutError("Buyurtmani yuborishda xatolik yuz berdi. Qayta urinib ko'ring.");
            return;
        }

        clearCart();
        setSuccess(true);
        setTimeout(() => { setSuccess(false); navigate('/'); }, 2000);
    };

    if (success) {
        return (
            <>
                <SEO title="Savat" description="Savat sahifasi" noIndex />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center', padding: 24 }} className="animate-slide-up">
                    <CheckCircle size={80} style={{ color: 'var(--success)', marginBottom: 24 }} />
                    <h1 style={{ fontSize: 32, fontWeight: 900 }}>Buyurtma qabul qilindi!</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 16, marginTop: 8 }}>Sizning buyurtmangiz qayta ishlanmoqda.</p>
                    <button onClick={() => navigate('/')} style={{ marginTop: 32, background: 'var(--accent)', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Bosh sahifaga qaytish
                    </button>
                </div>
            </>
        );
    }

    if (items.length === 0) {
        return (
            <>
                <SEO title="Savat" description="Savat sahifasi" noIndex />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', padding: 24 }}>
                    <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                        <ShoppingBag size={48} style={{ color: 'var(--primary)' }} />
                    </div>
                    <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{t.emptyCart}</h2>
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: 400, marginBottom: 24 }}>{t.emptyCartDesc}</p>
                    <button
                        onClick={() => navigate('/menu')}
                        style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                        {t.goToMenu}
                    </button>
                </div>
            </>
        );
    }

    return (
        <>
            <SEO title="Savat" description="Savat sahifasi" noIndex />
            <div className="container" style={{ paddingTop: 24, paddingBottom: 120 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 24 }}>{t.cart}</h1>

                <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    {/* Items */}
                    <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {items.map(item => (
                            <div key={item.id} style={{
                                background: '#fff',
                                borderRadius: 'var(--radius-lg)',
                                padding: 16,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 16,
                                border: '1px solid var(--border-light)',
                                transition: 'box-shadow 0.2s',
                            }}>
                                <img
                                    src={item.images?.[0]}
                                    alt={item.name}
                                    style={{ width: 80, height: 80, borderRadius: 'var(--radius-md)', objectFit: 'cover', background: 'var(--bg)', flexShrink: 0 }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</h3>
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</p>
                                    <p style={{ fontWeight: 800, color: 'var(--primary)', fontSize: 15 }}>{formatCurrency(item.price * item.quantity)}</p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', borderRadius: 'var(--radius-md)', padding: 4 }}>
                                    <button
                                        onClick={() => updateQuantity(item.id, -1)}
                                        style={{ width: 32, height: 32, border: 'none', background: '#fff', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(item.id, 1)}
                                        style={{ width: 32, height: 32, border: 'none', background: '#fff', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Summary */}
                    <div style={{ width: 360, flexShrink: 0 }}>
                        <div style={{ background: '#fff', borderRadius: 'var(--radius-xl)', padding: 24, border: '1px solid var(--border-light)', position: 'sticky', top: 100 }}>
                            <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 20 }}>{t.checkout}</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20, fontSize: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                    <span>{t.subtotal}</span>
                                    <span style={{ fontWeight: 600 }}>{formatCurrency(total)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                    <span>{t.delivery}</span>
                                    <span style={{ fontWeight: 600, color: 'var(--success)' }}>{t.freeDelivery}</span>
                                </div>
                                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 800, fontSize: 16 }}>{t.total}</span>
                                    <span style={{ fontWeight: 900, fontSize: 22, color: 'var(--primary)' }}>{formatCurrency(total)}</span>
                                </div>
                            </div>
                            <button
                                onClick={handleCheckout}
                                disabled={!items.length}
                                style={{
                                    width: '100%',
                                    background: 'var(--primary)',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '16px',
                                    borderRadius: 'var(--radius-full)',
                                    fontWeight: 700,
                                    fontSize: 16,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                    transition: 'background 0.2s',
                                }}
                            >
                                {t.checkout}
                            </button>
                            <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>
                                Buyurtma berish orqali shartlarga rozilik bildirasiz.
                            </p>
                            {!!checkoutError && (
                                <p style={{ textAlign: 'center', fontSize: 12, color: '#b91c1c', marginTop: 10 }}>
                                    {checkoutError}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Cart;
