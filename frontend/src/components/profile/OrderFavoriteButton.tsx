import React from 'react';
import { Heart } from 'lucide-react';
import { useFavorite } from '../../hooks/useFavorites';

/** "Save to favourites" for one past order. */
const OrderFavoriteButton: React.FC<{ orderId: string }> = ({ orderId }) => {
    const fav = useFavorite('order', orderId);
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
