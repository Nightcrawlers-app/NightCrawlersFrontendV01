import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Menu, X, Trash2, ShoppingBasket } from 'lucide-react';
import { NAVIGATION_LINKS } from '../../utils/constants';
import logo from '../../assets/logo.png';
import MobileMenu from './MobileMenu';
import { useCart } from '../../context/CartContext';
import { useAuth, getInitials } from '../../context/AuthContext';

type HeaderProps = {
  onCartClick?: () => void;
};

const Header: React.FC<HeaderProps> = ({ onCartClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFallbackCartOpen, setIsFallbackCartOpen] = useState(false);
  const { itemCount, cartItems, cartTotal, removeFromCart, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const shouldUseFallbackCart = !onCartClick;

  const handleCartClick = () => {
    if (onCartClick) {
      onCartClick();
      return;
    }
    setIsFallbackCartOpen(true);
  };

  return (
    <>
      <header className="bg-white border-b border-gray-100 py-2 lg:py-3 sticky top-0 z-40">
        <div className="w-full px-4 sm:px-6 md:px-12 lg:px-[27px]">
          <div className="flex items-center justify-between h-16 lg:h-[96px]">
            {/* Logo */}
            <div className="relative flex items-center">
              <Link to="/" className="block relative w-[160px] sm:w-[200px] lg:w-[240px] h-[72px] sm:h-[88px] lg:h-[96px] overflow-visible">
                <img
                  src={logo}
                  alt="Night Crawlers"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[160px] sm:w-[200px] lg:w-[240px] h-[160px] sm:h-[200px] lg:h-[240px] object-contain select-none drop-shadow-sm"
                />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex justify-center items-center space-x-6 xl:space-x-8">
              {NAVIGATION_LINKS.map((link) => {
                const getUnderlineClass = (linkName: string) => {
                  switch (linkName) {
                    case 'Home':
                      return 'nav-link-home';
                    case 'Contact Us':
                      return 'nav-link-contact';
                    case 'Partners':
                      return 'nav-link-vendors';
                    case 'FAQs':
                      return 'nav-link-faq';
                    default:
                      return 'nav-link-home';
                  }
                };

                return (
                  <Link
                    key={link.name}
                    to={link.href}
                    className={`nav-link-wavy font-poppins text-[18px] lg:text-[20px] ${getUnderlineClass(link.name)} ${location.pathname === link.href ? 'active' : ''
                      }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </nav>

            {/* Desktop Action Buttons */}
            <div className="hidden md:flex items-center justify-end space-x-3 lg:space-x-4">
              <button
                className="relative w-10 h-10 lg:w-[42px] lg:h-[42px] rounded-full bg-night-red-600 text-white flex items-center justify-center hover:bg-night-red-700 transition-colors"
                onClick={handleCartClick}
                aria-label="Open cart"
              >
                <ShoppingCart className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-white text-night-red-600 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-night-red-600">
                    {itemCount}
                  </span>
                )}
              </button>
              <Link
                to={isAuthenticated ? "/user-profile" : "/signin"}
                className={`relative w-10 h-10 lg:w-[42px] lg:h-[42px] rounded-full flex items-center justify-center transition-all ${isAuthenticated
                  ? 'overflow-hidden border-2 border-[#C62222] hover:border-[#A01B1B]'
                  : 'bg-night-red-600 text-white hover:bg-night-red-700'
                  }`}
              >
                {isAuthenticated && user ? (
                  <>
                    {user.avatar ? (
                      <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#C62222] to-[#8B1616] flex items-center justify-center">
                        <span className="text-white font-bold text-xs">{getInitials(user.firstName, user.lastName)}</span>
                      </div>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                  </>
                ) : (
                  <User className="w-5 h-5" />
                )}
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center space-x-2">
              <button
                className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-night-red-600 text-white flex items-center justify-center hover:bg-night-red-700 transition-colors"
                onClick={handleCartClick}
                aria-label="Open cart"
              >
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-white text-night-red-600 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-night-red-600">
                    {itemCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Menu className="w-6 h-6 text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onCartClick={handleCartClick}
      />

      {shouldUseFallbackCart && isFallbackCartOpen && (
        <div className="fixed inset-0 z-[80] bg-black/20 backdrop-blur-sm">
          <div className="absolute inset-y-0 right-0 w-full max-w-[360px] sm:max-w-[420px] bg-white shadow-[-6px_0_18px_rgba(0,0,0,0.12)] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#EAECF0]">
              <div className="flex items-center gap-2 text-[#C62222] text-[15px] font-semibold">
                Cart
                <div className="w-[18px] h-[18px] bg-[#C62222] text-white text-[11px] rounded-full flex items-center justify-center">
                  {cartItems.length}
                </div>
              </div>
              <button
                onClick={() => setIsFallbackCartOpen(false)}
                className="text-[#667085] hover:text-[#222222]"
              >
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
                  onClick={() => { setIsFallbackCartOpen(false); navigate('/order-summary'); }}
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
    </>
  );
};

export default Header;
