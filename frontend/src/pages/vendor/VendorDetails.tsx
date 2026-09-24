import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, ChevronDown, Clock, Plus, Trash2, ShoppingBasket, Minus, ChevronLeft, X, UtensilsCrossed, Tag } from 'lucide-react';
import { usePromotion } from '../../context/PromotionContext';
import AddressModal from '../../components/modals/AddressModal';
import { useDeliveryLocation } from '../../context/DeliveryLocationContext';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { useCart } from '../../context/CartContext';
import pinIcon from '../../assets/location-pin-red.svg';
import { VendorStore, getMenuItemsForStore, MenuItem, toErrorMessage, promotionAppliesToStore, describeDiscount } from '../../services/api';



const VendorDetails: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal } = useCart();
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  // Shared with the Explore page so the chosen delivery address follows the
  // customer around instead of resetting on every navigation.
  const { label: selectedAddress, setLocation } = useDeliveryLocation();
  const storeState = location.state as VendorStore | undefined;
  const { selectedPromotion } = usePromotion();

  // This page is reached by clicking a store on Explore, which passes the store
  // through router state. Landing here directly (bookmark, refresh, pasted URL)
  // means there's nothing to show — previously it invented a fake restaurant,
  // which let customers try to order from a store that doesn't exist.
  const store: VendorStore = storeState || {
    id: '',
    vendorId: '',
    name: '',
    description: '',
    address: '',
    openingTime: '',
    imageUrl: '',
    businessType: 'Food',
    categories: [],
    createdAt: new Date().toISOString(),
    closingTime: '',
  };

  // Fetch real menu items for this store
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadMenu = async () => {
      setMenuLoading(true);
      setMenuError('');
      try {
        const items = await getMenuItemsForStore(store.id);
        if (!cancelled) setMenuItems(items);
      } catch (error) {
        if (cancelled) return;
        setMenuItems([]);
        setMenuError(toErrorMessage(error, 'Could not load the menu. Please try again.'));
      } finally {
        if (!cancelled) setMenuLoading(false);
      }
    };

    loadMenu();
    return () => {
      cancelled = true;
    };
  }, [store.id]);

  // Get unique categories from menu items and store categories
  const displayCategories = useMemo(() => {
    const menuCategories = menuItems.flatMap((item) => item.categories);
    const allCategories = [...store.categories, ...menuCategories];
    const uniqueCategories = [...new Set(allCategories)].filter(Boolean);
    return ['All', ...uniqueCategories];
  }, [menuItems, store.categories]);

  // Filter menu items by selected category, then by the search box
  const filteredMenuItems = useMemo(() => {
    const byCategory = activeCategory === 'All'
      ? menuItems
      : menuItems.filter((item) => item.categories.includes(activeCategory));

    const q = searchQuery.trim().toLowerCase();
    if (!q) return byCategory;

    return byCategory.filter((item) =>
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.categories.some((c) => c.toLowerCase().includes(q)),
    );
  }, [menuItems, activeCategory, searchQuery]);

  const handleAddToCart = (item: MenuItem) => {
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.imageUrl,
      // Checkout needs to know which store the order is for. Without these
      // every order failed with "We couldn't tell which store this is for".
      storeId: store.id,
      storeName: store.name,
      vendorId: store.vendorId,
      vendorName: store.name,
      vendorImage: store.imageUrl
    });
  };

  const incrementCartItem = (id: string | number) => {
    const item = cartItems.find(i => i.id === id);
    if (item) updateQuantity(id, item.quantity + 1);
  };

  const decrementItem = (id: string | number) => {
    const item = cartItems.find(i => i.id === id);
    if (item && item.quantity > 1) {
      updateQuantity(id, item.quantity - 1);
    }
  };

  if (!store.id) {
    return (
      <div className="min-h-screen bg-white flex flex-col font-poppins">
        <Header onCartClick={() => setIsMobileCartOpen(true)} />
        <main className="flex-grow flex items-center justify-center px-6 py-20">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 bg-[#FEECEC] rounded-full flex items-center justify-center mx-auto mb-5">
              <UtensilsCrossed className="w-8 h-8 text-[#C62222]" />
            </div>
            <h1 className="text-xl font-semibold text-[#222222] mb-2">Store not found</h1>
            <p className="text-sm text-[#667085] mb-6">
              We couldn't tell which store you meant. Pick one from Explore and try again.
            </p>
            <button
              onClick={() => navigate('/explore')}
              className="px-5 py-2.5 bg-[#C62222] text-white text-sm font-semibold rounded-lg hover:bg-[#A01B1B] transition-colors"
            >
              Browse stores
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-poppins relative overflow-x-hidden">
      <Header onCartClick={() => setIsMobileCartOpen(true)} />

      {/* Main Content */}
      <main className="flex-grow w-full max-w-[1440px] mx-auto px-[24px] md:px-[60px] pt-[0px] pb-[100px]">

        {/* Top Navigation Row: Search and Location */}
        <div className="flex flex-row items-center justify-between gap-[10px] md:gap-[20px] mb-[20px] sm:mb-[24px] mt-[20px] sm:mt-[24px]">
          <div className="flex-1 flex items-center h-[36px] sm:h-[40px] border border-[#D0D5DD] rounded-[6px] sm:rounded-[8px] overflow-hidden bg-white max-w-[400px]">
            <input
              type="text"
              placeholder="Search this menu"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-grow h-full px-[12px] sm:px-[16px] text-[12px] sm:text-[13px] text-[#667085] bg-transparent outline-none placeholder:text-[#98A2B3]"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="w-[36px] sm:w-[40px] h-full bg-[#C62222] flex items-center justify-center text-white hover:bg-[#A01B1B] transition-colors"
              >
                <X size={16} className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              </button>
            ) : (
              <button
                type="button"
                aria-label="Search"
                className="w-[36px] sm:w-[40px] h-full bg-[#C62222] flex items-center justify-center text-white hover:bg-[#A01B1B] transition-colors"
              >
                <Search size={16} className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsAddressModalOpen(true)}
            className="flex items-center gap-[3px] sm:gap-[4px] hover:opacity-70 transition-opacity"
          >
            <img src={pinIcon} alt="" className="w-4 h-4" />
            <span className="text-[#222222] text-[13px] sm:text-[15px] font-semibold hidden sm:inline">
              {selectedAddress || 'Select address'}
            </span>
            <span className="text-[#222222] text-[13px] sm:text-[15px] font-semibold sm:hidden">Address</span>
            <ChevronDown className="text-[#222222]" size={14} />
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-[3px] sm:gap-[4px] text-[#667085] text-[12px] sm:text-[14px] mb-[20px] sm:mb-[24px]">
          <ChevronLeft size={12} />
          <span className="text-[#667085] font-medium cursor-pointer hover:text-[#C62222]">{store.businessType}</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-[40px]">
          {/* Left Column (Banner, Info, Menu) */}
          <div className="flex-grow w-full lg:w-3/4">

            {/* Vendor Banner */}
            <div className="w-full h-[200px] sm:h-[240px] md:h-[280px] rounded-[12px] sm:rounded-[16px] overflow-hidden mb-[20px] sm:mb-[24px] relative">
              <img
                src={store.imageUrl}
                alt={store.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Vendor Info */}
            {/* Vendor Info */}
            <div className="flex flex-col gap-4 mb-[24px] sm:mb-[32px]">
              {/* Top Row: Name and Opening Time */}
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-[20px] sm:text-[24px] md:text-[28px] font-bold text-[#222222] leading-tight">{store.name}</h1>
                  <p className="text-[#667085] text-[12px] sm:text-[13px] mt-1">{store.address}</p>
                  {/* The promo the customer tapped, if it covers this store —
                      otherwise any live promo on the store card */}
                  {(() => {
                    const promo = selectedPromotion && store.id && promotionAppliesToStore(selectedPromotion, store)
                      ? { title: selectedPromotion.title, detail: describeDiscount(selectedPromotion) }
                      : store.promotions?.[0]
                        ? { title: store.promotions[0].title, detail: store.promotions[0].badge }
                        : null;
                    return promo ? (
                      <p className="mt-2 inline-flex items-center gap-1.5 bg-[#FFF5F5] border border-[#F5C2C2] text-[#C62222] text-[12px] font-semibold px-3 py-1 rounded-full">
                        <Tag size={12} /> {promo.title} · {promo.detail} — applied at checkout
                      </p>
                    ) : null;
                  })()}
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="block text-[#667085] text-[10px] sm:text-[12px] mb-0.5">Opening & Closing Time</span>
                  <span className="block text-[#222222] text-[11px] sm:text-[13px] font-medium">
                    {store.closingTime ? `${store.openingTime} - ${store.closingTime}` : store.openingTime}
                  </span>
                </div>
              </div>

              {/* Bottom Row: Icons */}
              <div className="flex items-center gap-[32px] sm:gap-[40px]">
                <div className="flex flex-col items-center gap-1">
                  <Clock size={20} className="text-[#C62222] stroke-[1.5]" />
                  <span className="text-[#667085] text-[10px] sm:text-[12px]">30-45 mins</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  {/* Using a custom SVG for the scooter if possible, or a Lucide icon as fallback */}
                  <div className="text-[#C62222]">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5.5 17a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm13 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                      <path d="M8 14.5h8" />
                      <path d="M16.5 14.5 14 5h-3" />
                      <path d="M6 10h1.5" />
                      <path d="M2.5 14.5H5" />
                    </svg>
                  </div>
                  <span className="text-[#667085] text-[10px] sm:text-[12px]">₦ 800</span>
                </div>
              </div>
            </div>

            {/* Menu Categories */}
            {displayCategories.length > 1 && (
              <div className="flex flex-nowrap overflow-x-auto sm:flex-wrap items-center justify-between gap-[16px] border-b border-[#EAECF0] mb-[32px] sm:mb-[40px] pb-[12px] sm:pb-[16px] scrollbar-hide">
                {displayCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`text-[12px] sm:text-[14px] font-medium transition-colors px-[12px] sm:px-[16px] py-[4px] sm:py-[6px] rounded-[4px] whitespace-nowrap min-w-fit text-center flex-shrink-0 ${activeCategory === cat ? 'text-[#C62222] bg-[#FEE4E2]' : 'text-[#667085] hover:text-[#222222]'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Menu Grid */}
            {menuLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[16px] md:gap-[20px]">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="w-full animate-pulse">
                    <div className="w-full h-[140px] rounded-[12px] bg-gray-100" />
                    <div className="h-[14px] w-2/3 rounded bg-gray-100 mt-[12px]" />
                    <div className="h-[12px] w-1/3 rounded bg-gray-100 mt-[8px]" />
                  </div>
                ))}
              </div>
            ) : menuError ? (
              <div className="flex flex-col items-center justify-center py-[60px] px-[24px] text-center">
                <div className="w-[80px] h-[80px] bg-[#FEECEC] rounded-full flex items-center justify-center mb-[16px]">
                  <UtensilsCrossed size={32} className="text-[#C62222]" />
                </div>
                <h3 className="text-[18px] font-semibold text-[#222222] mb-[8px]">Couldn't load the menu</h3>
                <p className="text-[#667085] text-[14px] max-w-[300px]">{menuError}</p>
              </div>
            ) : filteredMenuItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-[60px] px-[24px] text-center">
                <div className="w-[80px] h-[80px] bg-[#FEECEC] rounded-full flex items-center justify-center mb-[16px]">
                  <UtensilsCrossed size={32} className="text-[#C62222]" />
                </div>
                <h3 className="text-[18px] font-semibold text-[#222222] mb-[8px]">
                  {menuItems.length === 0 ? 'No menu items yet' : 'No items in this category'}
                </h3>
                <p className="text-[#667085] text-[14px] max-w-[300px]">
                  {menuItems.length === 0
                    ? "This vendor hasn't added any items to their menu. Check back later!"
                    : "Try selecting a different category or 'All' to see all items."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px] sm:gap-[20px] md:gap-[24px]">
                {filteredMenuItems.map((item) => (
                  <div key={item.id} className="flex gap-[12px] sm:gap-[16px] p-[12px] sm:p-[16px] border border-[#EAECF0] rounded-[8px] sm:rounded-[12px] bg-white hover:shadow-sm transition-shadow">
                    <img src={item.imageUrl} alt={item.name} className="w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] object-cover rounded-[6px] sm:rounded-[8px]" />
                    <div className="flex flex-col flex-grow justify-between">
                      <div>
                        <h3 className="text-[14px] sm:text-[16px] font-bold text-[#222222] mb-[3px] sm:mb-[4px]">{item.name}</h3>
                        <p className="text-[#667085] text-[10px] sm:text-[12px] leading-[14px] sm:leading-[18px] line-clamp-2">{item.description}</p>
                      </div>
                      <div className="flex items-center justify-between mt-[8px] sm:mt-[12px]">
                        <span className="text-[#222222] text-[12px] sm:text-[14px] font-bold">₦ {item.price.toLocaleString()}</span>
                        <button
                          onClick={() => handleAddToCart(item)}
                          className="w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] bg-[#F9FAFB] rounded-full flex items-center justify-center hover:bg-[#EAECF0] transition-colors"
                        >
                          <Plus size={14} className="text-[#667085]" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

          {/* Right Column: Your Order (Persistent) */}
          <div className="hidden lg:block w-full lg:w-1/4 min-w-[280px] sm:min-w-[320px]">
            <div className="bg-[#FAFAFA] rounded-[12px] sm:rounded-[16px] p-[16px] sm:p-[24px] sticky top-[100px] sm:top-[120px] flex flex-col min-h-[280px] sm:min-h-[300px] border border-[#EAECF0]">
              <div className="mb-[16px] sm:mb-[24px]">
                <h2 className="text-[16px] sm:text-[18px] md:text-[20px] font-bold text-[#222222]">Your Order</h2>
                {cartItems.length > 0 && (
                  <p className="text-[#667085] text-[12px] sm:text-[14px] mt-1">{cartItems.length} items</p>
                )}
              </div>

              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-start w-full text-center pt-4 pb-4">
                  <ShoppingBasket size={42} className="text-[#C62222] mb-[10px]" />
                  <p className="text-[#667085] text-[12px] sm:text-[13px]">Your Cart is empty</p>
                </div>
              ) : (
                <div className="w-full flex flex-col gap-[16px] sm:gap-[20px] md:gap-[24px]">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-[10px] sm:gap-[12px] w-full">
                      {/* Item Image */}
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-[48px] h-[48px] sm:w-[60px] sm:h-[60px] object-cover rounded-[6px] sm:rounded-[8px]"
                      />

                      {/* Item Details */}
                      <div className="flex-grow flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <h3 className="text-[#222222] text-[12px] sm:text-[14px] font-bold truncate w-[100px] sm:w-[140px]">{item.name}</h3>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-[#C62222] hover:text-[#A01B1B] transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        <div className="flex flex-col gap-[6px] sm:gap-[8px]">
                          <span className="text-[#667085] text-[10px] sm:text-[12px]">₦ {item.price.toLocaleString()}</span>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-[8px] sm:gap-[12px]">
                            <button
                              onClick={() => decrementItem(item.id)}
                              className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] bg-[#F2F4F7] rounded-[3px] sm:rounded-[4px] flex items-center justify-center text-[#667085] hover:bg-[#EAECF0] transition-colors"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="text-[#222222] text-[10px] sm:text-[12px] font-medium min-w-[14px] sm:min-w-[16px] text-center">{item.quantity}</span>
                            <button
                              onClick={() => incrementCartItem(item.id)}
                              className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] bg-[#F2F4F7] rounded-[3px] sm:rounded-[4px] flex items-center justify-center text-[#667085] hover:bg-[#EAECF0] transition-colors"
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Footer Section */}
                  <div className="mt-[20px] sm:mt-[24px] pt-[16px] sm:pt-[24px] border-t border-[#EAECF0] w-full">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[#667085] text-[10px] sm:text-[11px]">Total:</span>
                        <span className="text-[#222222] text-[12px] sm:text-[14px] font-bold">₦{cartTotal.toLocaleString()}</span>
                      </div>
                      <button
                        onClick={() => navigate('/order-summary')}
                        className="h-[28px] sm:h-[32px] px-[12px] sm:px-[16px] bg-[#C62222] text-white text-[10px] sm:text-[12px] font-medium rounded-[3px] hover:bg-[#A01B1B] transition-colors"
                      >
                        Proceed to Checkout
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSelectAddress={(address, coords) => {
          setLocation(address || null, coords);
          setIsAddressModalOpen(false);
        }}
      />

      {/* Mobile Cart Drawer */}
      {isMobileCartOpen && (
        <div className="fixed inset-0 z-[80] bg-black/20 backdrop-blur-sm lg:hidden">
          <div className="absolute inset-y-0 right-0 w-full max-w-[360px] sm:max-w-[420px] bg-white shadow-[-6px_0_18px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#EAECF0]">
              <div className="flex items-center gap-2 text-[#C62222] text-[15px] font-semibold">
                Cart
                <div className="w-[18px] h-[18px] bg-[#C62222] text-white text-[11px] rounded-full flex items-center justify-center">
                  {cartItems.length}
                </div>
              </div>
              <button onClick={() => setIsMobileCartOpen(false)} className="text-[#667085] hover:text-[#222222]">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col h-[calc(100%-52px)] px-4 py-4 overflow-y-auto">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-start h-full text-center pt-6">
                  <ShoppingBasket size={48} className="text-[#C62222] mb-2" />
                  <p className="text-[#667085] text-[12px]">Your Cart is empty</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-4">
                    {(() => {
                      const groups: Record<string, { vendorName: string; vendorImage: string; items: typeof cartItems; total: number }> = {};
                      cartItems.forEach(item => {
                        const vId = item.vendorId || 'unknown';
                        if (!groups[vId]) {
                          groups[vId] = {
                            vendorName: item.vendorName || 'Unknown Vendor',
                            vendorImage: item.vendorImage || item.image,
                            items: [],
                            total: 0
                          };
                        }
                        groups[vId].items.push(item);
                        groups[vId].total += (item.price * item.quantity);
                      });
                      const groupedItems = Object.values(groups);

                      return groupedItems.map((group, idx) => (
                        <div key={idx} className="bg-[#F9FAFB]/50 border border-[#EAECF0] rounded-[12px] p-4">
                          <div className="flex gap-3 mb-3">
                            <img
                              src={group.vendorImage}
                              alt={group.vendorName}
                              className="w-[52px] h-[52px] object-cover rounded-[8px]"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <h3 className="text-[14px] font-semibold text-[#222222] truncate pr-2">{group.vendorName}</h3>
                                <span className="text-[12px] text-[#667085] whitespace-nowrap">
                                  {group.items.reduce((acc, i) => acc + i.quantity, 0)} Items
                                </span>
                              </div>
                              <p className="text-[#667085] text-[12px] mt-1 leading-snug line-clamp-2">
                                {group.items.map(i => `${i.quantity} portion${i.quantity > 1 ? 's' : ''} of ${i.name}`).join('. ')}.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-4">
                            <div className="text-[14px] text-[#667085] font-medium">Total: <span className="text-[#222222] font-bold">₦{group.total.toLocaleString()}</span></div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => navigate('/order-summary')}
                                className="h-[36px] px-4 bg-[#C62222] text-white text-[12px] font-semibold rounded-[6px] hover:bg-[#A01B1B] transition-colors"
                              >
                                Proceed to Checkout
                              </button>
                              <button
                                onClick={() => {
                                  /* In a real app we would remove only this vendor's items */
                                  clearCart();
                                }}
                                className="text-[#C62222] hover:text-[#A01B1B]"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={clearCart}
                      className="px-4 py-2 bg-[#FEE4E2] text-[#C62222] text-[12px] font-semibold rounded-[6px] hover:bg-[#FECDCA] transition-colors"
                    >
                      Clear Cart
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorDetails;
