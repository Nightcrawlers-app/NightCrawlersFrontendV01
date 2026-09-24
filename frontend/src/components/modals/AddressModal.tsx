import React, { useState, useMemo, useEffect } from 'react';
import { X, Plus, Crosshair, Loader2, MapPin, Map as MapIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import pinIcon from '../../assets/location-pin-red.svg';
import { useAuth } from '../../context/AuthContext';
import MapPicker from '../map/MapPicker';
import type { PickedLocation } from '../map/MapPicker';
import { searchPlaces } from '../../services/api';
import type { PlaceResult } from '../../services/api';
import type { Coordinates } from '../../types/models';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Coordinates are passed when we have them, e.g. from "current location". */
  onSelectAddress: (address: string, coords?: Coordinates | null) => void;
}

const AddressModal: React.FC<AddressModalProps> = ({ isOpen, onClose, onSelectAddress }) => {
  const { user, isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  // The map picker: 'locate' opens it on the user's GPS position.
  const [mapMode, setMapMode] = useState<null | 'locate' | 'pick'>(null);
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);

  // The customer's own saved addresses, default first. Signed-out visitors get
  // an empty list and type an address instead.
  const savedAddresses = useMemo(() => {
    if (!user?.addresses?.length) return [];
    return [...user.addresses]
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
      .map((addr) => ({
        id: addr.id,
        label: addr.label,
        value: addr.address,
        city: addr.city,
        isDefault: addr.isDefault,
        coords:
          addr.latitude != null && addr.longitude != null
            ? { latitude: addr.latitude, longitude: addr.longitude }
            : null,
      }));
  }, [user]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return savedAddresses;
    return savedAddresses.filter(
      (a) =>
        a.value.toLowerCase().includes(q) ||
        a.label.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q),
    );
  }, [savedAddresses, searchTerm]);

  // Address autocomplete: look the typed text up (debounced) so a typed
  // address comes with coordinates, which is what "near me" search needs.
  const query = searchTerm.trim();
  useEffect(() => {
    if (!isOpen || query.length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        setSuggestions(await searchPlaces(query, controller.signal));
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, isOpen]);

  if (!isOpen) return null;

  const choose = (address: string, coords?: Coordinates | null) => {
    onSelectAddress(address, coords ?? null);
    setSearchTerm('');
    setSuggestions([]);
    setMapMode(null);
    onClose();
  };

  const typed = searchTerm.trim();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    // Prefer a saved address, then the best lookup match, then the raw text.
    if (filtered.length > 0) choose(filtered[0].value, filtered[0].coords);
    else if (suggestions.length > 0) choosePlace(suggestions[0]);
    else if (typed) choose(typed);
  };

  const choosePlace = (place: PlaceResult) =>
    choose(place.label || place.fullAddress || typed, {
      latitude: place.latitude,
      longitude: place.longitude,
    });

  const handlePicked = (picked: PickedLocation) => choose(picked.label, picked.coords);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-[16px] w-[90%] max-w-[500px] p-[24px] shadow-xl relative animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className="flex items-center justify-between mb-[24px]">
          <h2 className="text-[20px] font-semibold text-[#222222]">Delivery Address</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-[#667085] hover:text-[#222222] transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search / free-text entry */}
        <div className="relative mb-[16px]">
          <div className="absolute left-[16px] top-1/2 -translate-y-1/2 text-[#C62222]">
            <img src={pinIcon} alt="" className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder="Enter a delivery address"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-[48px] pl-[48px] pr-[16px] bg-[#F9FAFB] border border-[#EAECF0] rounded-[8px] text-[16px] text-[#222222] placeholder:text-[#667085] outline-none focus:border-[#C62222] transition-colors"
          />
        </div>

        {/* Current location */}
        <button
          type="button"
          onClick={() => setMapMode('locate')}
          className="w-full flex items-center gap-[10px] px-[16px] py-[12px] mb-[8px] border border-[#EAECF0] rounded-[8px] hover:bg-[#F9FAFB] transition-colors"
        >
          <Crosshair size={18} className="text-[#C62222] flex-shrink-0" />
          <span className="text-[14px] font-medium text-[#222222]">Use my current location</span>
        </button>
        <button
          type="button"
          onClick={() => setMapMode('pick')}
          className="w-full flex items-center gap-[10px] px-[16px] py-[12px] mb-[12px] border border-[#EAECF0] rounded-[8px] hover:bg-[#F9FAFB] transition-colors"
        >
          <MapIcon size={18} className="text-[#C62222] flex-shrink-0" />
          <span className="text-[14px] font-medium text-[#222222]">
            {typed ? `Find “${typed}” on the map` : 'Choose on the map'}
          </span>
        </button>

        {/* Saved addresses */}
        <div className="flex flex-col gap-[4px] min-h-[160px] max-h-[280px] overflow-y-auto border border-[#EAECF0] rounded-[12px] p-[12px] shadow-sm">
          {filtered.length > 0 ? (
            <>
              <p className="px-[16px] pt-[4px] pb-[8px] text-[11px] font-semibold uppercase tracking-wider text-[#98A2B3]">
                Saved addresses
              </p>
              {filtered.map((addr) => (
                <button
                  key={addr.id}
                  onClick={() => choose(addr.value, addr.coords)}
                  className="w-full text-left px-[16px] py-[12px] hover:bg-[#F9FAFB] rounded-[8px] transition-colors"
                >
                  <span className="flex items-center gap-[8px]">
                    <span className="text-[14px] font-medium text-[#222222]">{addr.label}</span>
                    {addr.isDefault && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#C62222] bg-[#FEECEC] px-[6px] py-[2px] rounded">
                        Default
                      </span>
                    )}
                  </span>
                  <span className="block text-[13px] text-[#667085] mt-[2px]">
                    {addr.value}{addr.city ? `, ${addr.city}` : ''}
                  </span>
                </button>
              ))}
            </>
          ) : typed ? (
            <>
              {searching && suggestions.length === 0 && (
                <div className="flex items-center gap-[8px] px-[16px] py-[12px] text-[13px] text-[#667085]">
                  <Loader2 size={14} className="animate-spin" /> Searching…
                </div>
              )}
              {suggestions.length > 0 && (
                <p className="px-[16px] pt-[4px] pb-[8px] text-[11px] font-semibold uppercase tracking-wider text-[#98A2B3]">
                  Matching places
                </p>
              )}
              {suggestions.map((place) => (
                <button
                  key={`${place.latitude},${place.longitude}`}
                  onClick={() => choosePlace(place)}
                  className="w-full text-left px-[16px] py-[12px] hover:bg-[#F9FAFB] rounded-[8px] transition-colors flex gap-[10px]"
                >
                  <MapPin size={16} className="text-[#C62222] flex-shrink-0 mt-[2px]" />
                  <span>
                    <span className="block text-[14px] font-medium text-[#222222]">{place.label}</span>
                    <span className="block text-[12px] text-[#667085] mt-[2px] line-clamp-1">{place.fullAddress}</span>
                  </span>
                </button>
              ))}
              <button
                onClick={() => choose(typed)}
                className="w-full text-left px-[16px] py-[12px] hover:bg-[#F9FAFB] rounded-[8px] transition-colors"
              >
                <span className="text-[14px] text-[#222222]">Deliver to “{typed}”</span>
                <span className="block text-[13px] text-[#667085] mt-[2px]">
                  {suggestions.length ? 'Use exactly what I typed' : 'Use this address'}
                </span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-[24px] px-[16px]">
              <p className="text-[14px] text-[#667085]">
                {isAuthenticated ? 'No saved addresses yet.' : 'Type an address to get started.'}
              </p>
              {isAuthenticated && (
                <Link
                  to="/user-profile"
                  onClick={onClose}
                  className="inline-flex items-center gap-[6px] mt-[12px] text-[13px] font-semibold text-[#C62222] hover:underline"
                >
                  <Plus size={14} />
                  Add one in your profile
                </Link>
              )}
            </div>
          )}
        </div>

      </div>

      <MapPicker
        open={mapMode !== null}
        onClose={() => setMapMode(null)}
        onConfirm={handlePicked}
        title="Delivery location"
        confirmText="Deliver here"
        autoLocate={mapMode === 'locate'}
        initialQuery={mapMode === 'pick' ? typed : undefined}
      />
    </div>
  );
};

export default AddressModal;
