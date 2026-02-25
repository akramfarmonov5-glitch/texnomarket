import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { LanguageProvider } from './context/LanguageContext';
import { MenuProvider } from './context/MenuContext';
import { OrderProvider } from './context/OrderContext';
import TopBar from './components/TopBar';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import LiveAgent from './components/LiveAgent';
import Footer from './components/Footer';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import Profile from './pages/Profile';
import ProductDetails from './pages/ProductDetails';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminMenu from './pages/admin/AdminMenu';
import AdminOrders from './pages/admin/AdminOrders';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAudit from './pages/admin/AdminAudit';

const Layout = () => {
  return (
    <div style={{ minHeight: '100vh', background: '#ffffff' }}>
      <TopBar />
      <Header />
      <div className="page-content">
        <Outlet />
      </div>
      <Footer />
      <BottomNav />
      <LiveAgent />
    </div>
  );
};

const App = () => {
  const Router = import.meta.env.VITE_USE_HASH_ROUTER === 'true' ? HashRouter : BrowserRouter;

  return (
    <LanguageProvider>
      <AuthProvider>
        <MenuProvider>
          <OrderProvider>
            <CartProvider>
              <Router>
                <Routes>
                  {/* Public App */}
                  <Route path="/" element={<Layout />}>
                    <Route index element={<Home />} />
                    <Route path="menu" element={<Menu />} />
                    <Route path="cart" element={<Cart />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="product/:id" element={<ProductDetails />} />
                  </Route>

                  {/* Admin Panel */}
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="menu" element={<AdminMenu />} />
                    <Route path="orders" element={<AdminOrders />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="audit" element={<AdminAudit />} />
                  </Route>
                </Routes>
              </Router>
            </CartProvider>
          </OrderProvider>
        </MenuProvider>
      </AuthProvider>
    </LanguageProvider>
  );
};

export default App;
