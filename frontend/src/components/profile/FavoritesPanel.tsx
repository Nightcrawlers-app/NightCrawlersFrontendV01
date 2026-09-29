import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Loader2, RotateCcw, Store as StoreIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getMyFavorites, toErrorMessage } from '../../services/api';
import type { Order, VendorStore } from '../../services/api';
import { useFavorite } from '../../hooks/useFavorites';
import { useReorder } from '../../hooks/useReorder';

const FavoriteStoreCard: React.FC<{ store: VendorStore }> = ({ store }) => {
    const fav = useFavorite('store', store.id, store.name);
    if (!fav.isFavorite) return null; // just un-hearted
    return (
        <li className="relative">
            <Link
                to={`/vendor-details?store=${store.id}`}
                state={store}
                className="group block rounded-xl overflow-hidden border border-gray-100 hover:border-[#E00B0B]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E00B0B]"
            >
                <div className="aspect-[16/9] bg-gray-100">
                    {store.imageUrl ? (
                        <img src={store.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center"><StoreIcon className="text-gray-300" /></div>
                    )}
                </div>
                <div className="p-3">
                    <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-[#E00B0B]">{store.name}</p>
                    <p className="text-xs text-gray-400 truncate">{store.businessType} · {store.address}</p>
                </div>
            </Link>
            <button
                type="button"
                onClick={fav.toggle}
                disabled={fav.busy}
                aria-label={`Remove ${store.name} from favourites`}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/95 shadow flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E00B0B]"
            >
                <Heart size={16} className="fill-[#E00B0B] text-[#E00B0B]" />
            </button>
        </li>
    );
};

const FavoriteOrderRow: React.FC<{ order: Order }> = ({ order }) => {
    const fav = useFavorite('order', order.id);
    const { reorder, reorderingId } = useReorder();
    if (!fav.isFavorite) return null;
    const summary = order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ');
    return (
        <li className="flex items-center gap-4 p-4 rounded-xl border border-gray-100">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{order.storeName}</p>
                <p className="text-xs text-gray-500 line-clamp-2">{summary}</p>
            </div>
            <button
                type="button"
                onClick={fav.toggle}
                disabled={fav.busy}
                aria-label="Remove this order from favourites"
                className="w-9 h-9 rounded-full hover:bg-red-50 flex items-center justify-center flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E00B0B]"
            >
                <Heart size={16} className="fill-[#E00B0B] text-[#E00B0B]" />
            </button>
            <button
                type="button"
                onClick={() => reorder(order.id, { storeId: order.storeId, items: order.items })}
                disabled={reorderingId === order.id}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#E00B0B] text-white text-xs font-semibold hover:bg-[#B80909] disabled:opacity-60 flex-shrink-0"
            >
                {reorderingId === order.id ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                Order again
            </button>
        </li>
    );
};

/** Favourite stores and favourite past orders, on the profile's Favourites tab. */
const FavoritesPanel: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [data, setData] = useState<{ stores: VendorStore[]; orders: Order[] } | null>(null);
    const [error, setError] = useState('');

    // Re-fetch when the set of favourites changes size (added elsewhere).
    const storeCount = user?.favoriteStores.length ?? 0;
    const orderCount = user?.favoriteOrders.length ?? 0;
    useEffect(() => {
        let cancelled = false;
        getMyFavorites()
            .then((d) => !cancelled && (setData(d), setError('')))
            .catch((e) => !cancelled && setError(toErrorMessage(e, "Couldn't load your favourites.")));
        return () => {
            cancelled = true;
        };
    }, [storeCount, orderCount]);

    if (error) return <p className="text-sm text-[#B42318] bg-white rounded-2xl border border-gray-100 p-6">{error}</p>;
    if (!data) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 flex justify-center">
                <Loader2 className="animate-spin text-[#E00B0B]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6">
                <h2 className="text-lg font-bold text-gray-900">Favourite stores</h2>
                <p className="text-xs text-gray-400 mt-0.5 mb-5">Tap the heart on any store's page to keep it here.</p>
                {data.stores.length ? (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {data.stores.map((s) => <FavoriteStoreCard key={s.id} store={s} />)}
                    </ul>
                ) : (
                    <div className="text-center py-8">
                        <Heart className="mx-auto text-gray-300 mb-2" />
                        <p className="text-sm text-gray-500 mb-3">No favourite stores yet.</p>
                        <button onClick={() => navigate('/explore')} className="text-sm font-semibold text-[#E00B0B] hover:underline">
                            Find stores open now
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6">
                <h2 className="text-lg font-bold text-gray-900">Favourite orders</h2>
                <p className="text-xs text-gray-400 mt-0.5 mb-5">Your go-to orders, ready to repeat in one tap. Heart an order in your order history to add it.</p>
                {data.orders.length ? (
                    <ul className="space-y-3">{data.orders.map((o) => <FavoriteOrderRow key={o.id} order={o} />)}</ul>
                ) : (
                    <p className="text-sm text-gray-500 text-center py-6">No favourite orders yet.</p>
                )}
            </div>
        </div>
    );
};

export default FavoritesPanel;
