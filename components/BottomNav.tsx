import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, LayoutGrid, ShoppingBag, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';

const BottomNav: React.FC = () => {
  const { items } = useCart();
  const { t } = useLanguage();
  const count = items.reduce((a, b) => a + b.quantity, 0);

  return (
    <nav className="bottom-nav">
      <NavLink to="/" className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`} end>
        <Home size={20} />
        <span>{t.home}</span>
      </NavLink>
      <NavLink to="/menu" className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}>
        <LayoutGrid size={20} />
        <span>{t.menu}</span>
      </NavLink>
      <NavLink to="/cart" className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`} style={{ position: 'relative' }}>
        <ShoppingBag size={20} />
        {count > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 6,
            background: 'var(--primary)', color: '#fff', fontSize: 9, fontWeight: 800,
            width: 16, height: 16, borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center', lineHeight: 1,
          }}>{count}</span>
        )}
        <span>{t.cart}</span>
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}>
        <User size={20} />
        <span>{t.profile}</span>
      </NavLink>
    </nav>
  );
};

export default BottomNav;
