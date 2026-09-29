import React, { useEffect, useMemo, useState } from 'react';
import { X, Plus, Megaphone, Trash2, Pencil, Loader2, ImagePlus, Search } from 'lucide-react';
import {
    BUSINESS_TYPES,
    getAllPlacementsForAdmin,
    createPlacement,
    updatePlacement,
    deletePlacement,
    getAllStores,
    toErrorMessage,
} from '../../services/api';
import type { Placement, PlacementInput, VendorStore, BusinessType } from '../../types/models';
import { compressImage } from '../../lib/imageUtils';

type FormState = {
    storeId: string;
    category: BusinessType;
    label: string;
    imageUrl: string;
    advertiser: string;
    startsAt: string;
    endsAt: string;
    isActive: boolean;
    priority: string;
};

const EMPTY: FormState = {
    storeId: '',
    category: 'Food',
    label: 'Sponsored',
    imageUrl: '',
    advertiser: '',
    startsAt: '',
    endsAt: '',
    isActive: true,
    priority: '0',
};

const toLocalInput = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const statusOf = (p: Placement) => {
    if (!p.isActive) return { label: 'Paused', cls: 'bg-gray-100 text-gray-600' };
    if (p.endsAt && new Date(p.endsAt) < new Date()) return { label: 'Ended', cls: 'bg-gray-100 text-gray-500' };
    if (p.startsAt && new Date(p.startsAt) > new Date()) return { label: 'Scheduled', cls: 'bg-blue-50 text-blue-700' };
    return { label: 'Live', cls: 'bg-green-50 text-green-700' };
};

