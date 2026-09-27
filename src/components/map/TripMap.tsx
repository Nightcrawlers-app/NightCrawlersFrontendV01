import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { loadLeaflet, TILE_URL, TILE_ATTRIBUTION } from '../../lib/leaflet';
import type { LeafletMap, LeafletMarker, LeafletPolyline, LatLngTuple } from '../../lib/leaflet';
import type { Coordinates } from '../../types/models';

interface TripMapProps {
  /** Road route to draw, [[lat, lng], …] */
  line?: [number, number][] | null;
  rider?: Coordinates | null;
  /** Where the rider is heading now (store before pickup, customer after) */
  destination?: Coordinates | null;
  destinationKind?: 'store' | 'customer';
  height?: number;
}

const pin = (color: string, emoji: string) =>
  `<div style="width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.35);border:2px solid #fff"><span style="transform:rotate(45deg);font-size:15px">${emoji}</span></div>`;

const riderDot =
  '<div style="width:20px;height:20px;border-radius:50%;background:#E00B0B;border:3px solid #fff;box-shadow:0 0 0 6px rgba(224,11,11,.25),0 1px 4px rgba(0,0,0,.4)"></div>';

const tuple = (c: Coordinates): LatLngTuple => [c.latitude, c.longitude];

/**
 * Live trip map: the road route, the rider's moving position and the
 * destination. Updates in place as new positions arrive (no flicker), and
 * frames the whole trip the first time it has something to show.
 */
const TripMap: React.FC<TripMapProps> = ({ line, rider, destination, destinationKind = 'customer', height = 220 }) => {
  const el = useRef<HTMLDivElement | null>(null);
  const map = useRef<LeafletMap | null>(null);
  const riderMarker = useRef<LeafletMarker | null>(null);
  const destMarker = useRef<LeafletMarker | null>(null);
  const route = useRef<LeafletPolyline | null>(null);
  const framed = useRef(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !el.current) return;
        const m = L.map(el.current, { zoomControl: false, attributionControl: true });
        L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(m);
        m.setView(destination ? tuple(destination) : [9.0579, 7.4951], 14, { animate: false });
        map.current = m;
        setReady(true);
        window.setTimeout(() => m.invalidateSize(), 60);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      riderMarker.current = destMarker.current = null;
      route.current = null;
      framed.current = false;
    };
    // Create once; the effect below updates layers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const L = window.L;
    const m = map.current;
    if (!ready || !L || !m) return;

    if (line && line.length > 1) {
      if (route.current) route.current.setLatLngs(line);
      else route.current = L.polyline(line, { color: '#E00B0B', weight: 5, opacity: 0.85 }).addTo(m) as LeafletPolyline;
    } else if (route.current) {
      route.current.remove();
      route.current = null;
    }

    if (destination) {
      const icon = L.divIcon({ html: pin(destinationKind === 'store' ? '#222222' : '#E00B0B', destinationKind === 'store' ? '🏪' : '🏠'), className: '', iconSize: [34, 34], iconAnchor: [17, 34] });
      if (destMarker.current) destMarker.current.setLatLng(tuple(destination));
      else destMarker.current = L.marker(tuple(destination), { icon, interactive: false }).addTo(m) as LeafletMarker;
    }

    if (rider) {
      const icon = L.divIcon({ html: riderDot, className: '', iconSize: [20, 20], iconAnchor: [10, 10] });
      if (riderMarker.current) riderMarker.current.setLatLng(tuple(rider));
      else riderMarker.current = L.marker(tuple(rider), { icon, zIndexOffset: 1000, interactive: false }).addTo(m) as LeafletMarker;
    }

    // Frame the trip once; after that, let the user pan and zoom freely.
    if (!framed.current && (rider || destination)) {
      const pts: LatLngTuple[] = [
        ...(line && line.length > 1 ? line : []),
        ...(rider ? [tuple(rider)] : []),
        ...(destination ? [tuple(destination)] : []),
      ];
      if (pts.length > 1) m.fitBounds(pts, { padding: [30, 30], maxZoom: 16, animate: false });
      else m.setView(pts[0], 15, { animate: false });
      framed.current = true;
    }
  }, [ready, line, rider, destination, destinationKind]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-[#EEF1F4]" style={{ height }}>
      <div ref={el} className="absolute inset-0 z-0" />
      {!ready && !failed && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs gap-2">
          <Loader2 size={16} className="animate-spin text-[#E00B0B]" /> Loading map…
        </div>
      )}
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs p-4 text-center">
          The map couldn't load. Distance and time are still updating.
        </div>
      )}
    </div>
  );
};

export default TripMap;
