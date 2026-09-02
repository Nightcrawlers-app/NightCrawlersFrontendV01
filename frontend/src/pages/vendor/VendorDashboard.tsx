import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalLoader } from '../../context/GlobalLoaderContext';
import Footer from '../../components/layout/Footer';
import { Store, Upload, X, Clock, LogOut, ShieldCheck, DollarSign, Package, TrendingUp, Bell } from 'lucide-react';
import pinIcon from '../../assets/location-pin-red.svg';
import {
  createStore,
  getBusinessTypeMeta,
  getCurrentVendor,
  getStoresForVendor,
  getVendorEarnings,
  getVendorStoreEarnings,
  getOrdersForVendor,
  VendorAccount,
  VendorStore,
  EarningsPeriod,
  StoreEarnings,
  clearCurrentVendor,
  toErrorMessage,
} from '../../services/api';
import { resolveImageUrl } from '../../lib/imageUtils';

type StoreForm = {
  name: string;
  openingTime: string;
  closingTime: string;
  categoryInput: string;
  address: string;
  description: string;
  imageUrl: string;
};

const VendorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showLoaderWithDelay } = useGlobalLoader();
  const [vendor, setVendor] = useState<VendorAccount | null>(null);
  const [stores, setStores] = useState<VendorStore[]>([]);
  const [earnings, setEarnings] = useState<EarningsPeriod | null>(null);
  const [storeEarnings, setStoreEarnings] = useState<StoreEarnings[]>([]);
  const [todayOrderCount, setTodayOrderCount] = useState(0);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [form, setForm] = useState<StoreForm>({
    name: '',
    openingTime: '',
    closingTime: '',
    categoryInput: '',
    address: '',
    description: '',
    imageUrl: '',
  });
  const [categoryTags, setCategoryTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Guards against setting state after the page unmounts.
  const cancelledRef = useRef(false);

  const loadDashboard = useCallback(async (vendorId: string) => {
    // Independent requests, so fire them together rather than in sequence.
    const [vendorStores, vendorEarnings, perStoreEarnings, allOrders] = await Promise.all([
      getStoresForVendor(vendorId),
      getVendorEarnings(vendorId),
      getVendorStoreEarnings(vendorId),
      getOrdersForVendor(vendorId),
    ]);

    if (cancelledRef.current) return;

    setStores(vendorStores);
    setEarnings(vendorEarnings);
    setStoreEarnings(perStoreEarnings);

    // Count today's orders (all statuses)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayOrders = allOrders.filter(o => new Date(o.createdAt) >= todayStart);
    setTodayOrderCount(todayOrders.length);
    setActiveOrdersCount(allOrders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status)).length);
  }, []);

  useEffect(() => {
    cancelledRef.current = false;

    const init = async () => {
      try {
        const currentVendor = await getCurrentVendor();
        if (cancelledRef.current) return;

        if (!currentVendor) {
          navigate('/vendor-signin');
          return;
        }

        setVendor(currentVendor);

        // An unverified vendor sees the pending screen, which needs no data.
        if (currentVendor.verified) {
          await loadDashboard(currentVendor.id);
        }
      } catch (error) {
        if (cancelledRef.current) return;
        setLoadError(toErrorMessage(error, 'Could not load your dashboard.'));
      } finally {
        if (!cancelledRef.current) setIsLoading(false);
      }
    };

    init();

    return () => {
      cancelledRef.current = true;
    };
  }, [navigate, loadDashboard]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-poppins">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#C62222] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#667085]">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-poppins p-6">
        <div className="text-center max-w-sm">
          <p className="text-sm text-[#667085] mb-4">
            {loadError || 'Could not load your account.'}
          </p>
          <button
            onClick={() => navigate('/vendor-signin')}
            className="px-5 py-2.5 bg-[#C62222] text-white text-sm font-medium rounded-lg hover:bg-[#A01B1B] transition-colors"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  // Check if vendor is verified
  if (!vendor.verified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex flex-col items-center justify-center font-poppins p-6">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Pending Verification</h1>
          <p className="text-gray-500 mb-6">
            Your vendor account is currently under review by our admin team.
            You'll be able to access your dashboard once approved.
          </p>

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 text-orange-700 text-sm font-medium">
              <ShieldCheck size={18} />
              <span>Verification typically takes 24-48 hours</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              disabled={isCheckingStatus}
              onClick={async () => {
                showLoaderWithDelay(400);
                // Re-fetch the vendor so an admin approval shows up.
                setIsCheckingStatus(true);
                try {
                  const currentVendor = await getCurrentVendor();
                  if (currentVendor) {
                    setVendor(currentVendor);
                    if (currentVendor.verified) await loadDashboard(currentVendor.id);
                  }
                } catch (error) {
                  setLoadError(toErrorMessage(error, 'Could not check your status.'));
                } finally {
                  setIsCheckingStatus(false);
                }
              }}
              className="w-full py-3 bg-[#C62222] text-white font-semibold rounded-xl hover:bg-[#a01b1b] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isCheckingStatus ? 'Checking…' : 'Check Status'}
            </button>
            <button
              onClick={async () => {
                showLoaderWithDelay(500);
                try {
                  await clearCurrentVendor();
                } finally {
                  navigate('/vendor-signin');
                }
              }}
              className="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-6">
            Need help? Contact support@nightcrawlers.ng
          </p>
        </div>
      </div>
    );
  }

  const typeMeta = getBusinessTypeMeta(vendor.businessType);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newTag = form.categoryInput.trim();
      if (newTag && !categoryTags.includes(newTag)) {
        setCategoryTags((prev) => [...prev, newTag]);
        setForm((prev) => ({ ...prev, categoryInput: '' }));
      }
    }
  };

  const removeCategory = (tagToRemove: string) => {
    setCategoryTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 1600; // Increased for higher quality

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Compress heavily: JPEG at 70% quality (keeps sizes very small for localStorage)
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          } else {
            resolve(e.target?.result as string); // Fallback
          }
        };
        img.onerror = () => reject(new Error('Unable to read image file.'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Unable to read image file.'));
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!form.name.trim()) return;

    if (!form.address.trim()) {
      setErrorMessage('Please enter an address.');
      return;
    }

    if (!form.imageUrl.trim() && !imageFile) {
      setErrorMessage('Please add a cover image URL or upload a file.');
      return;
    }

    setIsSaving(true);

    let imageUrl = form.imageUrl.trim();
    if (imageFile) {
      try {
        imageUrl = await readFileAsDataUrl(imageFile);
      } catch {
        setIsSaving(false);
        setErrorMessage('Unable to upload the image. Please try again.');
        return;
      }
    } else {
      const resolvedUrl = await resolveImageUrl(imageUrl);
      if (!resolvedUrl) {
        setIsSaving(false);
        setErrorMessage('Please use a direct image URL or upload a file.');
        return;
      }
      imageUrl = resolvedUrl;
    }

    try {
      const created = await createStore({
        name: form.name,
        categories: categoryTags,
        address: form.address,
        description: form.description,
        imageUrl,
        openingTime: form.openingTime,
        closingTime: form.closingTime,
      });

      setStores((prev) => [...prev, created]);
      setForm({
        name: '',
        openingTime: '',
        closingTime: '',
        categoryInput: '',
        address: '',
        description: '',
        imageUrl: '',
      });
      setCategoryTags([]);
      setImageFile(null);

      navigate(`/vendor-dashboard/restaurant/${created.id}`, { state: created });
    } catch (error) {
      setErrorMessage(toErrorMessage(error, 'Could not create the store. Please try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-poppins">
      <main className="flex-grow w-full max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8">
        {/* Dashboard Header */}
        <div className="pt-10 pb-10">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-6">
              <div className="w-9 h-9 flex items-center justify-center text-[#C62222]">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-[#C62222] leading-tight">Vendor Dashboard</h1>
                <p className="text-sm text-[#4B5563]">
                  Account type: {typeMeta.singular}
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                showLoaderWithDelay(500);
                try {
                  await clearCurrentVendor();
                } finally {
                  navigate('/vendor-signin');
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-[#C62222] text-[#C62222] hover:text-white rounded-xl text-sm font-semibold transition-colors border border-red-100"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Today's Earnings */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#1F2937]">Today's Overview</h2>
            <button
              onClick={() => navigate('/vendor-dashboard/orders')}
              className="flex items-center gap-2 px-4 py-2 bg-[#C62222] text-white rounded-xl text-sm font-semibold hover:bg-[#a01b1b] transition-colors relative shadow-md shadow-red-200"
            >
              <Bell size={18} />
              Manage Orders
              {activeOrdersCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white">
                  {activeOrdersCount}
                </span>
              )}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Earnings Card */}
            <div className="bg-gradient-to-br from-[#C62222] to-[#991b1b] text-white p-5 rounded-2xl shadow-lg shadow-red-200/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8 blur-xl"></div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                  <DollarSign size={20} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-red-100">Today's Earnings</span>
              </div>
              <p className="text-3xl font-bold tracking-tight">₦{(earnings?.today ?? 0).toLocaleString()}</p>
              <p className="text-xs text-red-100 mt-1">From delivered orders today</p>
            </div>

            {/* Orders Card */}
            <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-red-50 rounded-xl text-[#C62222]">
                  <Package size={20} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Today's Orders</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 tracking-tight">{todayOrderCount}</p>
              <p className="text-xs text-gray-400 mt-1">Total orders received today</p>
            </div>

            {/* Completed Card */}
            <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-red-50 rounded-xl text-[#C62222]">
                  <TrendingUp size={20} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Completed</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 tracking-tight">{earnings?.todayOrders ?? 0}</p>
              <p className="text-xs text-gray-400 mt-1">Delivered orders today</p>
            </div>
          </div>



          {/* Per-Store Earnings Breakdown */}
          {storeEarnings.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Earnings by {typeMeta.singular}</h3>
              <div className="space-y-2">
                {storeEarnings.map((se) => (
                  <div
                    key={se.storeId}
                    className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center text-[#C62222] flex-shrink-0">
                        <Store size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{se.storeName}</p>
                        <p className="text-[11px] text-gray-400">
                          {se.todayOrders} order{se.todayOrders !== 1 ? 's' : ''} delivered today
                        </p>
                      </div>
                    </div>
                    <p className={`text-lg font-bold tabular-nums ${se.todayEarnings > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                      ₦{se.todayEarnings.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Your Stores */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-[#1F2937] mb-1">Your {typeMeta.plural}</h2>
          <p className="text-sm text-[#4B5563] mb-6">
            Select a {typeMeta.singular.toLowerCase()} to manage its items, or add a new one.
          </p>

          {stores.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No {typeMeta.plural.toLowerCase()} yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stores.map((store) => (
                <div
                  key={store.id}
                  className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/vendor-dashboard/restaurant/${store.id}`, { state: store })}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(`/vendor-dashboard/restaurant/${store.id}`, { state: store });
                    }
                  }}
                >
                  <div className="h-48 w-full overflow-hidden bg-gray-50">
                    <img src={store.imageUrl} alt={store.name} className="w-full h-full object-contain" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-[#111827]">{store.name}</h3>
                      <span className="px-2 py-1 text-[10px] rounded-full bg-[#FEE4E2] text-[#C62222]">
                        {store.businessType}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#4B5563] mb-2">
                      <img src={pinIcon} alt="" className="w-4 h-4" />
                      <span>{store.address}</span>
                    </div>
                    {store.categories.length > 0 && (
                      <p className="text-[11px] text-[#6B7280] mb-2">{store.categories.join(', ')}</p>
                    )}
                    <p className="text-xs text-[#4B5563]">{store.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Add Store */}
        <section className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm p-6 sm:p-8 mb-12">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[#111827] mb-1">Add {typeMeta.singular}</h2>
            <p className="text-sm text-[#4B5563]">
              Add your {typeMeta.singular.toLowerCase()} details and cover image.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">{typeMeta.singular} Name *</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full h-11 px-3 bg-[#F7F7F7] border border-[#E5E7EB] rounded-sm text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#C62222]"
                placeholder={`${typeMeta.singular} name`}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">{typeMeta.categoryLabel}</label>
              <div className="w-full min-h-[48px] px-3 py-2 bg-[#F7F7F7] border border-[#E5E7EB] rounded-sm focus-within:ring-2 focus-within:ring-[#C62222]">
                <div className="flex flex-wrap gap-2 items-center">
                  {categoryTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-[#C62222] text-white text-xs font-medium rounded-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeCategory(tag)}
                        className="w-4 h-4 flex items-center justify-center hover:bg-white/30 rounded-sm transition-colors"
                      >
                        <X size={12} strokeWidth={2.5} />
                      </button>
                    </span>
                  ))}
                  <input
                    name="categoryInput"
                    value={form.categoryInput}
                    onChange={handleChange}
                    onKeyDown={handleCategoryKeyDown}
                    className="flex-1 min-w-[120px] h-7 bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#9CA3AF]"
                    placeholder={categoryTags.length === 0 ? "Type and press Enter to add" : "Add more..."}
                  />
                </div>
              </div>
              <p className="text-[10px] text-[#6B7280] mt-1">Press Enter to add a category</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Address *</label>
              <input
                name="address"
                value={form.address}
                onChange={handleChange}
                className="w-full h-11 px-3 bg-[#F7F7F7] border border-[#E5E7EB] rounded-sm text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#C62222]"
                placeholder="123 Main Street, Downtown"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className="w-full min-h-[80px] px-3 py-2 bg-[#F7F7F7] border border-[#E5E7EB] rounded-sm text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#C62222]"
                placeholder={`Short description about the ${typeMeta.singular.toLowerCase()}`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Cover Image URL *</label>
              <input
                name="imageUrl"
                value={form.imageUrl}
                onChange={handleChange}
                className="w-full h-11 px-3 bg-[#F7F7F7] border border-[#E5E7EB] rounded-sm text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#C62222]"
                placeholder="https://example.com/cover.jpg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Or Upload Cover Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                className="w-full text-sm text-[#111827]"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 w-full h-11 px-4 bg-[#C62222] text-white text-sm font-medium rounded-sm hover:bg-[#A01B1B] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C62222] disabled:opacity-70"
            >
              <Upload className="w-4 h-4" />
              {isSaving ? 'Saving...' : `Add ${typeMeta.singular}`}
            </button>
            {errorMessage && (
              <p className="text-xs text-[#C62222]" role="alert">
                {errorMessage}
              </p>
            )}
          </form>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default VendorDashboard;
