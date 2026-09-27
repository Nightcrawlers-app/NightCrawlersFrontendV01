/**
 * Browser geolocation.
 *
 * Uses the built-in `navigator.geolocation` API for the coordinates, then our
 * backend's /api/geo/reverse (OpenStreetMap, free) to turn the point into a
 * readable address like "12 Admiralty Way, Lekki, Lagos". If that lookup
 * fails, the position is still used, just labelled "Current location".
 *
 * Note: browsers only allow geolocation on HTTPS pages (and localhost).
 */

import type { Coordinates } from '../types/models';
import { reverseGeocode } from '../services/api';

export type GeolocationFailure =
    | 'unsupported'
    | 'denied'
    | 'unavailable'
    | 'timeout';

export class GeolocationError extends Error {
    reason: GeolocationFailure;

    constructor(reason: GeolocationFailure, message: string) {
        super(message);
        this.name = 'GeolocationError';
        this.reason = reason;
    }
}

const MESSAGES: Record<GeolocationFailure, string> = {
    unsupported: "This browser can't share your location.",
    denied: 'Location access was blocked. You can allow it in your browser settings, or type an address instead.',
    unavailable: "Couldn't work out where you are. Try again, or type an address instead.",
    timeout: 'Finding your location took too long. Try again, or type an address instead.',
};

/** Human-readable label for a position we can't yet turn into an address. */
export const CURRENT_LOCATION_LABEL = 'Current location';

/**
 * Ask the browser for the user's position.
 *
 * Rejects with a `GeolocationError` carrying a message that's safe to show
 * directly in the UI. Note this triggers the browser's permission prompt, so
 * only call it from a real user action, never on page load.
 */
export function getCurrentPosition(timeoutMs = 10000): Promise<Coordinates> {
    return new Promise((resolve, reject) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            reject(new GeolocationError('unsupported', MESSAGES.unsupported));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
            },
            (error) => {
                let reason: GeolocationFailure = 'unavailable';
                if (error.code === error.PERMISSION_DENIED) reason = 'denied';
                else if (error.code === error.TIMEOUT) reason = 'timeout';
                reject(new GeolocationError(reason, MESSAGES[reason]));
            },
            { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 },
        );
    });
}

/**
 * Get the user's position AND a readable address for it.
 * Rejects only if the browser can't give a position; a failed address lookup
 * falls back to the "Current location" label.
 */
export async function locateWithAddress(timeoutMs = 10000): Promise<{ label: string; city: string; coords: Coordinates }> {
    const coords = await getCurrentPosition(timeoutMs);
    try {
        const place = await reverseGeocode(coords);
        return { label: place.label || CURRENT_LOCATION_LABEL, city: place.city || '', coords };
    } catch {
        return { label: CURRENT_LOCATION_LABEL, city: '', coords };
    }
}
