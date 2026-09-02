import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, ShoppingCart, User, LogOut, CreditCard } from 'lucide-react';
import { NAVIGATION_LINKS } from '../../utils/constants';
import { useAuth, getInitials } from '../../context/AuthContext';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onCartClick?: () => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose, onCartClick }) => {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div className="fixed right-0 top-0 h-full w-80 max-w-[80vw] bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            {isAuthenticated && user ? (
              <Link to="/user-profile" onClick={onClose} className="flex items-center gap-3">
                {user.avatar ? (
                  <img src={user.avatar} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-[#C62222]" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C62222] to-[#8B1616] flex items-center justify-center border-2 border-red-300">
                    <span className="text-white font-bold text-sm">{getInitials(user.firstName, user.lastName)}</span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-gray-900 leading-tight">{user.firstName} {user.lastName}</p>
                  <p className="text-[11px] text-gray-500 leading-tight">{user.email}</p>
                </div>
              </Link>
            ) : (
              <span className="text-[#C62222] text-[24px] font-bold font-poppins">Menu</span>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors z-10"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto py-4">
            <div className="space-y-1">
              {NAVIGATION_LINKS.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  onClick={onClose}
                  className={`block px-4 py-3 text-base font-medium transition-colors ${location.pathname === link.href
                    ? 'text-night-red-600 bg-red-50 border-r-4 border-night-red-600'
                    : 'text-gray-700 hover:text-night-red-600 hover:bg-gray-50'
                    }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* Authenticated user quick links */}
            {isAuthenticated && user && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Account</p>
                <Link
                  to="/user-profile"
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${location.pathname === '/user-profile'
                      ? 'text-[#C62222] bg-red-50 border-r-4 border-[#C62222]'
                      : 'text-gray-700 hover:text-[#C62222] hover:bg-gray-50'
                    }`}
                >
                  <User size={18} />
                  My Profile
                </Link>
                <Link
                  to="/order-summary"
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:text-[#C62222] hover:bg-gray-50 transition-colors"
                >
                  <CreditCard size={18} />
                  Orders
                </Link>
              </div>
            )}
          </nav>

          {/* Action Buttons */}
          <div className="p-4 border-t border-gray-100">
            <div className="space-y-3">
              <button
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-night-red-600 text-white rounded-lg hover:bg-night-red-700 transition-colors"
                onClick={() => {
                  if (onCartClick) {
                    onCartClick();
                  }
                  onClose();
                }}
              >
                <ShoppingCart className="w-5 h-5" />
                <span>Cart</span>
              </button>

              {isAuthenticated ? (
                <button
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-red-200 text-[#C62222] bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <Link
                  to="/signin"
                  onClick={onClose}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span>Sign In</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileMenu;
