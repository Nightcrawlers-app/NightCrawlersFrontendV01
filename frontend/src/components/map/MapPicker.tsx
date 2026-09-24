import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Search, LocateFixed, Loader2, MapPin } from 'lucide-react';
import { loadLeaflet, TILE_URL, TILE_ATTRIBUTION, DEFAULT_CENTER } from '../../lib/leaflet';
import type { LeafletMap, LatLngTuple } from '../../lib/leaflet';
import { getCurrentPosition } from '../../lib/geolocation';
import { reverseGeocode, searchPlaces, toErrorMessage } from '../../services/api';
import type { PlaceResult } from '../../services/api';
import type { Coordinates } from '../../types/models';

export type PickedLocation = {
    /** Short readable address, e.g. "12 Admiralty Way, Lekki, Lagos". */
    label: string;
    fullAddress: string;
    city: string;
    coords: Coordinates;
};

interface MapPickerProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (location: PickedLocation) => void;
    title?: string;
    confirmText?: string;
    /** Start here (e.g. an address the user already has). */
    initialCoords?: Coordinates | null;
    /** Text the user typed — looked up and shown on the map for them to confirm. */
    initialQuery?: string;
    /** Jump straight to the device's GPS position when the map opens. */
    autoLocate?: boolean;
}

const toTuple = (c: Coordinates): LatLngTuple => [c.latitude, c.longitude];

/**
 * Full-screen-ish map where the user drags the map under a fixed centre pin
 * (the Uber/Glovo pattern — easier on phones than dragging a tiny marker).
 * The address under the pin is looked up as they move, and they can also
 * search or jump to their GPS position.
 */
