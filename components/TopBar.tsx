import React from 'react';
import { Phone, MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const TopBar: React.FC = () => {
    const { lang, setLang } = useLanguage();

    return (
        <div className="topbar">
            <div className="topbar-inner">
                <div className="topbar-left">
                    <a href="tel:+998711234567" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={11} /> +998 71 123 45 67
                    </a>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={11} /> Toshkent
                    </span>
                </div>
                <div className="topbar-right">
                    <div className="lang-switcher">
                        {(['uz', 'ru', 'en'] as const).map((l) => (
                            <button key={l} className={`lang-btn ${lang === l ? 'active' : ''}`} onClick={() => setLang(l)}>
                                {l.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TopBar;