const input = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:border-[#E00B0B] transition-colors';
const labelCls = 'block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1';

/**
 * Admin screen for paid spots in "Popular on Nightcrawlers" on the home page.
 * Each ad puts one store first in one category tab for a date range, and
 * counts how often it was shown and tapped (for reporting to the advertiser).
 */
const PlacementsManager: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [ads, setAds] = useState<Placement[]>([]);
    const [stores, setStores] = useState<VendorStore[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState<Placement | 'new' | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [storeSearch, setStoreSearch] = useState('');

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const [a, s] = await Promise.all([getAllPlacementsForAdmin(), getAllStores()]);
            setAds(a);
            setStores(s.map((st) => ({ ...st, id: st.id ?? (st as VendorStore & { _id?: string })._id ?? '' })));
        } catch (err) {
            setError(toErrorMessage(err, "Couldn't load ads."));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

    const openNew = () => {
        setForm(EMPTY);
        setFormError('');
        setStoreSearch('');
        setEditing('new');
    };
    const openEdit = (p: Placement) => {
        setForm({
            storeId: p.storeId,
            category: p.category,
            label: p.label,
            imageUrl: p.imageUrl,
            advertiser: p.advertiser,
            startsAt: toLocalInput(p.startsAt),
            endsAt: toLocalInput(p.endsAt),
            isActive: p.isActive,
            priority: String(p.priority ?? 0),
        });
        setFormError('');
        setStoreSearch('');
        setEditing(p);
    };

    const onImage = async (file?: File) => {
        if (!file) return;
        try {
            set('imageUrl', await compressImage(file, { maxSize: 800, quality: 0.8 }));
        } catch (err) {
            setFormError(toErrorMessage(err, "Couldn't read that image."));
        }
    };

    const save = async () => {
        setFormError('');
        if (!form.storeId) return setFormError('Choose the store to advertise.');
        const data: PlacementInput = {
            storeId: form.storeId,
            category: form.category,
            label: form.label.trim() || 'Sponsored',
            imageUrl: form.imageUrl,
            advertiser: form.advertiser.trim(),
            startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
            endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
            isActive: form.isActive,
            priority: Number(form.priority) || 0,
        };
        setSaving(true);
        try {
            if (editing === 'new') await createPlacement(data);
            else if (editing) await updatePlacement(editing.id, data);
            setEditing(null);
            await load();
        } catch (err) {
            setFormError(toErrorMessage(err, "Couldn't save the ad."));
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (p: Placement) => {
        try {
            const updated = await updatePlacement(p.id, { isActive: !p.isActive });
            setAds((list) => list.map((x) => (x.id === p.id ? { ...x, ...updated } : x)));
        } catch (err) {
            setError(toErrorMessage(err, "Couldn't update the ad."));
        }
    };

    const remove = async (p: Placement) => {
        if (!window.confirm(`Delete the ad for ${p.storeName ?? 'this store'}? Its view and tap counts go with it.`)) return;
        try {
            await deletePlacement(p.id);
            setAds((list) => list.filter((x) => x.id !== p.id));
        } catch (err) {
            setError(toErrorMessage(err, "Couldn't delete the ad."));
        }
    };

    const filteredStores = useMemo(() => {
        const q = storeSearch.trim().toLowerCase();
        const list = stores.filter((s) => s.businessType === form.category || s.id === form.storeId);
        return q ? list.filter((s) => s.name.toLowerCase().includes(q)) : list;
    }, [stores, storeSearch, form.category, form.storeId]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div role="dialog" aria-modal="true" aria-labelledby="ads-title" className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[720px] max-h-[90vh] flex flex-col overflow-hidden font-poppins">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <Megaphone size={18} className="text-[#E00B0B]" />
                        <h2 id="ads-title" className="text-lg font-bold text-gray-900">
                            {editing ? (editing === 'new' ? 'New ad' : 'Edit ad') : 'Ads in "Popular on Nightcrawlers"'}
                        </h2>
                    </div>
                    <button onClick={editing ? () => setEditing(null) : onClose} className="text-gray-400 hover:text-gray-700" aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {error && <p className="mb-4 text-sm text-[#991B1B] bg-[#FEECEC] rounded-lg px-3 py-2">{error}</p>}

                    {!editing && (
                        <>
                            <div className="flex items-center justify-between gap-4 mb-4">
                                <p className="text-sm text-gray-500">Live ads show first in their tab on the home page, marked "Sponsored".</p>
                                <button onClick={openNew} className="inline-flex items-center gap-1.5 bg-[#E00B0B] text-white text-sm font-semibold px-3 py-2 rounded-lg hover:bg-[#B80909] flex-shrink-0">
                                    <Plus size={16} /> New ad
                                </button>
                            </div>
                            {loading ? (
                                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#E00B0B]" /></div>
                            ) : ads.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-10">No ads yet. Sell a spot to a store and add it here.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {ads.map((p) => {
                                        const status = statusOf(p);
                                        const ctr = p.impressions ? ((p.clicks / p.impressions) * 100).toFixed(1) : '0.0';
                                        return (
                                            <li key={p.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-semibold text-gray-900 truncate">{p.storeName}</p>
                                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 truncate">
                                                        {p.category} tab{p.advertiser ? ` · ${p.advertiser}` : ''} · {p.impressions.toLocaleString()} views, {p.clicks.toLocaleString()} taps ({ctr}%)
                                                    </p>
                                                </div>
                                                <button onClick={() => toggleActive(p)} className="text-xs font-semibold text-gray-600 hover:text-[#E00B0B] px-2">
                                                    {p.isActive ? 'Pause' : 'Resume'}
                                                </button>
                                                <button onClick={() => openEdit(p)} className="p-2 text-gray-400 hover:text-gray-700" aria-label="Edit"><Pencil size={15} /></button>
                                                <button onClick={() => remove(p)} className="p-2 text-gray-400 hover:text-[#E00B0B]" aria-label="Delete"><Trash2 size={15} /></button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </>
                    )}

                    {editing && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Tab</label>
                                    <select className={input} value={form.category} onChange={(e) => set('category', e.target.value as BusinessType)}>
                                        {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Label on the tile</label>
                                    <input className={input} value={form.label} maxLength={20} onChange={(e) => set('label', e.target.value)} placeholder="Sponsored" />
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>Store</label>
                                <div className="border border-gray-200 rounded-lg">
                                    <div className="relative border-b border-gray-100">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input className="w-full pl-8 pr-3 py-2 text-sm outline-none rounded-t-lg" placeholder={`Search ${form.category} stores`} value={storeSearch} onChange={(e) => setStoreSearch(e.target.value)} />
                                    </div>
                                    <ul className="max-h-44 overflow-y-auto py-1" role="radiogroup">
                                        {filteredStores.map((s) => (
                                            <li key={s.id}>
                                                <label className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer">
                                                    <input type="radio" name="ad-store" checked={form.storeId === s.id} onChange={() => set('storeId', s.id)} className="accent-[#E00B0B]" />
                                                    <span className="flex-1 truncate">{s.name}</span>
                                                    <span className="text-[11px] text-gray-400 truncate max-w-[40%]">{s.address}</span>
                                                </label>
                                            </li>
                                        ))}
                                        {filteredStores.length === 0 && <li className="px-3 py-2 text-sm text-gray-400">No {form.category} stores found.</li>}
                                    </ul>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Advertiser / notes (only you see this)</label>
                                    <input className={input} value={form.advertiser} onChange={(e) => set('advertiser', e.target.value)} placeholder="e.g. Paid ₦20,000, Oct campaign" />
                                </div>
                                <div>
                                    <label className={labelCls}>Order (higher shows first)</label>
                                    <input className={input} type="number" value={form.priority} onChange={(e) => set('priority', e.target.value)} />
                                </div>
                                <div>
                                    <label className={labelCls}>Starts</label>
                                    <input className={input} type="datetime-local" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} />
                                </div>
                                <div>
                                    <label className={labelCls}>Ends</label>
                                    <input className={input} type="datetime-local" value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} />
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>Tile image (optional)</label>
                                <div className="flex items-center gap-3">
                                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                                        {form.imageUrl ? <img src={form.imageUrl} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="text-gray-300" />}
                                    </div>
                                    <label className="text-sm font-semibold text-[#E00B0B] cursor-pointer hover:underline">
                                        {form.imageUrl ? 'Change image' : 'Upload image'}
                                        <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => onImage(e.target.files?.[0])} />
                                    </label>
                                    {form.imageUrl && <button type="button" onClick={() => set('imageUrl', '')} className="text-sm text-gray-500 hover:underline">Remove</button>}
                                </div>
                                <p className="text-[11px] text-gray-500 mt-1">Square works best. Without one, the store's own photo is used.</p>
                            </div>

                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="accent-[#E00B0B] w-4 h-4" />
                                Active (untick to save without showing it)
                            </label>

                            {formError && <p className="text-sm text-[#991B1B] bg-[#FEECEC] rounded-lg px-3 py-2">{formError}</p>}
                        </div>
                    )}
                </div>

                {editing && (
                    <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
                        <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900">Cancel</button>
                        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 bg-[#E00B0B] text-white text-sm font-semibold rounded-lg hover:bg-[#B80909] disabled:opacity-60">
                            {saving && <Loader2 size={15} className="animate-spin" />}
                            {editing === 'new' ? 'Create ad' : 'Save changes'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlacementsManager;
