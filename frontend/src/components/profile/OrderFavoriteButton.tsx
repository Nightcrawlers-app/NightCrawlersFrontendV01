import React from 'react';
import { Heart } from 'lucide-react';
import { useFavorite } from '../../hooks/useFavorites';

/**
 * Save a past order to favourites.
 *   variant 'button' (default) — "Save as favourite" with text
 *   variant 'icon'             — just the heart, for order list rows
 */
const OrderFavoriteButton: React.FC<{ orderId: string; storeName?: string; variant?: 'button' | 'icon' }> = ({
    orderId,
    storeName,
    variant = 'button',
}) => {
    const fav = useFavorite('order', orderId, storeName ? `Your ${storeName} order` : 'Order');
    const label = fav.isFavorite ? 'Remove this order from favourites' : 'Save this order to favourites';

    if (variant === 'icon') {
        return (
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    fav.toggle();
                }}
                disabled={fav.busy}
                aria-pressed={fav.isFavorite}
                aria-label={label}
                title={label}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-red-50 active:scale-95 transition flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E00B0B] disabled:opacity-60"
            >
                <Heart size={17} className={fav.isFavorite ? 'fill-[#E00B0B] text-[#E00B0B]' : 'text-gray-400'} />
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={fav.toggle}
            disabled={fav.busy}
            aria-pressed={fav.isFavorite}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors border border-gray-100 disabled:opacity-60"
        >
            <Heart size={12} className={fav.isFavorite ? 'fill-[#E00B0B] text-[#E00B0B]' : ''} />
            {fav.isFavorite ? 'Favourite' : 'Save as favourite'}
        </button>
    );
};

export default OrderFavoriteButton;
