import React, { useEffect, useMemo, useState } from 'react';
import { X, Plus, Tag, Trash2, Pencil, Loader2, ImagePlus, Search } from 'lucide-react';
import {
    BUSINESS_TYPES,
    getAllPromotionsForAdmin,
    createPromotion,
    updatePromotion,
    deletePromotion,
    getAllStores,
    describeDiscount,
    toErrorMessage,
} from '../../services/api';
import type { Promotion, PromotionInput, VendorStore, BusinessType, DiscountType, PromotionScope } from '../../types/models';
import { compressImage } from '../../lib/imageUtils';

interface PromotionsManagerProps {
    onClose: () => void;
}

type FormState = {
    title: string;
    subtitle: string;
    badge: string;
    imageUrl: string;
    discountType: DiscountType;
    discountValue: string;
    maxDiscount: string;
    minOrderAmount: string;
    scope: PromotionScope;
    businessType: BusinessType | '';
    storeIds: string[];
    fundedBy: 'platform' | 'vendor';
    startsAt: string;
    endsAt: string;
    isActive: boolean;
    priority: string;
};

const EMPTY: FormState = {
    title: '',
    subtitle: '',
    badge: '',
    imageUrl: '',
    discountType: 'percent',
    discountValue: '',
    maxDiscount: '',
    minOrderAmount: '',
    scope: 'all',
    businessType: '',
    storeIds: [],
    fundedBy: 'platform',
    startsAt: '',
    endsAt: '',
    isActive: true,
    priority: '0',
};

// <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in local time.
const toLocalInput = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromPromotion = (p: Promotion): FormState => ({
    title: p.title,
    subtitle: p.subtitle,
    badge: p.badge,
    imageUrl: p.imageUrl,
    discountType: p.discountType,
    discountValue: p.discountValue ? String(p.discountValue) : '',
    maxDiscount: p.maxDiscount ? String(p.maxDiscount) : '',
    minOrderAmount: p.minOrderAmount ? String(p.minOrderAmount) : '',
    scope: p.scope,
    businessType: p.businessType ?? '',
    storeIds: p.storeIds,
    fundedBy: p.fundedBy,
    startsAt: toLocalInput(p.startsAt),
    endsAt: toLocalInput(p.endsAt),
    isActive: p.isActive,
    priority: String(p.priority ?? 0),
});

const toInput = (f: FormState): PromotionInput => ({
    title: f.title.trim(),
    subtitle: f.subtitle.trim(),
    badge: f.badge.trim(),
    imageUrl: f.imageUrl,
    discountType: f.discountType,
    discountValue: f.discountType === 'free_delivery' ? 0 : Number(f.discountValue) || 0,
    maxDiscount: f.discountType === 'percent' && f.maxDiscount ? Number(f.maxDiscount) : null,
    minOrderAmount: Number(f.minOrderAmount) || 0,
    scope: f.scope,
    businessType: f.scope === 'category' ? (f.businessType || null) : null,
    storeIds: f.scope === 'stores' ? f.storeIds : [],
    fundedBy: f.fundedBy,
    startsAt: f.startsAt ? new Date(f.startsAt).toISOString() : null,
    endsAt: f.endsAt ? new Date(f.endsAt).toISOString() : null,
    isActive: f.isActive,
    priority: Number(f.priority) || 0,
});

const statusOf = (p: Promotion) => {
    if (!p.isActive) return { label: 'Paused', cls: 'bg-gray-100 text-gray-600' };
    if (p.endsAt && new Date(p.endsAt) < new Date()) return { label: 'Ended', cls: 'bg-gray-100 text-gray-500' };
    if (p.startsAt && new Date(p.startsAt) > new Date()) return { label: 'Scheduled', cls: 'bg-blue-50 text-blue-700' };
    return { label: 'Live', cls: 'bg-green-50 text-green-700' };
};

const input =
    'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:border-[#C62222] transition-colors';
