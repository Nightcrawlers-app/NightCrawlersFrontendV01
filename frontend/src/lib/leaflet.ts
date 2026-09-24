/**
 * Leaflet (open-source maps) loaded on demand from cdnjs.
 *
 * Loaded lazily so the ~150 KB library only downloads when someone actually
 * opens a map, and with no npm install. Tiles come from OpenStreetMap by
 * default — free, no API key. OSM's tile servers are fine for early traffic;
 * when volume grows, point VITE_MAP_TILE_URL at a paid provider
 * (MapTiler, Stadia, Mapbox) without touching any component code.
 */

const LEAFLET_VERSION = '1.9.4';
const CDN = `https://cdnjs.cloudflare.com/ajax/libs/leaflet/${LEAFLET_VERSION}`;

export const TILE_URL =
    import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION =
    import.meta.env.VITE_MAP_TILE_ATTRIBUTION ||
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

/** Default view when we know nothing about the user: central Abuja. */
export const DEFAULT_CENTER = { latitude: 9.0579, longitude: 7.4951 };

// ── The small slice of Leaflet's API we use ──────────────────────────────────
export type LatLngTuple = [number, number];

export interface LeafletMap {
    setView(center: LatLngTuple, zoom?: number, options?: { animate?: boolean }): LeafletMap;
    flyTo(center: LatLngTuple, zoom?: number, options?: { duration?: number }): LeafletMap;
    getCenter(): { lat: number; lng: number };
    getZoom(): number;
    on(event: string, handler: (e: { latlng?: { lat: number; lng: number } }) => void): LeafletMap;
    off(event: string): LeafletMap;
    invalidateSize(): LeafletMap;
    remove(): void;
}

export interface LeafletStatic {
    map(
        el: HTMLElement,
        options?: { zoomControl?: boolean; attributionControl?: boolean },
    ): LeafletMap;
    tileLayer(url: string, options: { maxZoom?: number; attribution?: string }): { addTo(map: LeafletMap): unknown };
    control: {
        zoom(options: { position: string }): { addTo(map: LeafletMap): unknown };
    };
}

declare global {
    interface Window {
        L?: LeafletStatic;
    }
}

let loading: Promise<LeafletStatic> | null = null;

/** Resolve with the global Leaflet object, loading its CSS + JS the first time. */
export function loadLeaflet(): Promise<LeafletStatic> {
    if (window.L) return Promise.resolve(window.L);
    if (loading) return loading;

    loading = new Promise<LeafletStatic>((resolve, reject) => {
        if (!document.querySelector('link[data-leaflet]')) {
            const css = document.createElement('link');
            css.rel = 'stylesheet';
            css.href = `${CDN}/leaflet.min.css`;
            css.dataset.leaflet = 'true';
            document.head.appendChild(css);
        }

        const script = document.createElement('script');
        script.src = `${CDN}/leaflet.min.js`;
        script.async = true;
        script.onload = () => (window.L ? resolve(window.L) : reject(new Error('Map failed to load.')));
        script.onerror = () => {
            loading = null; // allow a retry
            reject(new Error("Couldn't load the map. Check your connection and try again."));
        };
        document.head.appendChild(script);
    });

    return loading;
}
