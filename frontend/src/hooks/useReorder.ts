import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { getMenuItemsForStore, getStoreById, toErrorMessage } from '../services/api';

type PastOrder = {
    storeId?: string | null;
    items: { menuItemId?: string | null; name: string; quantity: number }[];
    /** How it was paid, so checkout starts on the same method. */
    paymentMethod?: string;
};

/**
 * "Order again": puts a past order's items back in the cart at TODAY's menu
 * prices, skips anything no longer on the menu, and goes to checkout.
 */
export function useReorder() {
    const { cartItems, replaceCart } = useCart();
    const toast = useToast();
    const navigate = useNavigate();
    const [reorderingId, setReorderingId] = useState<string | null>(null);

    const reorder = useCallback(
        async (key: string, order: PastOrder) => {
            if (!order.storeId || reorderingId) return;
            setReorderingId(key);
            try {
                const [store, menu] = await Promise.all([getStoreById(order.storeId), getMenuItemsForStore(order.storeId)]);
                if (!store) {
                    toast.error('That store is no longer on Nightcrawlers.', { id: 'reorder' });
                    return;
                }
                const byId = new Map(menu.map((m) => [m.id, m]));
                const byName = new Map(menu.map((m) => [m.name.trim().toLowerCase(), m]));
                const missing: string[] = [];
                const lines = order.items.flatMap((line) => {
                    const m = (line.menuItemId && byId.get(line.menuItemId)) || byName.get(line.name.trim().toLowerCase());
                    if (!m) {
                        missing.push(line.name);
                        return [];
                    }
                    return [{
                        id: m.id,
                        name: m.name,
                        price: m.price,
                        image: m.imageUrl,
                        quantity: line.quantity,
                        storeId: store.id,
                        storeName: store.name,
                        vendorId: store.vendorId,
                        vendorName: store.name,
                        vendorImage: store.imageUrl,
                    }];
                });
                if (!lines.length) {
                    toast.error(`None of those items are on ${store.name}'s menu any more.`, { id: 'reorder' });
                    return;
                }
                const previous = cartItems;
                replaceCart(lines);
                toast.success(
                    missing.length
                        ? `Added to your cart. No longer available: ${missing.join(', ')}.`
                        : `Your ${store.name} order is in your cart.`,
                    {
                        id: 'cart',
                        duration: 6000,
                        ...(previous.length && { action: { label: 'Undo', onClick: () => replaceCart(previous) } }),
                    },
                );
                // Checkout starts on the same payment method as last time (it
                // used to always start on cash, so a paid-online order placed
                // again skipped Paystack without the customer noticing).
                navigate('/order-summary', { state: { payWith: order.paymentMethod === 'online' ? 'online' : 'cash' } });
            } catch (err) {
                toast.error(toErrorMessage(err, "Couldn't load that order. Please try again."), { id: 'reorder' });
            } finally {
                setReorderingId(null);
            }
        },
        [cartItems, replaceCart, toast, navigate, reorderingId],
    );

    return { reorder, reorderingId };
}