const labelCls = 'block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1';

/**
 * Admin screen for promos: the banners customers see on Explore, and the
 * discounts applied at checkout.
 */
const PromotionsManager: React.FC<PromotionsManagerProps> = ({ onClose }) => {
    const [promos, setPromos] = useState<Promotion[]>([]);
    const [stores, setStores] = useState<VendorStore[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState<Promotion | 'new' | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [storeSearch, setStoreSearch] = useState('');

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const [p, s] = await Promise.all([getAllPromotionsForAdmin(), getAllStores()]);
            setPromos(p);
            setStores(s.map((st) => ({ ...st, id: st.id ?? (st as VendorStore & { _id?: string })._id ?? '' })));
        } catch (err) {
            setError(toErrorMessage(err, "Couldn't load promotions."));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const openNew = () => {
        setForm(EMPTY);
        setFormError('');
        setEditing('new');
    };
    const openEdit = (p: Promotion) => {
        setForm(fromPromotion(p));
        setFormError('');
        setEditing(p);
    };

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

    const onImage = async (file?: File) => {
        if (!file) return;
        try {
            set('imageUrl', await compressImage(file, { maxSize: 1400, quality: 0.8 }));
        } catch (err) {
            setFormError(toErrorMessage(err, "Couldn't read that image."));
        }
    };

    const save = async () => {
        setFormError('');
        if (!form.title.trim()) return setFormError('Give the promo a title.');
        setSaving(true);
        try {
            const data = toInput(form);
            if (editing === 'new') await createPromotion(data);
            else if (editing) await updatePromotion(editing.id, data);
            setEditing(null);
            await load();
        } catch (err) {
            setFormError(toErrorMessage(err, "Couldn't save the promo."));
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (p: Promotion) => {
        try {
            const updated = await updatePromotion(p.id, { isActive: !p.isActive });
            setPromos((list) => list.map((x) => (x.id === p.id ? updated : x)));
        } catch (err) {
            setError(toErrorMessage(err, "Couldn't update the promo."));
        }
    };

    const remove = async (p: Promotion) => {
        if (!window.confirm(`Delete "${p.title}"? This can't be undone. (Pause it instead to keep it for later.)`)) return;
        try {
            await deletePromotion(p.id);
            setPromos((list) => list.filter((x) => x.id !== p.id));
        } catch (err) {
            setError(toErrorMessage(err, "Couldn't delete the promo."));
        }
    };

    const filteredStores = useMemo(() => {
        const q = storeSearch.trim().toLowerCase();
        return q ? stores.filter((s) => s.name.toLowerCase().includes(q)) : stores;
    }, [stores, storeSearch]);

    const storeName = (id: string) => stores.find((s) => s.id === id)?.name ?? 'Unknown store';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[760px] max-h-[90vh] flex flex-col overflow-hidden font-poppins">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <Tag size={18} className="text-[#C62222]" />
                        <h2 className="text-lg font-bold text-gray-900">
                            {editing ? (editing === 'new' ? 'New promotion' : 'Edit promotion') : 'Promotions'}
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
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm text-gray-500">Live promos appear as banners on Explore and are applied at checkout.</p>
                                <button
                                    onClick={openNew}
                                    className="inline-flex items-center gap-1.5 bg-[#C62222] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#A01B1B] flex-shrink-0"
                                >
                                    <Plus size={16} /> New promo
                                </button>
                            </div>

                            {loading ? (
                                <div className="py-12 flex justify-center">
                                    <Loader2 className="animate-spin text-[#C62222]" />
                                </div>
                            ) : promos.length === 0 ? (
                                <div className="py-12 text-center text-sm text-gray-500">
                                    No promotions yet. Create one and it will show on Explore straight away.
                                </div>
                            ) : (
                                <ul className="space-y-3">
                                    {promos.map((p) => {
                                        const status = statusOf(p);
                                        return (
                                            <li key={p.id} className="flex gap-3 items-center border border-gray-100 rounded-xl p-3">
                                                <div className="w-20 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#C62222] to-[#3B0A0A]">
                                                    {p.imageUrl && <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-semibold text-gray-900 truncate">{p.title}</p>
                                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 truncate">
                                                        {describeDiscount(p)} ·{' '}
                                                        {p.scope === 'all'
                                                            ? 'All stores'
                                                            : p.scope === 'category'
                                                                ? `All ${p.businessType}`
                                                                : p.storeIds.map(storeName).join(', ')}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => toggleActive(p)}
                                                    className="text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50"
                                                >
                                                    {p.isActive ? 'Pause' : 'Resume'}
                                                </button>
                                                <button onClick={() => openEdit(p)} className="p-2 text-gray-500 hover:text-gray-900" aria-label="Edit">
                                                    <Pencil size={16} />
                                                </button>
                                                <button onClick={() => remove(p)} className="p-2 text-gray-400 hover:text-[#C62222]" aria-label="Delete">
                                                    <Trash2 size={16} />
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </>
                    )}

                    {editing && (
                        <div className="space-y-5">
                            {/* Banner image */}
                            <label className="relative block w-full h-40 rounded-xl overflow-hidden cursor-pointer border-2 border-dashed border-gray-200 hover:border-[#C62222] bg-gradient-to-br from-[#C62222] to-[#3B0A0A]">
                                {form.imageUrl && <img src={form.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent p-4 flex flex-col justify-end text-white">
                                    {form.badge && <span className="self-start bg-white text-[#C62222] text-[11px] font-bold uppercase px-2 py-0.5 rounded-full mb-1">{form.badge}</span>}
                                    <span className="text-lg font-bold">{form.title || 'Promo title'}</span>
                                    <span className="text-xs text-white/80 flex items-center gap-1 mt-1">
                                        <ImagePlus size={13} /> {form.imageUrl ? 'Change banner image' : 'Add a banner image (optional, wide photo works best)'}
                                    </span>
                                </div>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => onImage(e.target.files?.[0])} />
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className={labelCls}>Title</label>
                                    <input className={input} value={form.title} maxLength={80} onChange={(e) => set('title', e.target.value)} placeholder="50% off KFC buckets" />
                                </div>
                                <div>
                                    <label className={labelCls}>Badge (on store cards)</label>
                                    <input className={input} value={form.badge} maxLength={20} onChange={(e) => set('badge', e.target.value)} placeholder="50% OFF" />
                                </div>
                                <div>
                                    <label className={labelCls}>Subtitle</label>
                                    <input className={input} value={form.subtitle} maxLength={160} onChange={(e) => set('subtitle', e.target.value)} placeholder="This weekend only" />
                                </div>
                            </div>

                            <fieldset className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className={labelCls}>Discount</label>
                                    <select className={input} value={form.discountType} onChange={(e) => set('discountType', e.target.value as DiscountType)}>
                                        <option value="percent">% off</option>
                                        <option value="fixed">₦ off</option>
                                        <option value="free_delivery">Free delivery</option>
                                    </select>
                                </div>
                                {form.discountType !== 'free_delivery' && (
                                    <div>
                                        <label className={labelCls}>{form.discountType === 'percent' ? 'Percent' : 'Amount (₦)'}</label>
                                        <input className={input} type="number" min={1} max={form.discountType === 'percent' ? 100 : undefined} value={form.discountValue} onChange={(e) => set('discountValue', e.target.value)} />
                                    </div>
                                )}
                                {form.discountType === 'percent' && (
                                    <div>
                                        <label className={labelCls}>Max discount (₦)</label>
                                        <input className={input} type="number" min={0} value={form.maxDiscount} onChange={(e) => set('maxDiscount', e.target.value)} placeholder="No cap" />
                                    </div>
                                )}
                                <div>
                                    <label className={labelCls}>Min. order (₦)</label>
                                    <input className={input} type="number" min={0} value={form.minOrderAmount} onChange={(e) => set('minOrderAmount', e.target.value)} placeholder="0" />
                                </div>
                                <div>
                                    <label className={labelCls}>Paid for by</label>
                                    <select className={input} value={form.fundedBy} onChange={(e) => set('fundedBy', e.target.value as 'platform' | 'vendor')}>
                                        <option value="platform">Night Crawlers</option>
                                        <option value="vendor">The vendor</option>
                                    </select>
                                </div>
                            </fieldset>

                            <div>
                                <label className={labelCls}>Where it applies</label>
                                <div className="flex gap-2 mb-3">
                                    {(['all', 'category', 'stores'] as PromotionScope[]).map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => set('scope', s)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${form.scope === s ? 'border-[#C62222] bg-[#FFF5F5] text-[#C62222]' : 'border-gray-200 text-gray-600'}`}
                                        >
                                            {s === 'all' ? 'All stores' : s === 'category' ? 'A category' : 'Specific stores'}
                                        </button>
                                    ))}
                                </div>
                                {form.scope === 'category' && (
                                    <select className={input} value={form.businessType} onChange={(e) => set('businessType', e.target.value as BusinessType)}>
                                        <option value="" disabled>Choose a category</option>
                                        {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                )}
                                {form.scope === 'stores' && (
                                    <div className="border border-gray-200 rounded-lg">
                                        <div className="relative border-b border-gray-100">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input className="w-full pl-8 pr-3 py-2 text-sm outline-none rounded-t-lg" placeholder="Search stores" value={storeSearch} onChange={(e) => setStoreSearch(e.target.value)} />
                                        </div>
                                        <ul className="max-h-44 overflow-y-auto py-1">
                                            {filteredStores.map((s) => (
                                                <li key={s.id}>
                                                    <label className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={form.storeIds.includes(s.id)}
                                                            onChange={(e) =>
                                                                set('storeIds', e.target.checked ? [...form.storeIds, s.id] : form.storeIds.filter((id) => id !== s.id))
                                                            }
                                                            className="accent-[#C62222]"
                                                        />
                                                        <span className="flex-1 truncate">{s.name}</span>
                                                        <span className="text-[11px] text-gray-400">{s.businessType}</span>
                                                    </label>
                                                </li>
                                            ))}
                                            {filteredStores.length === 0 && <li className="px-3 py-2 text-sm text-gray-400">No stores found.</li>}
                                        </ul>
                                        <p className="px-3 py-1.5 text-[11px] text-gray-500 border-t border-gray-100">
                                            {form.storeIds.length} selected{form.storeIds.length === 1 ? ' — tapping the banner opens this store directly' : ''}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className={labelCls}>Starts</label>
                                    <input className={input} type="datetime-local" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} />
                                </div>
                                <div>
                                    <label className={labelCls}>Ends</label>
                                    <input className={input} type="datetime-local" value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} />
                                </div>
                                <div>
                                    <label className={labelCls}>Order in carousel</label>
                                    <input className={input} type="number" value={form.priority} onChange={(e) => set('priority', e.target.value)} title="Higher shows first" />
                                </div>
                            </div>

                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="accent-[#C62222] w-4 h-4" />
                                Active (uncheck to save as a draft)
                            </label>

                            {formError && <p className="text-sm text-[#991B1B] bg-[#FEECEC] rounded-lg px-3 py-2">{formError}</p>}
                        </div>
                    )}
                </div>

                {editing && (
                    <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
                        <button onClick={() => setEditing(null)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                            Cancel
                        </button>
                        <button
                            onClick={save}
                            disabled={saving}
                            className="flex-1 py-2.5 bg-[#C62222] text-white rounded-lg text-sm font-semibold hover:bg-[#A01B1B] disabled:opacity-60"
                        >
                            {saving ? 'Saving…' : editing === 'new' ? 'Create promo' : 'Save changes'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PromotionsManager;
