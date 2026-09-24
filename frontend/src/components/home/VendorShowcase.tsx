import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Loader2 } from 'lucide-react';
import { FEATURED_VENDORS } from '../../config/featuredVendors';
import type { FeaturedVendor } from '../../config/featuredVendors';
import { getStoreById, searchStores } from '../../services/api';

/**
 * Brand tiles. Each one opens the real store on Night Crawlers (or Explore
 * filtered to it if the store isn't on the platform yet). The list lives in
 * config/featuredVendors.ts so it can double as a paid ad slot.
 */
const VendorShowcase: React.FC = () => {
  const navigate = useNavigate();
  const [opening, setOpening] = useState<string | null>(null);

  const openVendor = async (vendor: FeaturedVendor) => {
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
    const params = new URLSearchParams({ search: vendor.search });
    if (vendor.category) params.set('category', vendor.category);
    navigate(`/explore?${params.toString()}`);
  };

  return (
    <section className="flex flex-col items-center w-full max-w-[1386px] mx-auto gap-10 lg:gap-14 py-10 lg:py-14 px-4">
      <div className="flex flex-col sm:flex-row items-center justify-between w-full px-4 lg:px-8 gap-4">
        <h2 className="text-[#222222] text-2xl sm:text-3xl lg:text-[32px] font-semibold leading-[32px] sm:leading-[40px] lg:leading-[40px] tracking-normal font-poppins w-full sm:w-auto text-center sm:text-left">
          Order Tasty Meals through us
        </h2>
        <Link
          to="/explore?category=Food"
          className="inline-flex items-center gap-2 bg-[#C62222] text-white text-[15px] sm:text-[16px] font-semibold font-poppins px-6 py-3 rounded-[8px] shadow-sm hover:bg-[#A01B1B] active:scale-[0.98] transition-all whitespace-nowrap"
        >
          Explore all Restaurants
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={3} />
        </Link>
      </div>

      <div className="flex flex-wrap justify-center w-full gap-x-12 gap-y-10 sm:gap-x-20 lg:gap-x-[180px] lg:gap-y-[60px] max-w-[1100px]">
        {FEATURED_VENDORS.map((vendor) => (
          <button
            key={vendor.name}
            type="button"
            onClick={() => openVendor(vendor)}
            aria-label={`Order from ${vendor.name}`}
            className="group flex flex-col items-center gap-4 lg:gap-[14px] w-32 sm:w-40 lg:w-[180px] focus:outline-none"
          >
            <div className="relative w-32 h-36 sm:w-40 sm:h-44 lg:w-[158px] lg:h-[167px] overflow-hidden shadow-sm rounded-[6px] group-hover:scale-105 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-[#C62222] transition-all duration-300">
              <img src={vendor.image} alt="" className="w-full h-full object-cover" />
              {opening === vendor.name && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                  <Loader2 className="animate-spin text-[#C62222]" size={24} />
                </div>
              )}
            </div>
            <span className="text-[#c62222] text-lg sm:text-xl lg:text-[24px] font-medium leading-[30px] lg:leading-[36px] font-poppins text-center group-hover:underline">
              {vendor.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default VendorShowcase;
