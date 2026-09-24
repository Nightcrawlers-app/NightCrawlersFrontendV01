import React, { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import type { Promotion } from '../types/models';

/**
 * The promo the customer tapped. It follows them from the banner, to the
 * store, to checkout, where it's applied (the server re-checks it).
 * Kept in localStorage so a refresh doesn't lose it.
 */
const STORAGE_KEY = 'nc_selected_promo';

interface PromotionContextType {
    selectedPromotion: Promotion | null;
    selectPromotion: (promo: Promotion | null) => void;
}

const PromotionContext = createContext<PromotionContextType | undefined>(undefined);

const load = (): Promotion | null => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const promo = raw ? (JSON.parse(raw) as Promotion) : null;
        // Drop it once it has expired
        if (promo?.endsAt && new Date(promo.endsAt) < new Date()) return null;
        return promo;
    } catch {
        return null;
    }
};

export const PromotionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [selectedPromotion, setSelected] = useState<Promotion | null>(load);

    const selectPromotion = useCallback((promo: Promotion | null) => {
        setSelected(promo);
        try {
            if (promo) localStorage.setItem(STORAGE_KEY, JSON.stringify(promo));
            else localStorage.removeItem(STORAGE_KEY);
        } catch {
            // storage blocked — state still works for this session
        }
    }, []);

    return (
        <PromotionContext.Provider value={{ selectedPromotion, selectPromotion }}>
            {children}
        </PromotionContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePromotion = () => {
    const ctx = useContext(PromotionContext);
    if (!ctx) throw new Error('usePromotion must be used within a PromotionProvider');
    return ctx;
};
