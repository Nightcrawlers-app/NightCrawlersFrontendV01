import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import HeroSection from '../../components/home/HeroSection';
import CategoryStrip from '../../components/home/CategoryStrip';
import IntroSection from '../../components/home/IntroSection';
import VendorShowcase from '../../components/home/VendorShowcase';
import FeaturesSection from '../../components/home/FeaturesSection';
import PromotionalBanner from '../../components/home/PromotionalBanner';
import NewsletterSection from '../../components/home/NewsletterSection';
import { useCart } from '../../context/CartContext';
import { X, Trash2, ShoppingBasket } from 'lucide-react';

const Home: React.FC = () => {
  const { cartItems, cartTotal, removeFromCart, clearCart } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <Header onCartClick={() => setIsCartOpen(true)} />

      <main>
        <HeroSection />
        <CategoryStrip />
        <IntroSection />
        <VendorShowcase />
        <FeaturesSection />
        <PromotionalBanner />
        <NewsletterSection />
      </main>

      <Footer />

      {/* Global Cart Drawer (Home) */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[80] bg-black/20 backdrop-blur-sm">
          <div className="absolute inset-y-0 right-0 w-full max-w-[360px] sm:max-w-[420px] bg-white shadow-[-6px_0_18px_rgba(0,0,0,0.12)] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#EAECF0]">
              <div className="flex items-center gap-2 text-[#C62222] text-[15px] font-semibold">
                Cart
                <div className="w-[18px] h-[18px] bg-[#C62222] text-white text-[11px] rounded-full flex items-center justify-center">
                  {cartItems.length}
                </div>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="text-[#667085] hover:text-[#222222]">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-start h-full text-center pt-6">
                  <ShoppingBasket size={48} className="text-[#C62222] mb-2" />
                  <p className="text-[#667085] text-[12px]">Your Cart is empty</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-3 border border-[#EAECF0] rounded-[8px] p-3">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-[52px] h-[52px] object-cover rounded-[6px]"
                      />
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <h3 className="text-[13px] font-semibold text-[#222222] leading-tight">{item.name}</h3>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-[#C62222] hover:text-[#A01B1B]"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <p className="text-[#667085] text-[11px]">NGN {item.price.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="border-t border-[#EAECF0] px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[#667085] text-[13px]">Total:</span>
                  <span className="text-[#222222] text-[16px] font-bold">NGN {cartTotal.toLocaleString()}</span>
                </div>
                <button
                  onClick={() => { setIsCartOpen(false); navigate('/order-summary'); }}
                  className="w-full h-[40px] bg-[#C62222] text-white text-[13px] font-semibold rounded-[6px] hover:bg-[#A01B1B] transition-colors mb-2"
                >
                  Proceed to Checkout
                </button>
                <button
                  onClick={clearCart}
                  className="w-full h-[36px] text-[#C62222] border border-[#FEE4E2] bg-[#FEF2F2] text-[12px] font-semibold rounded-[6px] hover:bg-[#FEE4E2] transition-colors"
                >
                  Clear Cart
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
