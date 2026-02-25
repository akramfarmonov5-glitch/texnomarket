import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, LayoutGrid, ShoppingBag, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { items } = useCart();
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const count = items.reduce((acc, item) => acc + item.quantity, 0);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-4 p-4 rounded-xl transition-all font-bold ${
        isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-500 hover:bg-blue-50 hover:text-blue-600'
    }`;

  return (
    <div className="hidden lg:flex flex-col w-72 bg-white h-screen sticky top-0 border-r border-slate-200 z-40 flex-shrink-0">
      <div className="p-8 flex flex-col items-start">
        <h1 className="text-4xl font-black text-blue-600 tracking-tighter leading-none">TEXNO<br/><span className="text-slate-900">MARKET</span></h1>
        <span className="text-xs font-bold text-slate-400 tracking-widest uppercase mt-2">Uzbekistan</span>
      </div>
      
      <nav className="flex-1 px-6 space-y-3">
        <NavLink to="/" className={navClass}>
          <Home size={24} />
          <span>{t.home}</span>
        </NavLink>
        <NavLink to="/menu" className={navClass}>
          <LayoutGrid size={24} />
          <span>{t.menu}</span>
        </NavLink>
        <NavLink to="/cart" className={navClass}>
          <div className="relative">
            <ShoppingBag size={24} />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-white">
                {count}
              </span>
            )}
          </div>
          <span>{t.cart}</span>
        </NavLink>
        <NavLink to="/profile" className={navClass}>
          <User size={24} />
          <span>{t.profile}</span>
        </NavLink>
      </nav>

      {isAdmin && (
          <div className="px-6 pb-2">
            <NavLink to="/admin" className="flex items-center space-x-4 p-4 rounded-xl font-bold bg-slate-900 text-white">
                <span>Admin Panel</span>
            </NavLink>
          </div>
      )}

      <div className="p-8 border-t border-slate-100">
        <div className="flex items-center space-x-2 mb-2">
           <div className="w-2 h-8 bg-blue-600 skew-x-[-12deg]"></div>
           <div className="w-2 h-8 bg-blue-600 skew-x-[-12deg]"></div>
           <div className="w-2 h-8 bg-blue-600 skew-x-[-12deg]"></div>
        </div>
        <p className="text-xs text-slate-400 font-bold leading-relaxed uppercase">
          {t.slogan}
        </p>
      </div>
    </div>
  );
};

export default Sidebar;