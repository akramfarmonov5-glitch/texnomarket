import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, User, Heart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';

const Header: React.FC = () => {
    const { items } = useCart();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const count = items.reduce((acc, item) => acc + item.quantity, 0);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate('/menu', { state: { search: searchQuery } });
        }
    };

    return (
        <header className="main-header">
            <div className="header-inner">
                <NavLink to="/" className="header-logo">
                    <div className="header-logo-icon">TM</div>
                    <div>
                        <div className="header-logo-text">TEXNO<span>MARKET</span></div>
                        <div className="header-logo-sub">ELECTRONICS STORE</div>
                    </div>
                </NavLink>

                <form className="header-search" onSubmit={handleSearch}>
                    <Search size={16} className="header-search-icon" />
                    <input
                        type="text"
                        placeholder={t.searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button type="submit" className="header-search-btn"><Search size={14} /></button>
                </form>

                <div className="header-actions">
                    <NavLink to="/menu" className="header-action-btn" title={t.menu}>
                        <Heart size={20} />
                        <span>{t.menu}</span>
                    </NavLink>
                    <NavLink to="/cart" className="header-action-btn" title={t.cart}>
                        <ShoppingBag size={20} />
                        {count > 0 && <div className="header-badge">{count}</div>}
                        <span>{t.cart}</span>
                    </NavLink>
                    <NavLink to="/profile" className="header-action-btn" title={t.profile}>
                        <User size={20} />
                        <span>{t.profile}</span>
                    </NavLink>
                </div>
            </div>
        </header>
    );
};

export default Header;
