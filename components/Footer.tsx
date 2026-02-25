import React from 'react';
import { Phone, MapPin, Facebook, Instagram, Twitter, Send } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-logo">TEXNO<span>MARKET</span></div>
            <p className="footer-desc">
              O'zbekistondagi eng zamonaviy elektronika va gadjetlar do'koni.
              Biz bilan kelajak texnologiyalarini kashf eting.
            </p>
            <div className="footer-social">
              <a href="#"><Facebook size={16} /></a>
              <a href="#"><Instagram size={16} /></a>
              <a href="#"><Twitter size={16} /></a>
              <a href="#"><Send size={16} /></a>
            </div>
          </div>

          <div>
            <h4 className="footer-heading">Mijozlar uchun</h4>
            <ul className="footer-links">
              <li><a href="#">Biz haqimizda</a></li>
              <li><a href="#">Yetkazib berish</a></li>
              <li><a href="#">To'lov turlari</a></li>
              <li><a href="#">Muddatli to'lov</a></li>
              <li><a href="#">Kafolat va qaytarish</a></li>
            </ul>
          </div>

          <div>
            <h4 className="footer-heading">Katalog</h4>
            <ul className="footer-links">
              <li><a href="#">Telefonlar</a></li>
              <li><a href="#">Noutbuklar</a></li>
              <li><a href="#">Audio</a></li>
              <li><a href="#">Soatlar</a></li>
              <li><a href="#">Aksessuarlar</a></li>
            </ul>
          </div>

          <div>
            <h4 className="footer-heading">Aloqa</h4>
            <ul className="footer-contact">
              <li>
                <Phone size={14} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#fff' }}>+998 71 123 45 67</div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>Har kuni 09:00 — 21:00</div>
                </div>
              </li>
              <li>
                <MapPin size={14} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
                <span>Toshkent sh., Amir Temur shoh ko'chasi, 1-uy</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 TexnoMarket. Barcha huquqlar himoyalangan.</span>
          <span>Sayt test rejimida ishlamoqda.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;