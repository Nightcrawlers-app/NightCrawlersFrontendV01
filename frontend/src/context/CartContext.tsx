import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { useToast } from './ToastContext';

export interface CartItem {
  id: string | number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  storeId?: string;
  storeName?: string;
  vendorId?: string;
  vendorName?: string;
  vendorImage?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  /** Adds one (or `quantity`) and shows an "Added to cart" pop-up. Pass { silent: true } to skip it. */
  addToCart: (item: Omit<CartItem, 'quantity'>, options?: { quantity?: number; silent?: boolean }) => void;
  /** Removes the line and shows a "Removed" pop-up with Undo. */
  removeFromCart: (id: string | number, options?: { silent?: boolean }) => void;
  updateQuantity: (id: string | number, quantity: number) => void;
  /** Empties the cart quietly (e.g. after an order is placed). */
  clearCart: () => void;
  /** Replace the whole cart at once (used by "Order again"). */
  replaceCart: (items: CartItem[]) => void;
  cartTotal: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const loadCart = (): CartItem[] => {
  try {
    const savedCart = localStorage.getItem('cartItems');
    const parsed: CartItem[] = savedCart ? JSON.parse(savedCart) : [];
    // Carts saved by older builds have items with no id or no store, which
    // can't be ordered. Drop them rather than fail at checkout.
    return Array.isArray(parsed) ? parsed.filter((i) => i && i.id && i.storeId) : [];
  } catch {
    return [];
  }
};

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const toast = useToast();
  const [cartItems, setCartItems] = useState<CartItem[]>(loadCart);
  // The latest cart, for building toasts without waiting for a re-render.
  const cartRef = useRef(cartItems);
  cartRef.current = cartItems;

  useEffect(() => {
    try {
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
    } catch {
      // Storage full or blocked — the cart still works for this visit.
    }
  }, [cartItems]);

  const addToCart: CartContextType['addToCart'] = (item, options = {}) => {
    const qty = Math.max(1, options.quantity ?? 1);
    const current = cartRef.current;

    // One store per order. Rather than let a mixed cart fail at checkout,
    // say so now and offer to start a fresh cart with this item.
    const otherStore = current.find((i) => i.storeId && item.storeId && i.storeId !== item.storeId);
    if (otherStore) {
      toast.error(`Your cart has items from ${otherStore.storeName || 'another store'}. Orders are one store at a time.`, {
        id: 'cart-other-store',
        duration: 7000,
        action: {
          label: 'Start new cart',
          onClick: () => {
            setCartItems([{ ...item, quantity: qty }]);
            toast.success(`New cart started with ${item.name}`, { id: 'cart' });
          },
        },
      });
      return;
    }

    const existing = current.find((i) => i.id === item.id);
    setCartItems((prev) =>
      prev.some((i) => i.id === item.id)
        ? prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + qty } : i))
        : [...prev, { ...item, quantity: qty }],
    );
    if (!options.silent) {
      const now = (existing?.quantity ?? 0) + qty;
      // Same id → tapping "+" quickly updates one pop-up instead of stacking five.
      toast.success(now > 1 ? `${item.name} × ${now} in your cart` : `Added ${item.name} to your cart`, { id: 'cart' });
    }
  };

  const removeFromCart: CartContextType['removeFromCart'] = (id, options = {}) => {
    const current = cartRef.current;
    const index = current.findIndex((i) => i.id === id);
    if (index === -1) return;
    const removed = current[index];
    setCartItems((prev) => prev.filter((item) => item.id !== id));
    if (!options.silent) {
      toast.info(`Removed ${removed.name} from your cart`, {
        id: 'cart',
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: () =>
            setCartItems((prev) => {
              if (prev.some((i) => i.id === removed.id)) return prev;
              const next = [...prev];
              next.splice(Math.min(index, next.length), 0, removed);
              return next;
            }),
        },
      });
    }
  };

  const updateQuantity = (id: string | number, quantity: number) => {
    if (quantity < 1) return;
    setCartItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)));
  };

  const clearCart = () => setCartItems([]);
  const replaceCart = (items: CartItem[]) => setCartItems(items);

  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart, replaceCart, cartTotal, itemCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
