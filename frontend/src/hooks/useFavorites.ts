import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { setFavoriteOrder, setFavoriteStore, toErrorMessage } from '../services/api';

/**
 * Heart buttons for stores and past orders. Updates straight away and rolls
 * back if the server says no. Signed-out customers are offered sign-in.
 */
export function useFavorite(kind: 'store' | 'order', id: string | undefined | null, name?: string) {
    const { user, patchUser } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);

    const field = kind === 'store' ? 'favoriteStores' : 'favoriteOrders';
    const list = user?.[field] ?? [];
    const isFavorite = Boolean(id && list.includes(id));

    const toggle = useCallback(async () => {
        if (!id || busy) return;
        if (!user) {
            toast.info('Sign in to save favourites.', {
                id: 'favorite',
                action: { label: 'Sign in', onClick: () => navigate(`/signin?next=${encodeURIComponent(window.location.pathname + window.location.search)}`) },
            });
            return;
        }
        const next = !isFavorite;
        const before = user[field];
        patchUser({ [field]: next ? [...before, id] : before.filter((x) => x !== id) });
        setBusy(true);
        try {
            const saved = await (kind === 'store' ? setFavoriteStore(id, next) : setFavoriteOrder(id, next));
            patchUser({ [field]: saved });
            const label = kind === 'store' ? name || 'Store' : 'Order';
            toast.success(next ? `${label} saved to favourites` : `${label} removed from favourites`, { id: 'favorite' });
        } catch (err) {
            patchUser({ [field]: before });
            toast.error(toErrorMessage(err, "Couldn't update your favourites."), { id: 'favorite' });
        } finally {
            setBusy(false);
        }
    }, [id, busy, user, isFavorite, field, kind, name, patchUser, toast, navigate]);

    return { isFavorite, toggle, busy };
}
