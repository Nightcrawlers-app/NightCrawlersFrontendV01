import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import Footer from '../../components/layout/Footer';
import { Store, ChevronLeft, Upload, X, Trash2 } from 'lucide-react';
import {
  getBusinessTypeMeta,
  getCurrentVendor,
  getStoreById,
  updateStore,
  getMenuItemsForStore,
  createMenuItem,
  deleteMenuItem,
  updateMenuItem,
  VendorStore,
  MenuItem,
  toErrorMessage,
} from '../../services/api';
import { resolveImageUrl } from '../../lib/imageUtils';



const VendorRestaurant: React.FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'menu' | 'add' | 'edit'>('menu');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const storeState = location.state as Partial<VendorStore> | undefined;
  const storeId = id || (storeState?.id ? String(storeState.id) : undefined);

  // Placeholder shown while the real store loads, or if it can't be found.
  const buildFallbackStore = (): VendorStore => ({
    id: storeId || 'unknown-store',
    vendorId: 'unknown',
    name: storeState?.name || '',
    description: storeState?.description || '',
    address: storeState?.address || '',
    openingTime: storeState?.openingTime || '',
    imageUrl:
      storeState?.imageUrl ||
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop',
    businessType: storeState?.businessType || 'Food',
    categories: storeState?.categories || [],
    createdAt: storeState?.createdAt || new Date().toISOString(),
    closingTime: storeState?.closingTime || '',
  });

  const [store, setStore] = useState<VendorStore>(buildFallbackStore);
  const [storeLoading, setStoreLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadStore = async () => {
      setStoreLoading(true);
      try {
        const fromStore = storeId ? await getStoreById(storeId) : null;
        if (cancelled) return;

        if (fromStore) {
          setStore(fromStore);
          return;
        }

        // Store not on the backend — fill in what we can from the vendor.
        const currentVendor = await getCurrentVendor();
        if (cancelled) return;
        setStore({
          ...buildFallbackStore(),
          vendorId: currentVendor?.id || 'unknown',
          businessType: storeState?.businessType || currentVendor?.businessType || 'Food',
        });
      } catch (error) {
        if (cancelled) return;
        setPageError(toErrorMessage(error, 'Could not load this store.'));
      } finally {
        if (!cancelled) setStoreLoading(false);
      }
    };

    loadStore();
    return () => {
      cancelled = true;
    };
  }, [storeId, storeState]);

  useEffect(() => {
    if (!store.id) return;
    let cancelled = false;

    const loadMenu = async () => {
      try {
        const items = await getMenuItemsForStore(store.id);
        if (!cancelled) setMenuItems(items);
      } catch (error) {
        if (!cancelled) setPageError(toErrorMessage(error, 'Could not load the menu.'));
      }
    };

    loadMenu();
    return () => {
      cancelled = true;
    };
  }, [store.id, refreshTrigger, viewMode]);

  const typeMeta = getBusinessTypeMeta(store.businessType);

  // Dynamic categories
  const menuCategories = React.useMemo(() => {
    const itemCategories = menuItems.flatMap(i => i.categories);
    const all = [...store.categories, ...itemCategories];
    const unique = [...new Set(all)].filter(Boolean);
    return ['All', ...unique];
  }, [store.categories, menuItems]);

  const filteredMenuItems = React.useMemo(() => {
    if (activeCategory === 'All') return menuItems;
    return menuItems.filter(item => item.categories.includes(activeCategory));
  }, [menuItems, activeCategory]);

  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const handleDeleteItem = (itemId: string) => {
    setItemToDelete(itemId);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    const deletingId = itemToDelete;
    setItemToDelete(null);
    try {
      await deleteMenuItem(deletingId);
      // Drop it locally straight away, then refetch to stay in sync.
      setMenuItems(prev => prev.filter(item => item.id !== deletingId));
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      setPageError(toErrorMessage(error, 'Could not delete that item. Please try again.'));
    }
  };

  // Edit Item Form State
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemForm, setEditItemForm] = useState({
    name: '',
    price: '',
    description: '',
    imageUrl: '',
    categoryInput: ''
  });
  const [editItemCategories, setEditItemCategories] = useState<string[]>([]);
  const [editItemImageFile, setEditItemImageFile] = useState<File | null>(null);
  const [isUpdatingItem, setIsUpdatingItem] = useState(false);

  const handleEditItemChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditItemForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditItemCategoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newCategory = editItemForm.categoryInput.trim();
      if (newCategory && !editItemCategories.includes(newCategory)) {
        setEditItemCategories(prev => [...prev, newCategory]);
        setEditItemForm(prev => ({ ...prev, categoryInput: '' }));
      }
    }
  };

  const removeEditItemCategory = (categoryToRemove: string) => {
    setEditItemCategories(prev => prev.filter(cat => cat !== categoryToRemove));
  };

  const startEditingItem = (item: MenuItem) => {
    setEditingItemId(item.id);
    setEditItemForm({
      name: item.name,
      price: String(item.price),
      description: item.description || '',
      imageUrl: item.imageUrl,
      categoryInput: ''
    });
    setEditItemCategories(item.categories);
    setEditItemImageFile(null);
  };

  const cancelEditingItem = () => {
    setEditingItemId(null);
  };

  const handleUpdateItemSubmit = async (e: React.FormEvent, itemId: string) => {
    e.preventDefault();
    if (!editItemForm.name.trim() || !editItemForm.price.trim()) {
      setPageError('Please fill in the required fields (Name and Price).');
      return;
    }

    setIsUpdatingItem(true);
    let finalImageUrl = editItemForm.imageUrl.trim();

    if (editItemImageFile) {
      try {
        finalImageUrl = await readFileAsDataUrl(editItemImageFile);
      } catch {
        setIsUpdatingItem(false);
        setPageError('Unable to upload the image. Please try again.');
        return;
      }
    } else if (finalImageUrl) {
      const resolvedUrl = await resolveImageUrl(finalImageUrl);
      if (!resolvedUrl) {
        setIsUpdatingItem(false);
        setPageError('Please use a direct image URL or upload a file.');
        return;
      }
      finalImageUrl = resolvedUrl;
    } else {
      finalImageUrl = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop';
    }

    try {
      await updateMenuItem(itemId, {
        name: editItemForm.name.trim(),
        categories: editItemCategories,
        price: Number(editItemForm.price) || 0,
        description: editItemForm.description.trim(),
        imageUrl: finalImageUrl,
      });

      setRefreshTrigger(prev => prev + 1);
      setEditingItemId(null);
      setViewMode('menu');
    } catch (error) {
      setPageError(toErrorMessage(error, 'Failed to update item. Please try again.'));
    } finally {
      setIsUpdatingItem(false);
    }
  };

  // Add Item Form State
  const [addItemForm, setAddItemForm] = useState({
    name: '',
    categoryInput: '',
    price: '',
    description: '',
    imageUrl: ''
  });
  const [addItemCategories, setAddItemCategories] = useState<string[]>([]);
  const [addItemImageFile, setAddItemImageFile] = useState<File | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);

  const handleAddItemChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAddItemForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAddItemCategoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newCategory = addItemForm.categoryInput.trim();
      if (newCategory && !addItemCategories.includes(newCategory)) {
        setAddItemCategories(prev => [...prev, newCategory]);
        setAddItemForm(prev => ({ ...prev, categoryInput: '' }));
      }
    }
  };

  const removeAddItemCategory = (categoryToRemove: string) => {
    setAddItemCategories(prev => prev.filter(cat => cat !== categoryToRemove));
  };

  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addItemForm.name.trim() || !addItemForm.price.trim()) {
      setPageError('Please fill in the required fields (Name and Price).');
      return;
    }

    setIsAddingItem(true);
    let finalImageUrl = addItemForm.imageUrl.trim();

    if (addItemImageFile) {
      try {
        finalImageUrl = await readFileAsDataUrl(addItemImageFile);
      } catch {
        setIsAddingItem(false);
        setPageError('Unable to upload the image. Please try again.');
        return;
      }
    } else if (finalImageUrl) {
      const resolvedUrl = await resolveImageUrl(finalImageUrl);
      if (!resolvedUrl) {
        setIsAddingItem(false);
        setPageError('Please use a direct image URL or upload a file.');
        return;
      }
      finalImageUrl = resolvedUrl;
    } else {
      finalImageUrl = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop';
    }

    try {
      await createMenuItem({
        storeId: store.id,
        name: addItemForm.name.trim(),
        categories: addItemCategories,
        price: Number(addItemForm.price) || 0,
        description: addItemForm.description.trim(),
        imageUrl: finalImageUrl,
      });
      // Reset form
      setAddItemForm({ name: '', categoryInput: '', price: '', description: '', imageUrl: '' });
      setAddItemCategories([]);
      setAddItemImageFile(null);
      setRefreshTrigger(prev => prev + 1);
      setViewMode('menu');
    } catch (error) {
      setPageError(toErrorMessage(error, 'Failed to add item. Please try again.'));
    } finally {
      setIsAddingItem(false);
    }
  };

  const [editForm, setEditForm] = useState({
    name: store.name,
    categoryInput: '',
    address: store.address,
    description: store.description,
    openingTime: store.openingTime,
    closingTime: store.closingTime || '',
    imageUrl: store.imageUrl,
  });
  const [editCategories, setEditCategories] = useState<string[]>(store.categories);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editMessage, setEditMessage] = useState('');
  const [editError, setEditError] = useState('');

  useEffect(() => {
    setEditForm({
      name: store.name,
      categoryInput: '',
      address: store.address,
      description: store.description,
      openingTime: store.openingTime,
      closingTime: store.closingTime || '',
      imageUrl: store.imageUrl,
    });
    setEditCategories(store.categories);
    setEditImageFile(null);
    setEditMessage('');
    setEditError('');
  }, [store.id, store.name, store.address, store.description, store.imageUrl, store.openingTime, store.closingTime, store.categories]);

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 1600; // Resize to reasonable dimensions for web

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
            // Compress heavily: JPEG at 85% quality (keeps sizes very small for localStorage)
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

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditCategoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newCategory = editForm.categoryInput.trim();
      if (newCategory && !editCategories.includes(newCategory)) {
        setEditCategories((prev) => [...prev, newCategory]);
        setEditForm((prev) => ({ ...prev, categoryInput: '' }));
      }
    }
  };

  const removeEditCategory = (categoryToRemove: string) => {
    setEditCategories((prev) => prev.filter((cat) => cat !== categoryToRemove));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    setEditMessage('');

    if (!editForm.name.trim()) {
      setEditError('Please enter a name.');
      return;
    }

    if (!editForm.address.trim()) {
      setEditError('Please enter an address.');
      return;
    }

    if (!editForm.imageUrl.trim() && !editImageFile) {
      setEditError('Please add a cover image URL or upload a file.');
      return;
    }

    setIsSaving(true);
    let imageUrl = editForm.imageUrl.trim();
    if (editImageFile) {
      try {
        imageUrl = await readFileAsDataUrl(editImageFile);
      } catch {
        setIsSaving(false);
        setEditError('Unable to upload the image. Please try again.');
        return;
      }
    } else {
      const resolvedUrl = await resolveImageUrl(imageUrl);
      if (!resolvedUrl) {
        setIsSaving(false);
        setEditError('Please use a direct image URL or upload a file.');
        return;
      }
      imageUrl = resolvedUrl;
    }

    try {
      const updated = await updateStore(store.id, {
        name: editForm.name.trim(),
        categories: editCategories,
        address: editForm.address.trim(),
        description: editForm.description.trim(),
        imageUrl,
        openingTime: editForm.openingTime.trim() || store.openingTime,
        closingTime: editForm.closingTime.trim(),
      });

      // The response is the source of truth — no reload needed.
      setStore(updated);
      setEditImageFile(null);
      setEditMessage('Details updated.');
    } catch (error) {
      setEditError(toErrorMessage(error, 'Failed to update store details.'));
    } finally {
      setIsSaving(false);
    }
  };

  if (storeLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-poppins">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#C62222] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#667085]">Loading store…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-poppins">
      <main className="flex-grow w-full max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8">
        <div className="pt-6 pb-0">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-9 h-9 flex items-center justify-center text-[#C62222]">
              <Store className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-semibold text-[#C62222] leading-tight">Vendor Dashboard</h1>
          </div>
          <Link
            to="/vendor-dashboard"
            className="inline-flex items-center gap-2 text-[#475467] hover:text-[#C62222] text-sm mb-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>

        {pageError && (
          <div className="mb-6 p-4 rounded-lg bg-[#FEECEC] border border-[#F5C2C2] flex items-start justify-between gap-3">
            <p className="text-sm text-[#991B1B] font-medium">{pageError}</p>
            <button
              onClick={() => setPageError('')}
              className="text-xs text-[#991B1B] font-semibold hover:underline flex-shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="pt-2 pb-10">
          <div className="rounded-lg overflow-hidden mb-8">
            <div className="w-full h-[300px] sm:h-[380px] md:h-[460px] bg-gray-50 flex items-center justify-center">
              <img
                src={store.imageUrl}
                alt={store.name}
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <div className="pt-5 px-1">
              <h2 className="text-xl sm:text-2xl font-semibold text-[#222222] mb-1">
                {store.name}
              </h2>
              <p className="text-[#667085] text-sm sm:text-base mb-3">
                {store.description}
              </p>
              <div className="text-[#667085] text-sm mb-10">
                <span className="block text-[#111827] font-medium">Opening Time</span>
                <span>{store.openingTime}</span>
              </div>
              <div className="inline-flex items-center rounded-sm bg-[#F2F4F7] p-1">
                <button
                  onClick={() => setViewMode('menu')}
                  className={`px-4 py-2 text-xs font-medium rounded-sm ${viewMode === 'menu'
                    ? 'bg-[#C62222] text-white'
                    : 'text-[#4B5563] hover:text-[#111827]'
                    }`}
                >
                  View {typeMeta.itemPlural}
                </button>
                <button
                  onClick={() => {
                    setViewMode('add');
                    if (activeCategory !== 'All') {
                      setAddItemCategories([activeCategory]);
                    } else {
                      setAddItemCategories([]);
                    }
                  }}
                  className={`px-4 py-2 text-xs font-medium rounded-sm ${viewMode === 'add'
                    ? 'bg-[#C62222] text-white'
                    : 'text-[#4B5563] hover:text-[#111827]'
                    }`}
                >
                  Add {typeMeta.itemSingular}
                </button>
                <button
                  onClick={() => setViewMode('edit')}
                  className={`px-4 py-2 text-xs font-medium rounded-sm ${viewMode === 'edit'
                    ? 'bg-[#C62222] text-white'
                    : 'text-[#4B5563] hover:text-[#111827]'
                    }`}
                >
                  Edit Details
                </button>
              </div>
            </div>
          </div>

          {viewMode === 'menu' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-6 border-b border-[#EAECF0] mb-8 pb-3">
                {menuCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`min-w-[70px] text-center text-sm px-3 py-1 rounded ${activeCategory === cat
                      ? 'text-[#C62222] bg-[#FEE4E2] font-medium'
                      : 'text-[#667085] hover:text-[#222222]'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredMenuItems.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-12 text-center text-gray-500">
                    <p className="mb-2">
                      {menuItems.length === 0
                        ? "You haven't added any items yet."
                        : "No items found in this category."}
                    </p>
                    {menuItems.length === 0 && (
                      <button
                        onClick={() => {
                          setViewMode('add');
                          if (activeCategory !== 'All') {
                            setAddItemCategories([activeCategory]);
                          } else {
                            setAddItemCategories([]);
                          }
                        }}
                        className="text-[#C62222] font-medium hover:underline"
                      >
                        Add your first item
                      </button>
                    )}
                  </div>
                ) : (
                  filteredMenuItems.map((item) => (
                    editingItemId === item.id ? (
                      <div key={item.id} className="p-4 border border-[#EAECF0] rounded-lg bg-gray-50/50 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                        <form onSubmit={(e) => handleUpdateItemSubmit(e, item.id)} className="space-y-3">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="text-sm font-semibold text-gray-900">Edit Item</h4>
                            <button type="button" onClick={cancelEditingItem} className="text-gray-400 hover:text-gray-600">
                              <X size={16} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <input
                                name="name"
                                value={editItemForm.name}
                                onChange={handleEditItemChange}
                                className="w-full h-9 px-3 bg-white border border-[#EAECF0] rounded-md text-gray-700 text-sm focus:outline-none focus:ring-1 focus:ring-[#C62222]"
                                placeholder="Item Name"
                              />
                            </div>
                            <div>
                              <input
                                name="price"
                                value={editItemForm.price}
                                onChange={handleEditItemChange}
                                className="w-full h-9 px-3 bg-white border border-[#EAECF0] rounded-md text-gray-700 text-sm focus:outline-none focus:ring-1 focus:ring-[#C62222]"
                                placeholder="Price"
                              />
                            </div>
                          </div>

                          <div>
                            <textarea
                              name="description"
                              value={editItemForm.description}
                              onChange={handleEditItemChange}
                              className="w-full min-h-[60px] px-3 py-2 bg-white border border-[#EAECF0] rounded-md text-gray-700 text-sm focus:outline-none focus:ring-1 focus:ring-[#C62222]"
                              placeholder="Description"
                            />
                          </div>

                          <div className="flex gap-2 items-center flex-wrap">
                            <div className="flex-1 min-w-[200px] border border-[#EAECF0] bg-white rounded-md p-1.5 flex gap-1 flex-wrap items-center">
                              {editItemCategories.map(cat => (
                                <span key={cat} className="text-[10px] bg-[#C62222] text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                  {cat}
                                  <button type="button" onClick={() => removeEditItemCategory(cat)}><X size={10} /></button>
                                </span>
                              ))}
                              <input
                                name="categoryInput"
                                value={editItemForm.categoryInput}
                                onChange={handleEditItemChange}
                                onKeyDown={handleEditItemCategoryKeyDown}
                                className="flex-1 min-w-[80px] text-xs outline-none bg-transparent"
                                placeholder={editItemCategories.length === 0 ? "Add category..." : ""}
                              />
                            </div>
                          </div>

                          <div className="flex gap-2 items-center text-xs">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => setEditItemImageFile(e.target.files?.[0] ?? null)}
                              className="w-full"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                            <button
                              type="button"
                              onClick={cancelEditingItem}
                              className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isUpdatingItem}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#C62222] hover:bg-[#A01B1B] rounded transition-colors disabled:opacity-50"
                            >
                              {isUpdatingItem ? 'Saving...' : 'Save Changes'}
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <div
                        key={item.id}
                        className="flex gap-3 p-4 border border-[#EAECF0] rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-[80px] h-[80px] object-contain bg-gray-50 rounded-md flex-shrink-0"
                        />
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <h3 className="text-[#222222] text-sm sm:text-base font-semibold leading-snug line-clamp-1">
                                {item.name}
                              </h3>
                              <div className="flex gap-1 flex-shrink-0">
                                <button
                                  onClick={() => startEditingItem(item)}
                                  className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                                  title="Edit item"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                  title="Delete item"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            <p className="text-[#667085] text-xs sm:text-sm mt-1 line-clamp-2 min-h-[40px]">
                              {item.description}
                            </p>
                          </div>
                          <div className="flex justify-between items-end mt-2">
                            <span className="text-[#222222] text-sm sm:text-base font-semibold whitespace-nowrap">
                              ₦ {item.price.toLocaleString()}
                            </span>
                            <div className="flex gap-1 flex-wrap justify-end">
                              {item.categories.slice(0, 2).map((cat) => (
                                <span key={cat} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                                  {cat}
                                </span>
                              ))}
                              {item.categories.length > 2 && (
                                <span className="text-[10px] text-gray-500 self-center">+{item.categories.length - 2}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  ))
                )}
              </div>
            </>
          )}

          {viewMode === 'add' && (
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Add {typeMeta.itemPlural}</h2>
                <p className="text-sm text-gray-600">Add items to your store catalog</p>
              </div>

              <form onSubmit={handleAddItemSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">{typeMeta.itemSingular} Name *</label>
                  <input
                    name="name"
                    value={addItemForm.name}
                    onChange={handleAddItemChange}
                    className="w-full h-10 px-3 bg-[#F7F7F7] border border-[#EAECF0] rounded-md text-gray-700 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C62222] focus:border-transparent"
                    placeholder="e.g. Fried Rice"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">Item Categories</label>
                  <div className="w-full min-h-[48px] px-4 py-3 bg-[#F7F7F7] border border-[#EAECF0] rounded-md focus-within:ring-2 focus-within:ring-[#C62222] focus-within:border-transparent">
                    <div className="flex flex-wrap gap-3 items-center">
                      {addItemCategories.map((category) => (
                        <span
                          key={category}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#C62222] text-white text-sm font-medium rounded-full"
                        >
                          {category}
                          <button
                            type="button"
                            onClick={() => removeAddItemCategory(category)}
                            className="w-5 h-5 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                      <input
                        name="categoryInput"
                        value={addItemForm.categoryInput}
                        onChange={handleAddItemChange}
                        onKeyDown={handleAddItemCategoryKeyDown}
                        className="flex-1 min-w-[140px] h-8 bg-transparent text-gray-700 text-sm outline-none placeholder:text-gray-400"
                        placeholder={addItemCategories.length === 0 ? "Type a category and press Enter" : "Add more..."}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500">Press Enter or comma to add a category</p>
                    {menuCategories.length > 1 && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400">Available:</span>
                        <div className="flex gap-1 flex-wrap">
                          {menuCategories.filter(c => c !== 'All').map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                if (!addItemCategories.includes(c)) {
                                  setAddItemCategories(prev => [...prev, c]);
                                }
                              }}
                              className="text-[#C62222] hover:underline"
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">Price *</label>
                  <input
                    name="price"
                    value={addItemForm.price}
                    onChange={handleAddItemChange}
                    className="w-full h-10 px-3 bg-[#F7F7F7] border border-[#EAECF0] rounded-md text-gray-700 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C62222] focus:border-transparent"
                    placeholder="e.g. 2500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">Item Description</label>
                  <textarea
                    name="description"
                    value={addItemForm.description}
                    onChange={handleAddItemChange}
                    className="w-full min-h-[90px] px-3 py-2 bg-[#F7F7F7] border border-[#EAECF0] rounded-md text-gray-700 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C62222] focus:border-transparent"
                    placeholder="Short description about the item"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">Item Cover Image URL</label>
                  <input
                    name="imageUrl"
                    value={addItemForm.imageUrl}
                    onChange={handleAddItemChange}
                    className="w-full h-10 px-3 bg-[#F7F7F7] border border-[#EAECF0] rounded-md text-gray-700 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C62222] focus:border-transparent"
                    placeholder="https://example.com/cover.jpg (optional)"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">Or Upload Item Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setAddItemImageFile(event.target.files?.[0] ?? null)}
                    className="w-full text-sm text-gray-700"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAddingItem}
                  className="inline-flex items-center justify-center gap-2 w-full h-10 px-4 bg-[#C62222] text-white text-sm font-medium rounded-md hover:bg-[#A01B1B] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C62222] disabled:opacity-70"
                >
                  <Upload className="w-4 h-4" />
                  {isAddingItem ? 'Adding...' : `Add ${typeMeta.itemSingular}`}
                </button>
              </form>
            </section>
          )}

          {viewMode === 'edit' && (
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Edit Store Details</h2>
                <p className="text-sm text-gray-600">Update your store information.</p>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">Store Name *</label>
                  <input
                    name="name"
                    value={editForm.name}
                    onChange={handleEditChange}
                    className="w-full h-10 px-3 bg-[#F7F7F7] border border-[#EAECF0] rounded-md text-gray-700 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C62222] focus:border-transparent"
                    placeholder="Store name"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">Categories</label>
                  <div className="w-full min-h-[48px] px-4 py-3 bg-[#F7F7F7] border border-[#EAECF0] rounded-md focus-within:ring-2 focus-within:ring-[#C62222] focus-within:border-transparent">
                    <div className="flex flex-wrap gap-3 items-center">
                      {editCategories.map((category) => (
                        <span
                          key={category}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#C62222] text-white text-sm font-medium rounded-full"
                        >
                          {category}
                          <button
                            type="button"
                            onClick={() => removeEditCategory(category)}
                            className="w-5 h-5 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                      <input
                        name="categoryInput"
                        value={editForm.categoryInput}
                        onChange={handleEditChange}
                        onKeyDown={handleEditCategoryKeyDown}
                        className="flex-1 min-w-[140px] h-8 bg-transparent text-gray-700 text-sm outline-none placeholder:text-gray-400"
                        placeholder={editCategories.length === 0 ? "Type a category and press Enter" : "Add more..."}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Press Enter or comma to add a category</p>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">Address *</label>
                  <input
                    name="address"
                    value={editForm.address}
                    onChange={handleEditChange}
                    className="w-full h-10 px-3 bg-[#F7F7F7] border border-[#EAECF0] rounded-md text-gray-700 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C62222] focus:border-transparent"
                    placeholder="123 Main Street, Downtown"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">Description</label>
                  <textarea
                    name="description"
                    value={editForm.description}
                    onChange={handleEditChange}
                    className="w-full min-h-[90px] px-3 py-2 bg-[#F7F7F7] border border-[#EAECF0] rounded-md text-gray-700 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C62222] focus:border-transparent"
                    placeholder="Short description about the store"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">Opening Time</label>
                    <input
                      name="openingTime"
                      value={editForm.openingTime}
                      onChange={handleEditChange}
                      className="w-full h-10 px-3 bg-[#F7F7F7] border border-[#EAECF0] rounded-md text-gray-700 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C62222] focus:border-transparent"
                      placeholder="8:00 am - 8:00 pm"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">Closing Time</label>
                    <input
                      name="closingTime"
                      value={editForm.closingTime}
                      onChange={handleEditChange}
                      className="w-full h-10 px-3 bg-[#F7F7F7] border border-[#EAECF0] rounded-md text-gray-700 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C62222] focus:border-transparent"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">Cover Image URL *</label>
                  <input
                    name="imageUrl"
                    value={editForm.imageUrl}
                    onChange={handleEditChange}
                    className="w-full h-10 px-3 bg-[#F7F7F7] border border-[#EAECF0] rounded-md text-gray-700 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C62222] focus:border-transparent"
                    placeholder="https://example.com/cover.jpg"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">Or Upload Cover Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setEditImageFile(event.target.files?.[0] ?? null)}
                    className="w-full text-sm text-gray-700"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-2 w-full h-10 px-4 bg-[#C62222] text-white text-sm font-medium rounded-md hover:bg-[#A01B1B] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C62222] disabled:opacity-70"
                >
                  <Upload className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>

                {editError && (
                  <p className="text-xs text-[#C62222]" role="alert">
                    {editError}
                  </p>
                )}
                {editMessage && (
                  <p className="text-xs text-[#16A34A]" role="status">
                    {editMessage}
                  </p>
                )}
              </form>
            </section>
          )}
        </div>
      </main>

      {/* Delete Item Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 text-red-600">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Item</h3>
              <p className="text-gray-500 text-sm mb-6">
                Are you sure you want to delete this item? This action cannot be undone.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors shadow-sm shadow-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default VendorRestaurant;
