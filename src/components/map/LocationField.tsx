import React, { useEffect, useRef, useState } from 'react';
import { MapPin, CheckCircle2, Loader2 } from 'lucide-react';
import MapPicker from './MapPicker';
import type { PickedLocation } from './MapPicker';
import { searchPlaces } from '../../services/api';
import type { PlaceResult } from '../../services/api';
import type { Coordinates } from '../../types/models';

export type LocationValue = { address: string; coords: Coordinates | null };

interface LocationFieldProps {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  placeholder?: string;
  /** Title of the map window, e.g. "Where is this branch?" */
  mapTitle?: string;
  inputClassName?: string;
  required?: boolean;
  id?: string;
}

/**
 * An address box that matches places as you type (like the customer address
 * picker) and lets you confirm or pick the exact spot on a map.
 *
 * Editing the text by hand clears the pin, so the saved position always
 * matches the address shown. The backend geocodes the text if no pin is set.
 */
const LocationField: React.FC<LocationFieldProps> = ({
  value,
  onChange,
  placeholder = 'Start typing an address or landmark',
  mapTitle = 'Choose location',
  inputClassName = '',
  required,
  id,
}) => {
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const typedRef = useRef(false); // only search after the user types, not on load

  useEffect(() => {
    const q = value.address.trim();
    if (!typedRef.current || q.length < 3 || value.coords) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        setSuggestions(await searchPlaces(q, controller.signal));
        setOpen(true);
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value.address, value.coords]);

  const choose = (p: PlaceResult) => {
    onChange({ address: p.label || p.fullAddress || value.address, coords: { latitude: p.latitude, longitude: p.longitude } });
    setOpen(false);
    setSuggestions([]);
  };

  const onPicked = (picked: PickedLocation) => {
    onChange({ address: picked.label, coords: picked.coords });
    setShowMap(false);
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <input
            id={id}
            type="text"
            value={value.address}
            onChange={(e) => {
              typedRef.current = true;
              onChange({ address: e.target.value, coords: null });
            }}
            onFocus={() => suggestions.length && setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && open && suggestions[0]) {
                e.preventDefault();
                choose(suggestions[0]);
              }
            }}
            placeholder={placeholder}
            className={`${inputClassName} pr-8`}
            required={required}
            autoComplete="off"
          />
          {searching && (
            <Loader2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-[#E00B0B]" />
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowMap(true)}
          className="shrink-0 px-3 inline-flex items-center gap-1.5 border border-[#E00B0B] text-[#E00B0B] rounded-md text-xs font-semibold hover:bg-[#FFF5F5] transition"
        >
          <MapPin size={15} />
          {value.coords ? 'Move pin' : value.address.trim() ? 'Confirm on map' : 'Pick on map'}
        </button>
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto py-1">
          {suggestions.map((p) => (
            <li key={`${p.latitude},${p.longitude}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(p)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex gap-2"
              >
                <MapPin size={14} className="text-[#E00B0B] mt-0.5 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-900 truncate">{p.label}</span>
                  <span className="block text-xs text-gray-500 truncate">{p.fullAddress}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className={`mt-1 text-[11px] ${value.coords ? 'text-green-700' : 'text-gray-500'} flex items-center gap-1`}>
        {value.coords ? (
          <>
            <CheckCircle2 size={12} /> Location confirmed on the map
          </>
        ) : (
          'Pick a suggestion or confirm on the map so customers and riders find the exact spot.'
        )}
      </p>

      <MapPicker
        open={showMap}
        onClose={() => setShowMap(false)}
        onConfirm={onPicked}
        title={mapTitle}
        confirmText="Use this location"
        initialCoords={value.coords}
        initialQuery={value.coords ? undefined : value.address}
        autoLocate={!value.coords && !value.address.trim()}
      />
    </div>
  );
};

export default LocationField;
