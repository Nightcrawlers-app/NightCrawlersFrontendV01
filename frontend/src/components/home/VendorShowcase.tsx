import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Loader2, Store as StoreIcon } from 'lucide-react';
import { FEATURED_VENDORS } from '../../config/featuredVendors';
import type { FeaturedVendor } from '../../config/featuredVendors';
import { CATEGORY_DISPLAY } from '../../config/categories';
import { getStoreById, searchStores, getStoresForExplore, getBusinessTypeMeta } from '../../services/api';
import type { BusinessType, VendorStore } from '../../services/api';
import { useDeliveryLocation } from '../../context/DeliveryLocationContext';

const TILES_PER_TAB = 6;

type Tile =
  | { kind: 'featured'; key: string; name: string; image: string; vendor: FeaturedVendor }
  | { kind: 'store'; key: string; name: string; image: string; store: VendorStore };

/**
 * "Popular on Nightcrawlers" — tabs for every category, not just food.
 * Each tab shows the hand-picked brands from config/featuredVendors.ts first,
 * then real stores in that category (nearest to the customer first).
 */
const VendorShowcase: React.FC = () => {
  const navigate = useNavigate();
  const { deliveryAddress, coords } = useDeliveryLocation();
  const [tab, setTab] = useState<BusinessType>('Food');
  const [storesByTab, setStoresByTab] = useState<Partial<Record<BusinessType, VendorStore[]>>>({});
  const [loadingTab, setLoadingTab] = useState<BusinessType | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  // Real stores for the open tab (fetched once per tab)
  useEffect(() => {
    if (storesByTab[tab]) return;
    let cancelled = false;
    setLoadingTab(tab);
    getStoresForExplore(deliveryAddress, tab, coords)
      .then(async (list) => (list.length || !deliveryAddress ? list : getStoresForExplore(null, tab)))
      .then((list) => !cancelled && setStoresByTab((prev) => ({ ...prev, [tab]: list })))
      .catch(() => !cancelled && setStoresByTab((prev) => ({ ...prev, [tab]: [] })))
      .finally(() => !cancelled && setLoadingTab(null));
    return () => {
      cancelled = true;
    };
  }, [tab, storesByTab, deliveryAddress, coords]);

  const tiles: Tile[] = useMemo(() => {
    const featured: Tile[] = FEATURED_VENDORS.filter((v) => v.category === tab).map((v) => ({
      kind: 'featured',
      key: `f-${v.name}`,
      name: v.name,
      image: v.image,
      vendor: v,
    }));
    const taken = new Set(featured.map((f) => f.name.toLowerCase()));
    const real: Tile[] = (storesByTab[tab] || [])
      .filter((s) => ![...taken].some((n) => s.name.toLowerCase().includes(n)))
      .map((s) => ({ kind: 'store', key: `s-${s.id}`, name: s.name, image: s.imageUrl, store: s }));
    return [...featured, ...real].slice(0, TILES_PER_TAB);
  }, [tab, storesByTab]);

  const openFeatured = async (vendor: FeaturedVendor) => {
    if (opening) return;
    setOpening(vendor.name);
    try {
      const store = vendor.storeId
        ? await getStoreById(vendor.storeId)
        : (await searchStores(vendor.search, vendor.category))[0] ?? null;
      if (store) {
        navigate('/vendor-details', { state: store });
        return;
      }
    } catch {
      // fall through to Explore
    } finally {
      setOpening(null);
    }
    const params = new URLSearchParams({ search: vendor.search, category: vendor.category });
    navigate(`/explore?${params.toString()}`);
  };

  const meta = getBusinessTypeMeta(tab);

  return (
    <section className="flex flex-col items-center w-full max-w-[1386px] mx-auto gap-8 lg:gap-10 py-10 lg:py-14 px-4">
      <div className="flex flex-col sm:flex-row items-center justify-between w-full px-4 lg:px-8 gap-4">
        <h2 className="text-[#222222] text-2xl sm:text-3xl lg:text-[32px] font-semibold leading-[32px] sm:leading-[40px] font-poppins text-center sm:text-left">
          Popular on Nightcrawlers
        </h2>
        <Link
          to={`/explore?category=${encodeURIComponent(tab)}`}
          className="inline-flex items-center gap-2 bg-[#C62222] text-white text-[15px] sm:text-[16px] font-semibold font-poppins px-6 py-3 rounded-[8px] shadow-sm hover:bg-[#A01B1B] active:scale-[0.98] transition-all whitespace-nowrap"
        >
          Explore all {meta.plural}
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={3} />
        </Link>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Categories" className="w-full px-4 lg:px-8 -mt-2 flex gap-2 overflow-x-auto scrollbar-hide">
        {CATEGORY_DISPLAY.map((c) => (
          <button
            key={c.type}
            role="tab"
            aria-selected={tab === c.type}
            onClick={() => setTab(c.type)}
            className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium font-poppins transition-colors ${tab === c.type ? 'bg-[#C62222] border-[#C62222] text-white' : 'bg-white border-[#EAECF0] text-[#344054] hover:border-[#C62222]'}`}
          >
            <img src={c.icon} alt="" className="w-4 h-4 object-contain" />
            {c.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="w-full px-4 lg:px-8 min-h-[220px]">
        {loadingTab === tab && tiles.length === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-[#C62222]" />
          </div>
        ) : tiles.length === 0 ? (
          <div className="flex flex-col items-center text-center py-12 gap-3">
            <span className="w-14 h-14 rounded-full bg-[#FFF5F5] flex items-center justify-center">
              <StoreIcon className="text-[#C62222]" size={24} />
            </span>
            <p className="text-[#222222] font-semibold font-poppins">{meta.plural} are coming soon</p>
            <p className="text-sm text-[#667085] max-w-[360px]">
              We're signing up {meta.plural.toLowerCase()} near you. Run one?{' '}
              <Link to="/partner-signup" className="text-[#C62222] font-medium hover:underline">
                Partner with Nightcrawlers
              </Link>
              .
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
            {tiles.map((t) => (
              <li key={t.key}>
                <button
                  type="button"
                  onClick={() => (t.kind === 'featured' ? openFeatured(t.vendor) : navigate('/vendor-details', { state: t.store }))}
                  aria-label={`Open ${t.name}`}
                  className="group w-full flex flex-col items-center gap-3 focus:outline-none"
                >
                  <div className="relative w-full aspect-[158/167] overflow-hidden rounded-[10px] shadow-sm bg-[#F2F4F7] group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-[#C62222] transition-all">
                    <img src={t.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    {t.kind === 'featured' && opening === t.vendor.name && (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                        <Loader2 className="animate-spin text-[#C62222]" size={22} />
                      </div>
                    )}
                  </div>
                  <span className="text-[#222222] text-[14px] sm:text-[16px] font-medium font-poppins text-center line-clamp-2 group-hover:text-[#C62222]">
                    {t.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default VendorShowcase;