const MapPicker: React.FC<MapPickerProps> = ({
    open,
    onClose,
    onConfirm,
    title = 'Choose location',
    confirmText = 'Confirm location',
    initialCoords,
    initialQuery,
    autoLocate = false,
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<LeafletMap | null>(null);
    // When we already know the address for the next map move (search result),
    // skip the reverse lookup for that move.
    const knownPlaceRef = useRef<PlaceResult | null>(null);
    const lookupIdRef = useRef(0);
    const lookupTimerRef = useRef<number | undefined>(undefined);

    const [mapError, setMapError] = useState('');
    const [mapReady, setMapReady] = useState(false);
    const [moving, setMoving] = useState(false);
    const [center, setCenter] = useState<Coordinates>(initialCoords ?? DEFAULT_CENTER);
    const [place, setPlace] = useState<PlaceResult | null>(null);
    const [resolving, setResolving] = useState(false);
    const [locating, setLocating] = useState(false);
    const [locateError, setLocateError] = useState('');

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PlaceResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);

    // ── Address lookup for whatever is under the pin ─────────────────────────
    const lookUp = useCallback((coords: Coordinates) => {
        window.clearTimeout(lookupTimerRef.current);
        const known = knownPlaceRef.current;
        knownPlaceRef.current = null;
        // Only reuse the searched place if the map actually landed on it
        // (~50 m); otherwise it's a stale result and we look up the new spot.
        if (
            known &&
            Math.abs(known.latitude - coords.latitude) < 0.0005 &&
            Math.abs(known.longitude - coords.longitude) < 0.0005
        ) {
            setPlace(known);
            setResolving(false);
            return;
        }
        setResolving(true);
        const id = ++lookupIdRef.current;
        lookupTimerRef.current = window.setTimeout(async () => {
            try {
                const found = await reverseGeocode(coords);
                if (id === lookupIdRef.current) setPlace(found.label ? found : null);
            } catch {
                if (id === lookupIdRef.current) setPlace(null);
            } finally {
                if (id === lookupIdRef.current) setResolving(false);
            }
        }, 450);
    }, []);

    const flyTo = useCallback((coords: Coordinates, zoom = 17) => {
        mapRef.current?.flyTo(toTuple(coords), zoom, { duration: 0.6 });
    }, []);

    const locateMe = useCallback(async () => {
        setLocating(true);
        setLocateError('');
        try {
            flyTo(await getCurrentPosition());
        } catch (err) {
            setLocateError(toErrorMessage(err, "Couldn't find your location."));
        } finally {
            setLocating(false);
        }
    }, [flyTo]);

    // ── Create / destroy the map with the modal ──────────────────────────────
    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setMapError('');
        setPlace(null);
        setQuery(initialQuery ?? '');
        setResults([]);
        setLocateError('');

        const start = initialCoords ?? DEFAULT_CENTER;
        setCenter(start);

        loadLeaflet()
            .then((L) => {
                if (cancelled || !containerRef.current) return;
                const map = L.map(containerRef.current, { zoomControl: false });
                map.setView(toTuple(start), initialCoords ? 17 : 12, { animate: false });
                L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(map);
                L.control.zoom({ position: 'topright' }).addTo(map);

                map.on('movestart', () => setMoving(true));
                map.on('moveend', () => {
                    const c = map.getCenter();
                    const next = { latitude: c.lat, longitude: c.lng };
                    setMoving(false);
                    setCenter(next);
                    lookUp(next);
                });
                // Tap anywhere to move the pin there.
                map.on('click', (e) => {
                    if (e.latlng) map.flyTo([e.latlng.lat, e.latlng.lng], Math.max(map.getZoom(), 16));
                });

                mapRef.current = map;
                setMapReady(true);
                // The modal animates in; make Leaflet re-measure once it has.
                window.setTimeout(() => map.invalidateSize(), 60);

                if (initialCoords) {
                    lookUp(start);
                } else if (initialQuery?.trim()) {
                    // "Type it out and have the map confirm it"
                    setResolving(true);
                    searchPlaces(initialQuery.trim())
                        .then((found) => {
                            if (cancelled) return;
                            if (!found.length) {
                                lookUp(start);
                                setShowResults(true); // let them refine the text
                                return;
                            }
                            knownPlaceRef.current = found[0];
                            flyTo(found[0], 17);
                        })
                        .catch(() => !cancelled && lookUp(start));
                } else if (autoLocate) {
                    lookUp(start);
                    locateMe();
                } else {
                    lookUp(start);
                }
            })
            .catch((err) => !cancelled && setMapError(toErrorMessage(err, "Couldn't load the map.")));

        return () => {
            cancelled = true;
            window.clearTimeout(lookupTimerRef.current);
            mapRef.current?.remove();
            mapRef.current = null;
            setMapReady(false);
        };
        // Only re-run when the picker is opened/closed.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // ── Search box (debounced) ───────────────────────────────────────────────
    useEffect(() => {
        const q = query.trim();
        if (!open || q.length < 3 || !showResults) {
            setResults([]);
            setSearching(false);
            return;
        }
        const controller = new AbortController();
        setSearching(true);
        const timer = window.setTimeout(async () => {
            try {
                setResults(await searchPlaces(q, controller.signal));
            } catch {
                if (!controller.signal.aborted) setResults([]);
            } finally {
                if (!controller.signal.aborted) setSearching(false);
            }
        }, 400);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [query, open, showResults]);

    // Esc closes
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    const pickResult = (r: PlaceResult) => {
        knownPlaceRef.current = r;
        setQuery(r.label ?? '');
        setShowResults(false);
        setResults([]);
        flyTo(r);
    };

    const confirm = () => {
        const fallback = `Pinned location (${center.latitude.toFixed(5)}, ${center.longitude.toFixed(5)})`;
        onConfirm({
            label: place?.label || fallback,
            fullAddress: place?.fullAddress || place?.label || fallback,
            city: place?.city || '',
            coords: center,
        });
    };

    const busy = moving || resolving;

    return (
        <div
            className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <div className="bg-white w-full sm:w-[92%] sm:max-w-[600px] h-[92vh] sm:h-[min(88vh,680px)] rounded-t-[20px] sm:rounded-[16px] shadow-2xl flex flex-col overflow-hidden font-poppins">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-4 pb-3">
                    <h2 className="text-[18px] font-semibold text-[#222222]">{title}</h2>
                    <button onClick={onClose} aria-label="Close" className="text-[#667085] hover:text-[#222222] p-1">
                        <X size={22} />
                    </button>
                </div>

                {/* Search */}
                <div className="relative px-5 pb-3">
                    <Search size={16} className="absolute left-8 top-[13px] text-[#98A2B3] pointer-events-none" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setShowResults(true);
                        }}
                        onFocus={() => setShowResults(true)}
                        onKeyDown={(e) => {
                            if (e.key !== 'Enter') return;
                            // Never let Enter submit a form this picker sits inside.
                            e.preventDefault();
                            if (results[0]) pickResult(results[0]);
                        }}
                        placeholder="Search a street, estate or landmark"
                        className="w-full h-[42px] pl-9 pr-9 bg-[#F9FAFB] border border-[#EAECF0] rounded-[8px] text-[15px] text-[#222222] placeholder:text-[#98A2B3] outline-none focus:border-[#C62222] transition-colors"
                    />
                    {searching && (
                        <Loader2 size={16} className="absolute right-8 top-[13px] text-[#C62222] animate-spin" />
                    )}
                    {showResults && results.length > 0 && (
                        <ul className="absolute left-5 right-5 top-[46px] z-[500] bg-white border border-[#EAECF0] rounded-[10px] shadow-lg max-h-[240px] overflow-y-auto py-1">
                            {results.map((r) => (
                                <li key={`${r.latitude},${r.longitude}`}>
                                    <button
                                        type="button"
                                        onClick={() => pickResult(r)}
                                        className="w-full text-left px-4 py-2.5 hover:bg-[#F9FAFB] flex gap-2.5"
                                    >
                                        <MapPin size={15} className="text-[#C62222] mt-[3px] flex-shrink-0" />
                                        <span className="min-w-0">
                                            <span className="block text-[14px] font-medium text-[#222222] truncate">{r.label}</span>
                                            <span className="block text-[12px] text-[#667085] truncate">{r.fullAddress}</span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Map */}
                <div className="relative flex-1 min-h-0 bg-[#EEF1F4]" onPointerDown={() => setShowResults(false)}>
                    <div ref={containerRef} className="absolute inset-0 z-0" />

                    {!mapReady && !mapError && (
                        <div className="absolute inset-0 flex items-center justify-center text-[#667085] text-sm gap-2">
                            <Loader2 size={18} className="animate-spin text-[#C62222]" /> Loading map…
                        </div>
                    )}
                    {mapError && (
                        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-[#991B1B]">
                            {mapError}
                        </div>
                    )}

                    {/* Fixed centre pin — the map moves underneath it */}
                    {mapReady && (
                        <div className="pointer-events-none absolute left-1/2 top-1/2 z-[400] -translate-x-1/2 -translate-y-full">
                            <div className={`transition-transform duration-150 ${moving ? '-translate-y-2' : ''}`}>
                                <svg width="36" height="46" viewBox="0 0 36 46" aria-hidden="true">
                                    <path
                                        d="M18 0C8.06 0 0 8.06 0 18c0 12.6 15.3 26.2 16 26.8a3 3 0 0 0 4 0C20.7 44.2 36 30.6 36 18 36 8.06 27.94 0 18 0Z"
                                        fill="#C62222"
                                    />
                                    <circle cx="18" cy="18" r="6.5" fill="#fff" />
                                </svg>
                            </div>
                            <div
                                className={`mx-auto -mt-[3px] h-[6px] rounded-full bg-black/25 transition-all duration-150 ${moving ? 'w-[10px] opacity-60' : 'w-[16px]'}`}
                            />
                        </div>
                    )}

                    {mapReady && (
                        <button
                            type="button"
                            onClick={locateMe}
                            disabled={locating}
                            aria-label="Use my current location"
                            className="absolute right-3 bottom-3 z-[400] w-11 h-11 rounded-full bg-white shadow-md flex items-center justify-center text-[#C62222] hover:bg-[#FFF5F5] disabled:opacity-60"
                        >
                            {locating ? <Loader2 size={20} className="animate-spin" /> : <LocateFixed size={20} />}
                        </button>
                    )}
                    {locateError && (
                        <div className="absolute left-3 right-16 bottom-3 z-[400] bg-white/95 border border-[#F5C2C2] text-[#991B1B] text-[12px] rounded-lg px-3 py-2 shadow">
                            {locateError}
                        </div>
                    )}
                </div>

                {/* Address under the pin + confirm */}
                <div className="px-5 pt-3 pb-5 border-t border-[#EAECF0] bg-white">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#98A2B3] mb-1">
                        {busy ? 'Finding address…' : 'Pin is at'}
                    </p>
                    <p className="text-[15px] font-medium text-[#222222] min-h-[22px] truncate">
                        {busy ? '\u00a0' : place?.label || 'Unnamed spot — the pin position will be used'}
                    </p>
                    {!busy && place?.fullAddress && (
                        <p className="text-[12px] text-[#667085] truncate">{place.fullAddress}</p>
                    )}
                    <p className="text-[12px] text-[#98A2B3] mt-1.5">Drag the map so the pin sits on the exact spot.</p>
                    <button
                        type="button"
                        onClick={confirm}
                        disabled={!mapReady || busy}
                        className="mt-3 w-full h-[46px] rounded-[8px] bg-[#C62222] text-white text-[15px] font-semibold hover:bg-[#A01B1B] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MapPicker;
