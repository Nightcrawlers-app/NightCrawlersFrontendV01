import React, { useEffect, useMemo, useState } from 'react';
import { X, Plus, Tag, Trash2, Pencil, Loader2, ImagePlus, Search, Ticket } from 'lucide-react';
import {
    BUSINESS_TYPES,
    getAllPromotionsForAdmin,
    createPromotion,
    updatePromotion,
    deletePromotion,
    getAllStores,
    describeDiscount,
    toErrorMessage,
    getCustomersForAdmin,
} from '../../services/api';
import type { Promotion, PromotionInput, VendorStore, BusinessType, DiscountType, PromotionScope, CustomerLookup } from '../../types/models';
import CustomerPicker from './CustomerPicker';
import CampaignCodes from './CampaignCodes';

/**
 *   shared   — one code (or none) anyone can use
 *   locked   — one code that only works for the customers picked
 *   campaign — every chosen customer gets their own single-use code
 */
type CodeMode = 'shared' | 'locked' | 'campaign';
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
    itemKeywords: string;
    fundedBy: 'platform' | 'vendor';
    startsAt: string;
    endsAt: string;
    isActive: boolean;
    priority: string;
    code: string;
    audience: 'everyone' | 'new_customers';
    usageLimit: string;
    perCustomerLimit: string;
    listed: boolean;
    codeMode: CodeMode;
    customers: CustomerLookup[];
    birthday: boolean;
    codeValidDays: string;
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
    itemKeywords: '',
    fundedBy: 'platform',
    startsAt: '',
    endsAt: '',
    isActive: true,
    priority: '0',
    code: '',
    audience: 'everyone',
    usageLimit: '',
    perCustomerLimit: '',
    listed: true,
    codeMode: 'shared',
    customers: [],
    birthday: false,
    codeValidDays: '7',
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
    itemKeywords: (p.itemKeywords || []).join(', '),
    fundedBy: p.fundedBy,
    startsAt: toLocalInput(p.startsAt),
    endsAt: toLocalInput(p.endsAt),
    isActive: p.isActive,
    priority: String(p.priority ?? 0),
    code: p.code ?? '',
    audience: p.audience ?? 'everyone',
    usageLimit: p.usageLimit ? String(p.usageLimit) : '',
    perCustomerLimit: p.perCustomerLimit ? String(p.perCustomerLimit) : '',
    listed: p.listed !== false,
    codeMode: p.isCampaign ? 'campaign' : (p.customerIds?.length ? 'locked' : 'shared'),
    customers: (p.customerIds || []).map((id) => ({ id, name: '', email: '' })), // names filled in by openEdit
    birthday: Boolean(p.birthday),
    codeValidDays: String(p.codeValidDays ?? 7),
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
    itemKeywords: f.itemKeywords.split(',').map((k) => k.trim()).filter(Boolean),
    fundedBy: f.fundedBy,
    startsAt: f.startsAt ? new Date(f.startsAt).toISOString() : null,
    endsAt: f.endsAt ? new Date(f.endsAt).toISOString() : null,
    isActive: f.isActive,
    priority: Number(f.priority) || 0,
    code: f.codeMode === 'campaign' ? null : f.code.trim().toUpperCase() || null,
    isCampaign: f.codeMode === 'campaign',
    birthday: f.codeMode === 'campaign' && f.birthday,
    codeValidDays: Math.min(60, Math.max(1, Math.floor(Number(f.codeValidDays) || 7))),
    customerIds: f.codeMode === 'locked' ? f.customers.map((c) => c.id) : [],
    audience: f.audience,
    usageLimit: Number(f.usageLimit) > 0 ? Math.floor(Number(f.usageLimit)) : null,
    perCustomerLimit: Number(f.perCustomerLimit) > 0 ? Math.floor(Number(f.perCustomerLimit)) : null,
    // Only shared code promos can be hidden; without a code nobody could use it.
    // Codes for particular people are never advertised.
    listed: f.codeMode !== 'shared' ? false : f.code.trim() ? f.listed : true,
});

