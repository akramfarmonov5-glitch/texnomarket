import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { Product } from '../types';

interface Props { product: Product; }

const formatCurrency = (num: number) => num.toLocaleString('uz-UZ') + " so'm";

const ProductCard: React.FC<Props> = ({ product }) => {
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const displayImage = product.images?.[0]?.startsWith('http')
    ? product.images[0]
    : `https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&auto=format&fit=crop&q=80`;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product);
  };

  return (
    <div className="product-card" onClick={() => navigate(`/product/${product.id}`)}>
      <div className="product-img-wrap">
        <img src={displayImage} alt={product.name} loading="lazy" />
        {product.popular && <span className="product-badge hit">🔥 Xit</span>}
      </div>
      <div className="product-info">
        <div className="product-category">{product.category}</div>
        <div className="product-name">{product.name}</div>
        <div className="product-desc">{product.description}</div>
        <div className="product-footer">
          <div>
            <div className="product-price-old">{formatCurrency(Math.round(product.price * 1.15))}</div>
            <div className="product-price">
              {product.price.toLocaleString('uz-UZ')} <small>so'm</small>
            </div>
          </div>
          <button className="product-add-btn" onClick={handleAddToCart} title="Savatga qo'shish">
            <ShoppingCart size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
