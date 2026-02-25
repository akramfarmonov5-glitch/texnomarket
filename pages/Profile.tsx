import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';

const Profile = () => {
    const { user, login, logout, isAdmin } = useAuth();
    const { t, lang, setLang } = useLanguage();
    const [phone, setPhone] = React.useState('');
    const [name, setName] = React.useState('');
    const [adminCode, setAdminCode] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [loginError, setLoginError] = React.useState('');
    const navigate = useNavigate();

    const handleLogin = async () => {
        if (!phone.trim() || isSubmitting) return;
        setIsSubmitting(true);
        setLoginError('');

        const ok = await login(phone.trim(), name.trim() || undefined, adminCode.trim() || undefined);
        if (!ok) {
            setLoginError('Kirish amalga oshmadi. Telefon yoki admin kodini tekshiring.');
        }
        setIsSubmitting(false);
    };

    if (!user) {
        return (
            <>
                <SEO title="Profil" description="Foydalanuvchi profili" noIndex />
                <div className="container" style={{ maxWidth: 440, paddingTop: 80, paddingBottom: 80, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: 40 }}>
                        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 32 }}>
                            {'👤'}
                        </div>
                        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>{t.login}</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Telefon raqamingizni kiriting</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <input
                            type="text"
                            placeholder="Ismingiz"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            style={{ width: '100%', padding: '14px 16px', border: '2px solid var(--border)', borderRadius: 'var(--radius-lg)', fontSize: 15, outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s' }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                        />
                        <input
                            type="tel"
                            placeholder="+998 XX XXX XX XX"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            style={{ width: '100%', padding: '14px 16px', border: '2px solid var(--border)', borderRadius: 'var(--radius-lg)', fontSize: 15, outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s' }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                        />
                        <input
                            type="password"
                            placeholder="Admin kod (ixtiyoriy)"
                            value={adminCode}
                            onChange={e => setAdminCode(e.target.value)}
                            style={{ width: '100%', padding: '14px 16px', border: '2px solid var(--border)', borderRadius: 'var(--radius-lg)', fontSize: 15, outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s' }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                        />
                        <button
                            onClick={handleLogin}
                            disabled={!phone.trim() || isSubmitting}
                            style={{
                                width: '100%',
                                background: phone.trim() && !isSubmitting ? 'var(--primary)' : 'var(--border)',
                                color: '#fff',
                                border: 'none',
                                padding: '16px',
                                borderRadius: 'var(--radius-full)',
                                fontWeight: 700,
                                fontSize: 16,
                                cursor: phone.trim() && !isSubmitting ? 'pointer' : 'not-allowed',
                                fontFamily: 'inherit',
                                transition: 'background 0.2s',
                                marginTop: 4,
                            }}
                        >
                            {isSubmitting ? 'Kirilmoqda...' : t.login}
                        </button>
                        {!!loginError && (
                            <p style={{ marginTop: 4, fontSize: 12, color: '#b91c1c' }}>{loginError}</p>
                        )}
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <SEO title="Profil" description="Foydalanuvchi profili" noIndex />
            <div className="container" style={{ maxWidth: 560, paddingTop: 40, paddingBottom: 80, margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--primary-light)', flexShrink: 0 }}>
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=ff6b00&color=fff&size=128`} alt="Avatar" style={{ width: '100%', height: '100%' }} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 2 }}>{user.name || 'Foydalanuvchi'}</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>{user.phone}</p>
                    </div>
                </div>

                {isAdmin && (
                    <button
                        onClick={() => navigate('/admin')}
                        style={{
                            width: '100%',
                            background: 'var(--accent)',
                            color: '#fff',
                            border: 'none',
                            padding: '16px 20px',
                            borderRadius: 'var(--radius-lg)',
                            fontWeight: 700,
                            fontSize: 15,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                            marginBottom: 24,
                        }}
                    >
                        <LayoutDashboard size={20} /> Admin Panel
                    </button>
                )}

                <div style={{ background: '#fff', borderRadius: 'var(--radius-xl)', padding: 24, border: '1px solid var(--border-light)', marginBottom: 20 }}>
                    <h2 style={{ fontWeight: 800, fontSize: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 3, height: 20, background: 'var(--primary)', borderRadius: 2 }}></span>
                        {t.settings}
                    </h2>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border-light)', marginBottom: 16 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{t.notification}</span>
                        <div style={{ width: 44, height: 24, background: 'var(--primary)', borderRadius: 'var(--radius-full)', position: 'relative', cursor: 'pointer' }}>
                            <div style={{ position: 'absolute', right: 2, top: 2, width: 20, height: 20, background: '#fff', borderRadius: '50%' }}></div>
                        </div>
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{t.language}</span>
                        </div>
                        <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 'var(--radius-lg)', padding: 4 }}>
                            {(['uz', 'ru', 'en'] as const).map((l) => (
                                <button
                                    key={l}
                                    onClick={() => setLang(l)}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        borderRadius: 'var(--radius-md)',
                                        border: 'none',
                                        fontWeight: 700,
                                        fontSize: 14,
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                        transition: 'all 0.2s',
                                        background: lang === l ? '#fff' : 'transparent',
                                        color: lang === l ? 'var(--primary)' : 'var(--text-muted)',
                                        boxShadow: lang === l ? 'var(--shadow-sm)' : 'none',
                                    }}
                                >
                                    {l.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <button
                    onClick={logout}
                    style={{
                        width: '100%',
                        background: '#fef2f2',
                        color: 'var(--danger)',
                        border: 'none',
                        padding: '16px',
                        borderRadius: 'var(--radius-lg)',
                        fontWeight: 700,
                        fontSize: 15,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'background 0.2s',
                    }}
                >
                    {t.logout}
                </button>
            </div>
        </>
    );
};

export default Profile;
