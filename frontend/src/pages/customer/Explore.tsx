import React, { useEffect, useRef, useState } from 'react';
import { Search, ChevronDown, ShoppingBasket, X, Clock, Heart, Trash2, Tag } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import AddressModal from '../../components/modals/AddressModal';
import { useCart } from '../../context/CartContext';
import pinIcon from '../../assets/location-pin-red.svg';
import { BUSINESS_TYPES, BusinessType, VendorStore, getBusinessTypeMeta, getStoresForExplore, getStoreById, getPromotion, describeDiscount, toErrorMessage } from '../../services/api';
import type { Promotion } from '../../services/api';
import PromoCarousel from '../../components/promotions/PromoCarousel';
import { usePromotion } from '../../context/PromotionContext';
import { useDeliveryLocation } from '../../context/DeliveryLocationContext';
import type { Coordinates } from '../../types/models';
import groceriesIcon from '../../assets/category-groceries.png';
import pharmacyIcon from '../../assets/category-pharmacy.png';
import clubsIcon from '../../assets/category-clubs.png';
import foodIcon from '../../assets/category-food.png';
import drinksIcon from '../../assets/category-drinks.png';
import PhoneVerificationModal from '../../components/ui/PhoneVerificationModal';
import { useAuth } from '@/context/AuthContext';

// import emptyStateImage from '../../assets/empty-state.png';
// import promoBanner from '../../assets/signin-image.png'; // Using placeholder for now, ideally would be specific promo image

interface CategoryItemProps {
  name: string;
  icon?: React.ReactNode;
  imageSrc?: string;
  bgColor: string;
  blobShape: string;
  iconColor?: string;
  onClick?: () => void;
}

const CategoryItem: React.FC<CategoryItemProps> = ({ name, icon, imageSrc, bgColor, blobShape, iconColor = "text-[#222222]", onClick }) => {
  return (
    <div className="flex flex-col items-center gap-[8px] sm:gap-[12px]" onClick={onClick}>
      <div
        className={`w-[80px] h-[80px] sm:w-[95px] sm:h-[95px] md:w-[110px] md:h-[110px] flex items-center justify-center ${bgColor} transition-transform hover:scale-105 cursor-pointer`}
        style={{ borderRadius: blobShape }}
      >
        {imageSrc ? (
          <img src={imageSrc} alt={name} className="w-[48px] h-[48px] object-contain drop-shadow-sm" />
        ) : (
          <div className={`${iconColor}`}>
            {icon && React.cloneElement(icon as React.ReactElement, { size: 24 })}
          </div>
        )}
      </div>
      <span className="text-[#222222] text-[12px] sm:text-[13px] md:text-[14px] font-medium leading-[18px] sm:leading-[20px] text-center">{name}</span>
    </div>
  );
};

interface StoreCardProps {
  name: string;
  rating: number;
  time: string;
  image: string;
  /** e.g. "50% OFF" when a live promo covers this store */
  badge?: string;
  /** Dishes that matched the search, e.g. ["Chicken Shawarma"] */
  matchedItems?: string[];
  onClick: () => void;
}

