import React from 'react';
import { Heart } from 'lucide-react';
import { useFavorite } from '../../hooks/useFavorites';

/** Heart for a store card: tap to save/remove, without opening the store. */
const StoreFavoriteHeart: React.FC<{ storeId: string; storeName: string; className?: string }> = ({ storeId, storeName, className = '' }) => {
    const fav = useFavorite('store', storeId, storeName);
    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation(); // the card itself opens the store
                fav.toggle();
            }}
            disabled={fav.busy}
            aria-pressed={fav.isFavorite}
            aria-label={fav.isFavorite ? `Remove ${storeName} from favourites` : `Save ${storeName} to favourites`}
            className={`bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:bg-white active:scale-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E00B0B] ${className}`}
        >
            <Heart size={15} className={fav.isFavorite ? 'fill-[#E00B0B] text-[#E00B0B]' : 'text-[#E00B0B]'} />
        </button>
    );
};

export default StoreFavoriteHeart;
