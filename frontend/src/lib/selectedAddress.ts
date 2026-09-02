/**
 * The customer's currently chosen delivery address.
 *
 * Kept in localStorage so the choice survives navigation between Explore and a
 * vendor's page.
 *
 * Coordinates are optional. They're set when the customer used "current
 * location", or picked a saved address that already had them. A hand-typed
 * address has none until someone geocodes it, which needs a paid service and
 * isn't wired up. When coordinates are present the backend can do a real
 * proximity search; otherwise it falls back to matching the address text.
 */

import type { Coordinates } from '../types/models';

const STORAGE_KEY = 'nc_selected_address';

export type SelectedAddress = {
    label: string;
    coords?: Coordinates | null;
};

export function getSelectedAddress(): SelectedAddress | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;

        // Older builds stored a bare string. Read those rather than throwing
        // away someone's saved choice on upgrade.
        if (!raw.startsWith('{')) return { label: raw };

        const parsed = JSON.parse(raw) as SelectedAddress;
        return parsed?.label ? parsed : null;
    } catch {
        // Private browsing, blocked storage, or malformed JSON.
        return null;
    }
}

export function setSelectedAddress(selection: SelectedAddress | null): void {
    try {
        if (selection?.label) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    } catch {
        // Ignore — React state still drives the current session.
    }
}