const StoreCard: React.FC<StoreCardProps> = ({ name, rating, time, image, badge, matchedItems, onClick }) => {
  return (
    <div className="flex flex-col gap-[8px] sm:gap-[12px] w-full max-w-[280px] group cursor-pointer" onClick={onClick}>
      <div className="relative w-full h-[140px] sm:h-[160px] md:h-[180px] rounded-[8px] sm:rounded-[10px] md:rounded-[12px] overflow-hidden">
        <img src={image} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        {badge && (
          <span className="absolute left-[8px] top-[8px] sm:left-[12px] sm:top-[12px] inline-flex items-center gap-1 bg-[#C62222] text-white text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded-full shadow">
            <Tag size={11} /> {badge}
          </span>
        )}
        <button className="absolute top-[8px] right-[8px] sm:top-[12px] sm:right-[12px] w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors">
          <Heart size={14} className="text-[#C62222]" />
        </button>
      </div>
      <div className="flex flex-col gap-[3px] sm:gap-[4px]">
        <div className="flex items-center justify-between">
          <h3 className="text-[#222222] text-[14px] sm:text-[15px] md:text-[16px] font-medium leading-[20px] sm:leading-[22px] md:leading-[24px]">{name}</h3>
          <div className="flex items-center gap-[3px] sm:gap-[4px]">
            <span className="text-[#222222] text-[11px] sm:text-[12px] font-medium">{rating}</span>
            <div className="w-[10px] h-[10px] sm:w-[12px] sm:h-[12px] bg-[#FFD700] rounded-full"></div>
          </div>
        </div>
        <div className="flex items-center gap-[4px] sm:gap-[6px] text-[#667085]">
          <Clock size={12} />
          <span className="text-[11px] sm:text-[12px] leading-[16px] sm:leading-[18px]">{time}</span>
        </div>
        {matchedItems && matchedItems.length > 0 && (
          <p className="text-[11px] sm:text-[12px] text-[#C62222] truncate">Has: {matchedItems.join(', ')}</p>
        )}
      </div>
    </div>
  );
};

