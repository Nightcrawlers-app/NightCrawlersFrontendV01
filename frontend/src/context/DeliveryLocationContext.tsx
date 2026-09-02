import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { getSelectedAddress, setSelectedAddress } from '../lib/selectedAddress';
import type { SelectedAddress } from '../lib/selectedAddress';
import type { Coordinates } from '../types/models';
import { useAuth } from './AuthContext';

/**
 * Where the customer wants their order delivered.
 *
 * One source of truth for the whole app. Before this existed, Explore and the
 * vendor page each kept their own copy and the checkout page ignored both, so a
 * customer could pick an address and then have the order sent somewhere else.
 *
 * Persisted to localStorage so the choice survives a refresh.
 */
interface DeliveryLocationContextType {
    /** What to show the user, e.g. "Block 4, Admiralty Way" or "Current location". */
    label: string | null;
    /** Present when we have a real point; null for hand-typed addresses. */
    coords: Coordinates | null;
    /** The address to actually deliver to. Falls back to the saved default. */
    deliveryAddress: string | null;
    setLocation: (label: string | null, coords?: Coordinates | null) => void;
    clearLocation: () => void;
}

const DeliveryLocationContext = createContext<DeliveryLocationContextType | undefined>(undefined);

export const DeliveryLocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [selection, setSelection] = useState<SelectedAddress | null>(() => getSelectedAddress());

    const setLocation = useCallback((label: string | null, coords?: Coordinates | null) => {
        const next = label ? { label, coords: coords ?? null } : null;
        setSelection(next);
        setSelectedAddress(next);
    }, []);

    const clearLocation = useCallback(() => {
        setSelection(null);
        setSelectedAddress(null);
    }, []);

    // When a customer signs in and has no choice yet, start from their default
    // saved address rather than making them pick again.
    useEffect(() => {
        if (selection || !user?.addresses?.length) return;

        const preferred = user.addresses.find((a) => a.isDefault) ?? user.addresses[0];
        if (!preferred) return;

        setLocation(
            preferred.address,
            preferred.latitude != null && preferred.longitude != null
                ? { latitude: preferred.latitude, longitude: preferred.longitude }
                : null,
        );
    }, [user, selection, setLocation]);

    const savedDefault = user?.addresses?.find((a) => a.isDefault) ?? user?.addresses?.[0];

    // "Current location" is a label, not somewhere a rider can deliver to, so
    // fall back to a real saved address for the actual delivery target.
    const isRealAddress = selection?.label && selection.coords === null;
    const deliveryAddress = isRealAddress
        ? selection.label
        : savedDefault?.address ?? selection?.label ?? null;

    return (
        <DeliveryLocationContext.Provider
            value={{
                label: selection?.label ?? null,
                coords: selection?.coords ?? null,
                deliveryAddress,
                setLocation,
                clearLocation,
            }}
        >
            {children}
        </DeliveryLocationContext.Provider>
    );
};

export const useDeliveryLocation = () => {
    const context = useContext(DeliveryLocationContext);
    if (context === undefined) {
        throw new Error('useDeliveryLocation must be used within a DeliveryLocationProvider');
    }
    return context;
};