const statusOf = (p: Promotion) => {
    if (!p.isActive) return { label: 'Paused', cls: 'bg-gray-100 text-gray-600' };
    if (p.endsAt && new Date(p.endsAt) < new Date()) return { label: 'Ended', cls: 'bg-gray-100 text-gray-500' };
    if (p.startsAt && new Date(p.startsAt) > new Date()) return { label: 'Scheduled', cls: 'bg-blue-50 text-blue-700' };
    return { label: 'Live', cls: 'bg-green-50 text-green-700' };
};

const input =
    'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:border-[#E00B0B] transition-colors';
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
    // Campaign whose personal codes are open
    const [codesFor, setCodesFor] = useState<Promotion | null>(null);

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
        // Show names, not ids, for customers the code is locked to.
        if (p.customerIds?.length) {
            getCustomersForAdmin(p.customerIds)
                .then((found) => setForm((f) => ({ ...f, customers: f.customers.map((c) => found.find((x) => x.id === c.id) ?? { ...c, name: '(deleted account)' }) })))
                .catch(() => undefined);
        }
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
        if (form.codeMode === 'locked' && !form.customers.length) return setFormError('Pick at least one customer.');
        if (form.codeMode === 'locked' && !form.code.trim()) return setFormError('Give the promo a code.');
        setSaving(true);
        try {
            const data = toInput(form);
            const saved = editing === 'new' ? await createPromotion(data) : editing ? await updatePromotion(editing.id, data) : null;
            setEditing(null);
            await load();
            // New campaign: go straight to handing out codes.
            if (saved?.isCampaign && editing === 'new') setCodesFor(saved);
        } catch (err) {
            setFormError(toErrorMessage(err, "Couldn't save the promo."));
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (p: Promotion) => {
        try {
            const updated = await updatePromotion(p.id, { isActive: !p.isActive });
            setPromos((list) => list.map((x) => (x.id === p.id ? { ...x, ...updated } : x)));
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
                        <Tag size={18} className="text-[#E00B0B]" />
                        <h2 className="text-lg font-bold text-gray-900">
                            {codesFor ? 'Personal codes' : editing ? (editing === 'new' ? 'New promotion' : 'Edit promotion') : 'Promotions'}
                        </h2>
                    </div>
                    <button onClick={codesFor ? () => setCodesFor(null) : editing ? () => setEditing(null) : onClose} className="text-gray-400 hover:text-gray-700" aria-label={codesFor || editing ? 'Back' : 'Close'}>
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {error && <p className="mb-4 text-sm text-[#991B1B] bg-[#FEECEC] rounded-lg px-3 py-2">{error}</p>}

                    {codesFor && <CampaignCodes promo={codesFor} onChanged={load} />}

                    {!editing && !codesFor && (
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm text-gray-500">Live promos appear as banners on Explore and are applied at checkout.</p>
                                <button
                                    onClick={openNew}
                                    className="inline-flex items-center gap-1.5 bg-[#E00B0B] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#B80909] flex-shrink-0"
                                >
                                    <Plus size={16} /> New promo
                                </button>
                            </div>

                            {loading ? (
                                <div className="py-12 flex justify-center">
                                    <Loader2 className="animate-spin text-[#E00B0B]" />
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
                                                <div className="w-20 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#E00B0B] to-[#3B0A0A]">
                                                    {p.imageUrl && <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-semibold text-gray-900 truncate">{p.title}</p>
                                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
                                                        {p.code && (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-900 text-white tracking-wide">
                                                                {p.code}{p.customerIds?.length ? ` (${p.customerIds.length} ${p.customerIds.length === 1 ? 'account' : 'accounts'})` : p.listed === false ? ' (hidden)' : ''}
                                                            </span>
                                                        )}
                                                        {p.isCampaign && (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-900 text-white">
                                                                {p.birthday ? '🎂 Birthday codes' : 'Personal codes'}: {p.codesUsed ?? 0}/{p.codesIssued ?? 0} used
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 truncate">
                                                        {describeDiscount(p)} ·{' '}
                                                        {p.scope === 'all'
                                                            ? 'All stores'
                                                            : p.scope === 'category'
                                                                ? `All ${p.businessType}`
                                                                : p.storeIds.map(storeName).join(', ')}
                                                        {p.audience === 'new_customers' ? ' · First order only' : ''}
                                                        {p.usageLimit ? ` · ${p.timesUsed ?? 0}/${p.usageLimit} used` : p.timesUsed ? ` · used ${p.timesUsed}×` : ''}
                                                    </p>
                                                </div>
                                                {p.isCampaign && (
                                                    <button
                                                        onClick={() => setCodesFor(p)}
                                                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#E00B0B] border border-[#F5C2C2] rounded-lg px-2.5 py-1.5 hover:bg-[#FFF5F5]"
                                                    >
                                                        <Ticket size={13} /> Codes
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => toggleActive(p)}
                                                    className="text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50"
                                                >
                                                    {p.isActive ? 'Pause' : 'Resume'}
                                                </button>
                                                <button onClick={() => openEdit(p)} className="p-2 text-gray-500 hover:text-gray-900" aria-label="Edit">
                                                    <Pencil size={16} />
                                                </button>
                                                <button onClick={() => remove(p)} className="p-2 text-gray-400 hover:text-[#E00B0B]" aria-label="Delete">
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
                            <label className="relative block w-full h-40 rounded-xl overflow-hidden cursor-pointer border-2 border-dashed border-gray-200 hover:border-[#E00B0B] bg-gradient-to-br from-[#E00B0B] to-[#3B0A0A]">
                                {form.imageUrl && <img src={form.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent p-4 flex flex-col justify-end text-white">
                                    {form.badge && <span className="self-start bg-white text-[#E00B0B] text-[11px] font-bold uppercase px-2 py-0.5 rounded-full mb-1">{form.badge}</span>}
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
                                        <option value="platform">Nightcrawlers</option>
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
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${form.scope === s ? 'border-[#E00B0B] bg-[#FFF5F5] text-[#E00B0B]' : 'border-gray-200 text-gray-600'}`}
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
                                                            className="accent-[#E00B0B]"
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

                            {/* Promo code & who can use it */}
                            <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                                <div className="sm:col-span-2">
                                    <span className={labelCls}>Code</span>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Code">
                                        {([
                                            { value: 'shared', title: 'Anyone', detail: 'One code (or none) that works for everyone' },
                                            { value: 'locked', title: 'Specific accounts', detail: 'One code that only works for people you pick' },
                                            { value: 'campaign', title: 'Personal codes', detail: 'Each person gets their own single-use code' },
                                        ] as { value: CodeMode; title: string; detail: string }[]).map((m) => (
                                            <label
                                                key={m.value}
                                                className={`flex items-start gap-2 p-3 rounded-lg border bg-white cursor-pointer text-sm ${form.codeMode === m.value ? 'border-[#E00B0B]' : 'border-gray-200'}`}
                                            >
                                                <input type="radio" name="code-mode" className="accent-[#E00B0B] mt-0.5" checked={form.codeMode === m.value} onChange={() => set('codeMode', m.value)} />
                                                <span>
                                                    <span className="block font-medium text-gray-900">{m.title}</span>
                                                    <span className="block text-[11px] text-gray-500">{m.detail}</span>
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                {form.codeMode === 'campaign' ? (
                                    <div className="sm:col-span-2 space-y-3">
                                        <label className="flex items-start gap-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2">
                                            <input type="checkbox" checked={form.birthday} onChange={(e) => set('birthday', e.target.checked)} className="accent-[#E00B0B] w-4 h-4 mt-0.5" />
                                            <span>
                                                <span className="font-medium text-gray-900">🎂 Birthday promo</span>
                                                <span className="block text-[11px] text-gray-500">
                                                    Sent automatically on each customer's birthday (to those who've added it to their profile), by email and SMS. One per customer per year.
                                                </span>
                                            </span>
                                        </label>
                                        {form.birthday && (
                                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                                Each code works for
                                                <input type="number" min={1} max={60} value={form.codeValidDays} onChange={(e) => set('codeValidDays', e.target.value)} className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white" />
                                                days from their birthday
                                            </label>
                                        )}
                                        <p className="text-[12px] text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2">
                                            {form.birthday
                                                ? 'Leave the promo running (no end date) and it works every year. You can still hand out extra codes by hand after saving.'
                                                : "After you save, you'll choose who gets a code (people you pick, a list of emails, lapsed customers or everyone)."}{' '}
                                            Codes look like <span className="font-mono font-semibold">{form.birthday ? 'ADA-HBD7K2' : 'ADA-7K2Q'}</span>, work once, only on that person's account, and show up in their Rewards tab.
                                        </p>
                                    </div>
                                ) : (
                                <div>
                                    <label className={labelCls} htmlFor="promo-code-field">{form.codeMode === 'locked' ? 'Promo code' : 'Promo code (optional)'}</label>
                                    <input
                                        id="promo-code-field"
                                        className={`${input} uppercase tracking-wide`}
                                        value={form.code}
                                        onChange={(e) => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 20))}
                                        placeholder="e.g. NIGHT10"
                                    />
                                    <p className="text-[11px] text-gray-500 mt-1">
                                        {form.codeMode === 'locked'
                                            ? 'Only the accounts you pick below can use it; anyone else is told it isn’t linked to their account.'
                                            : 'With a code, the promo only applies when a customer types it at checkout. Leave empty to apply it automatically.'}
                                    </p>
                                </div>
                                )}
                                <div>
                                    <label className={labelCls}>Who can use it</label>
                                    <select className={input} value={form.audience} onChange={(e) => set('audience', e.target.value as FormState['audience'])}>
                                        <option value="everyone">Everyone</option>
                                        <option value="new_customers">First order only (new customers)</option>
                                    </select>
                                    <p className="text-[11px] text-gray-500 mt-1">
                                        First-order promos need the customer to be signed in, and stop working once they've ordered.
                                    </p>
                                </div>
                                <div>
                                    <label className={labelCls}>Total uses (optional)</label>
                                    <input className={input} type="number" min={1} value={form.usageLimit} onChange={(e) => set('usageLimit', e.target.value)} placeholder="No limit" />
                                </div>
                                <div>
                                    <label className={labelCls}>Uses per customer (optional)</label>
                                    <input className={input} type="number" min={1} value={form.perCustomerLimit} onChange={(e) => set('perCustomerLimit', e.target.value)} placeholder="No limit" />
                                </div>
                                {form.codeMode === 'locked' && (
                                    <div className="sm:col-span-2">
                                        <CustomerPicker
                                            label="Accounts that can use it"
                                            selected={form.customers}
                                            onChange={(next) => set('customers', next)}
                                        />
                                    </div>
                                )}
                                {form.codeMode === 'shared' && form.code.trim() && (
                                    <label className="sm:col-span-2 flex items-start gap-2 text-sm text-gray-700">
                                        <input type="checkbox" checked={form.listed} onChange={(e) => set('listed', e.target.checked)} className="accent-[#E00B0B] w-4 h-4 mt-0.5" />
                                        <span>
                                            Show in the banner and on store cards
                                            <span className="block text-[11px] text-gray-500">Untick for a secret code you share yourself (Instagram, flyers, influencers).</span>
                                        </span>
                                    </label>
                                )}
                            </fieldset>

                            <div>
                                <label className={labelCls}>Only these items (optional)</label>
                                <input
                                    className={input}
                                    value={form.itemKeywords}
                                    onChange={(e) => set('itemKeywords', e.target.value)}
                                    placeholder="e.g. pizza, shawarma — leave empty for the whole order"
                                />
                                <p className="text-[11px] text-gray-500 mt-1">
                                    Separate with commas. Matches menu item names and categories, so "pizza" covers
                                    "Pepperoni Pizza" and anything in a "Pizza" category. Stores without a matching item won't show this promo.
                                </p>
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
                                <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="accent-[#E00B0B] w-4 h-4" />
                                Active (uncheck to save as a draft)
                            </label>

                            {formError && <p className="text-sm text-[#991B1B] bg-[#FEECEC] rounded-lg px-3 py-2">{formError}</p>}
                        </div>
                    )}
                </div>

                {editing && !codesFor && (
                    <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
                        <button onClick={() => setEditing(null)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                            Cancel
                        </button>
                        <button
                            onClick={save}
                            disabled={saving}
                            className="flex-1 py-2.5 bg-[#E00B0B] text-white rounded-lg text-sm font-semibold hover:bg-[#B80909] disabled:opacity-60"
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