const Explore: React.FC = () => {
  const navigate = useNavigate();
  // Hooks must live inside the component. These two used to sit at module
  // level, which crashes the page with "Invalid hook call".
  const { user } = useAuth();
  const [showPhoneGate, setShowPhoneGate] = useState(false);
  // ?category=Food&search=KFC — used by the homepage brand tiles and buttons.
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category');
  // ?promo=<id> — browsing the stores a promo covers (after tapping a banner)
  const promoId = searchParams.get('promo');
  const { selectedPromotion, selectPromotion } = usePromotion();
  const [promoFilter, setPromoFilter] = useState<Promotion | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { cartItems, removeFromCart, clearCart, cartTotal } = useCart();
  // One source of truth, shared with the vendor page and checkout.
  const { label: selectedAddress, coords: selectedCoords, setLocation } = useDeliveryLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialCategory && BUSINESS_TYPES.includes(initialCategory as BusinessType) ? initialCategory : 'All',
  );
  // What's typed, and what's actually being searched. Typing searches after a
  // short pause; Enter or the Search button searches straight away.
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') ?? '');
  const [activeSearch, setActiveSearch] = useState(searchQuery.trim());
  const [stores, setStores] = useState<VendorStore[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [storesError, setStoresError] = useState('');
  const [storesReloadKey, setStoresReloadKey] = useState(0);
  const storesSectionRef = useRef<HTMLDivElement | null>(null);

  const handleOpenAddressModal = () => {
    setIsAddressModalOpen(true);
  };

  const handleCloseAddressModal = () => {
    setIsAddressModalOpen(false);
  };

  const handleSelectAddress = (address: string, coords?: Coordinates | null) => {
    setLocation(address || null, coords);
    setIsAddressModalOpen(false);
  };

  const toggleCart = () => {
    setIsCartOpen(!isCartOpen);
  };

  const handleStoreClick = (store: VendorStore) => {
    navigate('/vendor-details', { state: store });
  };

  // Tapping a promo banner: apply it, then take them where they can use it —
  // straight to the store if it's a one-store promo, otherwise the list of
  // stores it covers.
  const handlePromoSelect = async (promo: Promotion) => {
    selectPromotion(promo);
    if (promo.scope === 'stores' && promo.storeIds.length === 1) {
      try {
        const store = await getStoreById(promo.storeIds[0]);
        if (store) {
          navigate('/vendor-details', { state: store });
          return;
        }
      } catch {
        // fall back to the filtered list
      }
    }
    const next = new URLSearchParams(searchParams);
    next.set('promo', promo.id);
    setSearchParams(next);
    setSelectedCategory(promo.scope === 'category' && promo.businessType ? promo.businessType : 'All');
    storesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const clearPromoFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('promo');
    setSearchParams(next);
  };

  // Resolve ?promo=<id> into the promo itself (for the "Showing stores…" bar).
  useEffect(() => {
    if (!promoId) {
      setPromoFilter(null);
      return;
    }
    if (selectedPromotion?.id === promoId) {
      setPromoFilter(selectedPromotion);
      return;
    }
    let cancelled = false;
    getPromotion(promoId)
      .then((p) => {
        if (cancelled) return;
        setPromoFilter(p);
        if (p) selectPromotion(p);
      })
      .catch(() => !cancelled && setPromoFilter(null));
    return () => {
      cancelled = true;
    };
  }, [promoId, selectedPromotion, selectPromotion]);

  // Load stores whenever the address or category changes. If an address is
  // selected but returns nothing, fall back to showing stores from everywhere.
  useEffect(() => {
    let cancelled = false;
    const category = selectedCategory === 'All' ? undefined : (selectedCategory as BusinessType);

    const loadStores = async () => {
      setStoresLoading(true);
      setStoresError('');
      try {
        // Coordinates, when we have them, let the backend do a real proximity
        // search instead of matching the address text.
        let results = await getStoresForExplore(selectedAddress, category, selectedCoords, promoId, activeSearch);
        if (selectedAddress && results.length === 0) {
          // Nothing near them — widen to everywhere rather than show nothing.
          results = await getStoresForExplore(null, category, null, promoId, activeSearch);
        }
        if (cancelled) return;
        setStores(results);
      } catch (error) {
        if (cancelled) return;
        setStores([]);
        setStoresError(toErrorMessage(error, 'Could not load stores. Please try again.'));
      } finally {
        if (!cancelled) setStoresLoading(false);
      }
    };

    loadStores();
    return () => {
      cancelled = true;
    };
  }, [selectedAddress, selectedCoords, selectedCategory, storesReloadKey, promoId, activeSearch]);

  // The server does the searching (store names AND menu dishes).
  const displayedStores = stores;

  // Search after a pause in typing…
  useEffect(() => {
    const q = searchQuery.trim();
    if (q === activeSearch) return;
    const t = window.setTimeout(() => setActiveSearch(q), 450);
    return () => window.clearTimeout(t);
  }, [searchQuery, activeSearch]);

  // …or immediately on Enter / the Search button, and bring the results into
  // view — they sit below the promos and categories, which is why searching
  // used to look like it did nothing.
  const submitSearch = () => {
    setActiveSearch(searchQuery.trim());
    storesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const clearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
  };

  const handleCategoryClick = (name: string) => {
    setSelectedCategory(name);
    if (storesSectionRef.current) {
      storesSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };


  return (
    <div className="min-h-screen bg-white flex flex-col font-poppins relative overflow-x-hidden">
      <Header onCartClick={toggleCart} />

      {/* Main Content */}
      <main className="flex-grow w-full max-w-[1440px] mx-auto px-[16px] sm:px-[24px] md:px-[60px] pt-[16px] sm:pt-[20px] pb-[80px] sm:pb-[100px] flex flex-col lg:flex-row gap-[24px] lg:gap-[40px]">

        {/* Left Column (Main) */}
        <div className={`flex-grow transition-all duration-300 ${isCartOpen ? 'lg:mr-[400px]' : ''}`}>
          {/* Search and Address Row */}
          <div className="flex flex-row items-center justify-between gap-[10px] md:gap-[20px] mb-[40px] md:mb-[60px]">
            {/* Search Bar */}
            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                submitSearch();
              }}
              className="flex items-center w-[50%] md:w-[70%] max-w-[500px] h-[40px] border border-[#D0D5DD] rounded-[8px] overflow-hidden bg-white/50 focus-within:ring-2 focus-within:ring-[#C62222]/20 transition-all shadow-sm"
            >
              <input
                type="text"
                enterKeyHint="search"
                placeholder="Search restaurants, dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-grow h-full px-[12px] md:px-[16px] text-[13px] md:text-[14px] text-[#101828] bg-transparent outline-none placeholder:text-[#98A2B3] min-w-0"
              />
              {searchQuery && (
                <button type="button" onClick={clearSearch} aria-label="Clear search" className="px-2 text-[#98A2B3] hover:text-[#222222]">
                  <X size={16} />
                </button>
              )}
              <button
                type="submit"
                className="h-full px-4 md:px-6 bg-[#C62222] flex items-center justify-center gap-2 text-white hover:bg-[#A01B1B] transition-colors shrink-0 cursor-pointer"
                aria-label="Search"
              >
                <span className="hidden sm:inline text-[13px] font-medium">Search</span>
                <Search size={16} />
              </button>
            </form>

            {/* Address Selector */}
            <button
              onClick={handleOpenAddressModal}
              className="flex items-center gap-[6px] md:gap-[8px] cursor-pointer hover:opacity-80 shrink-0"
              aria-label="Select address"
            >
              <img src={pinIcon} alt="" className="w-[20px] h-[20px]" />
              <span className="text-[#344054] text-[14px] md:text-[16px] font-medium hidden sm:block max-w-[220px] truncate">
                {selectedAddress || 'Select address'}
              </span>
              <span className="text-[#344054] text-[14px] md:text-[16px] font-medium sm:hidden">
                {selectedAddress ? 'Address' : 'Address'}
              </span>
              <ChevronDown className="text-[#344054]" size={16} />
            </button>
          </div>

          {/* Promos — real, clickable, managed from the admin dashboard */}
          <PromoCarousel onSelect={handlePromoSelect} activeId={promoFilter?.id ?? null} />

          {/* Explore Categories */}
          <div className="mb-[40px] md:mb-[60px]">
            <h2 className="text-[18px] md:text-[20px] font-medium text-[#222222] mb-[24px] md:mb-[32px]">Explore Categories</h2>
            <div className="flex flex-row flex-nowrap overflow-x-auto snap-x snap-mandatory scrollbar-hide w-full gap-12 px-4 pb-4 -mx-4 md:pb-0 md:px-0 md:mx-0 md:justify-between md:gap-0">
              <div className="shrink-0 snap-center flex justify-center md:flex-1 md:justify-center">
                <CategoryItem
                  name="Groceries"
                  imageSrc={groceriesIcon}
                  bgColor="bg-[#FEE4E2]"
                  blobShape="45% 55% 40% 60% / 55% 45% 55% 45%"
                  onClick={() => handleCategoryClick('Groceries')}
                />
              </div>
              <div className="shrink-0 snap-center flex justify-center md:flex-1 md:justify-center">
                <CategoryItem
                  name="Pharmacy"
                  imageSrc={pharmacyIcon}
                  bgColor="bg-[#D1FADF]"
                  blobShape="55% 45% 60% 40% / 40% 60% 40% 60%"
                  onClick={() => handleCategoryClick('Pharmacy')}
                />
              </div>
              <div className="shrink-0 snap-center flex justify-center md:flex-1 md:justify-center">
                <CategoryItem
                  name="Clubs/Lounges"
                  imageSrc={clubsIcon}
                  bgColor="bg-[#D9D6FE]"
                  blobShape="40% 60% 55% 45% / 55% 45% 55% 45%"
                  onClick={() => handleCategoryClick('Clubs/Lounges')}
                />
              </div>
              <div className="shrink-0 snap-center flex justify-center md:flex-1 md:justify-center">
                <CategoryItem
                  name="Food"
                  imageSrc={foodIcon}
                  bgColor="bg-[#FEE4E2]"
                  blobShape="60% 40% 45% 55% / 45% 55% 45% 55%"
                  onClick={() => handleCategoryClick('Food')}
                />
              </div>
              <div className="shrink-0 snap-center flex justify-center md:flex-1 md:justify-center">
                <CategoryItem
                  name="Drinks"
                  imageSrc={drinksIcon}
                  bgColor="bg-[#FEF0C7]"
                  blobShape="50% 50% 60% 40% / 50% 60% 40% 60%"
                  onClick={() => handleCategoryClick('Drinks')}
                />
              </div>
            </div>
          </div>

          <>
            {/* All Stores */}
            {/* All Stores */}
            <div className="mb-[40px] md:mb-[60px] scroll-mt-[90px]" ref={storesSectionRef}>
              {promoFilter && (
                <div className="mb-[20px] flex items-start sm:items-center justify-between gap-3 rounded-[12px] border border-[#F5C2C2] bg-[#FFF5F5] px-4 py-3">
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <span className="mt-0.5 sm:mt-0 flex-shrink-0 w-8 h-8 rounded-full bg-[#C62222] text-white flex items-center justify-center">
                      <Tag size={15} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[#222222] truncate">{promoFilter.title}</p>
                      <p className="text-[12px] text-[#667085]">
                        {describeDiscount(promoFilter)} · applied at checkout automatically
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearPromoFilter}
                    className="flex-shrink-0 text-[13px] font-medium text-[#C62222] hover:underline"
                  >
                    Show all stores
                  </button>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h2 className="text-[18px] md:text-[20px] font-medium text-[#222222] mb-[16px] sm:mb-[24px] md:mb-[32px]">
                  {activeSearch
                    ? `Results for “${activeSearch}”`
                    : selectedCategory === 'All'
                      ? 'All Stores'
                      : getBusinessTypeMeta(selectedCategory as BusinessType).plural}
                </h2>
                {selectedCategory !== 'All' && !promoFilter && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('All')}
                    className="self-start sm:self-auto mb-[16px] sm:mb-[24px] md:mb-[32px] text-[13px] font-medium text-[#C62222] hover:underline"
                  >
                    Show all stores
                  </button>
                )}


              </div>
              {storesLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[16px] md:gap-[20px] lg:gap-[24px] justify-items-center">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="w-full max-w-[280px] animate-pulse">
                      <div className="w-full h-[160px] rounded-[12px] bg-gray-100" />
                      <div className="h-[14px] w-2/3 rounded bg-gray-100 mt-[12px]" />
                      <div className="h-[12px] w-1/3 rounded bg-gray-100 mt-[8px]" />
                    </div>
                  ))}
                </div>
              ) : storesError ? (
                <div className="w-full flex flex-col items-center justify-center py-10 gap-[12px]">
                  <p className="font-poppins font-medium text-[16px] leading-[24px] text-center text-[#101828]">
                    Couldn't load stores
                  </p>
                  <p className="font-poppins font-normal text-[14px] leading-[20px] text-center text-[#667085] max-w-[352px]">
                    {storesError}
                  </p>
                  <button
                    type="button"
                    onClick={() => setStoresReloadKey((k) => k + 1)}
                    className="mt-[4px] px-[20px] py-[10px] rounded-[8px] bg-[#C62222] text-white text-[14px] font-medium hover:bg-[#991B1B] transition-colors"
                  >
                    Try again
                  </button>
                </div>
              ) : displayedStores.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[16px] md:gap-[20px] lg:gap-[24px] justify-items-center">
                  {displayedStores.map((store) => (
                    <StoreCard
                      key={store.id}
                      name={store.name}
                      rating={4.5}
                      time="15-25 mins"
                      image={store.imageUrl}
                      badge={store.promotions?.[0]?.badge}
                      matchedItems={store.matchedItems}
                      onClick={() => handleStoreClick(store)}
                    />
                  ))}
                </div>
              ) : (
                <div className="w-full flex flex-col items-center justify-center py-10">
                  <div className="flex flex-col items-center gap-[16px] w-full max-w-[352px]">
                    <div className="w-[152px] h-[118px] relative flex-none">
                      {/* CSS-based Illustration */}
                      <div className="absolute left-[24px] top-0 w-[104px] h-[104px] rounded-full bg-[#E75757]/25"></div>
                      <div className="absolute left-[16px] top-[14px] w-[10px] h-[10px] rounded-full bg-[#E75757]/25"></div>
                      <div className="absolute left-[11px] top-[102px] w-[14px] h-[14px] rounded-full bg-[#E75757]/25"></div>
                      <div className="absolute left-[138px] top-[28px] w-[14px] h-[14px] rounded-full bg-[#E75757]/25"></div>
                      <div className="absolute left-[130px] top-[4px] w-[8px] h-[8px] rounded-full bg-[#E75757]/25"></div>

                      {/* Main Icon */}
                      <div className="absolute left-[52px] top-[28px] w-[48px] h-[48px] bg-white rounded-full shadow-sm border border-[#E75757]/10 flex items-center justify-center z-10">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.364 3.63604C20.0518 5.32387 21 7.61305 21 10Z"
                            stroke="#E75757"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray="4 4"
                          />
                          <circle cx="12" cy="10" r="3" stroke="#E75757" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-[4px] w-full">
                      <h3 className="font-poppins font-medium text-[16px] leading-[24px] text-center text-[#101828]">
                        {activeSearch ? 'No matches' : 'No stores here yet'}
                      </h3>
                      <p className="font-poppins font-normal text-[14px] leading-[20px] text-center text-[#667085]">
                        {activeSearch
                          ? `No stores or dishes match “${activeSearch}”. Try a different word, or clear the search.`
                          : 'Try another category or delivery address.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </>
        </div>

        {/* Right Cart Drawer */}
        <div
          className={`fixed top-0 right-0 h-full w-[320px] sm:w-[360px] md:w-[400px] bg-white shadow-[-4px_0_15px_rgba(0,0,0,0.1)] z-40 transform transition-transform duration-300 ease-in-out ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex flex-col h-full p-[24px]">
            {/* Cart Header */}
            <div className="flex items-center justify-between mb-[32px]">
              <div className="flex items-center gap-[8px]">
                <h2 className="text-[#C62222] text-[20px] font-medium">Cart</h2>
                <div className="w-[20px] h-[20px] bg-[#C62222] rounded-full flex items-center justify-center text-white text-[12px] font-bold">{cartItems.length}</div>
              </div>
              <button onClick={toggleCart} className="text-[#667085] hover:text-[#222222]">
                <X size={24} />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-grow overflow-y-auto">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-start h-full text-center pt-6">
                  <ShoppingBasket size={48} className="text-[#C62222] mb-2" />
                  <p className="text-[#667085] text-[12px]">Your Cart is empty</p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.id} className="bg-[#F9FAFB] p-[12px] rounded-[8px] flex gap-[12px] mb-[16px]">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-[60px] h-[60px] object-cover rounded-[4px]"
                    />
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <h3 className="text-[#222222] text-[14px] font-medium truncate w-[180px]">{item.name}</h3>
                        <span className="text-[#667085] text-[12px]">{item.quantity} Item{item.quantity > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex justify-between items-end mt-[4px]">
                        <p className="text-[#667085] text-[12px] leading-[16px]">
                          ₦{item.price.toLocaleString()}
                        </p>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-[#C62222] hover:text-[#A01B1B] p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {cartItems.length > 0 && (
                <div className="flex items-center justify-between mb-[24px] mt-4 border-t pt-4">
                  <span className="text-[#667085] text-[14px] font-medium">Total: ₦{cartTotal.toLocaleString()}</span>
                  <div className="flex items-center gap-[12px]">
                    <button
                    onClick={() => {
                      if (user && !user.phoneVerified) {
                        setShowPhoneGate(true);
                        return;
                      }
                      navigate('/order-summary');
                    }}
                    className="h-[36px] px-[16px] bg-[#C62222] text-white text-[12px] font-medium rounded-[4px] hover:bg-[#A01B1B] transition-colors"
                    >
                      Proceed to Checkout
                      </button>
                    </div>
                </div>
              )}

              {/* Clear Cart */}
              {cartItems.length > 0 && (
                <div className="mt-auto flex justify-end">
                  <button
                    onClick={clearCart}
                    className="h-[32px] px-[12px] bg-[#FEE4E2] text-[#C62222] text-[12px] font-medium rounded-[4px] hover:bg-[#FECDCA] transition-colors"
                  >
                    Clear Cart
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>


      </main >

      <Footer />

      {/* Address Modal */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={handleCloseAddressModal}
        onSelectAddress={handleSelectAddress}
      />

      {showPhoneGate && (
        <PhoneVerificationModal
        required
        onClose={() => setShowPhoneGate(false)}
        onVerified={() => {
          setShowPhoneGate(false);
          navigate('/order-summary');
        }}
      />
    )}
    </div >
  );
};

export default Explore;
