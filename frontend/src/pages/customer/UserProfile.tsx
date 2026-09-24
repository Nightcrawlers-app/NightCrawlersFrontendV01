import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../../components/layout/Footer';
import Header from '../../components/layout/Header';
import { useAuth, getInitials, UserAddress } from '../../context/AuthContext';
import { useGlobalLoader } from '../../context/GlobalLoaderContext';
import PhoneVerificationModal from '../../components/ui/PhoneVerificationModal';
import {
    User, Mail, MapPin, Phone, Edit2, ShoppingBag, CreditCard,
    Bell, LogOut, ChevronRight, Clock, CheckCircle2, XCircle,
    Truck, Package, Plus, Heart, Star, TrendingUp, Calendar,
    Shield, ChevronDown, Eye, RotateCcw, X, Camera, Trash2, Check,
} from 'lucide-react';
import { formatPaymentMethod, toErrorMessage } from '../../services/api';
import { compressImage } from '../../lib/imageUtils';
import MapPicker from '../../components/map/MapPicker';
import type { PickedLocation } from '../../components/map/MapPicker';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    'delivered': { label: 'Delivered', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: <CheckCircle2 size={14} /> },
    'in-transit': { label: 'In Transit', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: <Truck size={14} /> },
    'preparing': { label: 'Preparing', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: <Package size={14} /> },
    'cancelled': { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: <XCircle size={14} /> },
    'refunded': { label: 'Refunded', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: <RotateCcw size={14} /> },
};

type TabType = 'profile' | 'transactions' | 'addresses' | 'settings';

const UserProfile: React.FC = () => {
    const { user, transactions, isAuthenticated, isInitializing, logout, updateProfile,
        addAddress, updateAddress, deleteAddress, setDefaultAddress,
        changePassword, deleteAccount } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabType>('profile');
    const { showLoaderWithDelay } = useGlobalLoader();
    const [expandedTxn, setExpandedTxn] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ firstName: '', lastName: '', phone: '' });
    const [txnFilter, setTxnFilter] = useState<'all' | 'delivered' | 'cancelled'>('all');
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showPhoneModal, setShowPhoneModal] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);

    // Address modal state
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
    const EMPTY_ADDRESS = { label: '', address: '', city: '', isDefault: false, latitude: null as number | null, longitude: null as number | null };
    const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS);
    const [showAddressMap, setShowAddressMap] = useState(false);
    const [savingAddress, setSavingAddress] = useState(false);

    // Password modal state
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
    const [passwordError, setPasswordError] = useState('');

    // Delete account modal state
    const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    // Toast notification
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(t);
        }
    }, [toast]);

    // Redirect if not authenticated — but wait for the initial session check,
    // otherwise a signed-in user gets bounced to /signin on every page load.
    useEffect(() => {
        if (!isInitializing && !isAuthenticated) {
            navigate('/signin');
        }
    }, [isInitializing, isAuthenticated, navigate]);

    useEffect(() => {
        if (user) {
            setEditForm({
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone,
            });
        }
    }, [user]);

    if (!user) return null;

    const initials = getInitials(user.firstName, user.lastName);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        // Reset the input so the same file can be selected again
        e.target.value = '';
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setToast({ message: 'Please select an image file.', type: 'error' });
            return;
        }
        if (file.size > 15 * 1024 * 1024) {
            setToast({ message: 'Image must be under 15MB.', type: 'error' });
            return;
        }

        setAvatarUploading(true);
        try {
            // Phone photos are often 3–8 MB. Shrink to a 512px JPEG (~30–80 KB)
            // so the upload is fast and the profile record stays small.
            const dataUrl = await compressImage(file, { maxSize: 512, quality: 0.85 });
            const saveError = await updateProfile({ avatar: dataUrl });
            setToast(saveError
                ? { message: saveError, type: 'error' }
                : { message: 'Profile photo updated!', type: 'success' });
        } catch (err) {
            setToast({ message: toErrorMessage(err, "Couldn't read that image. Try a different photo."), type: 'error' });
        } finally {
            setAvatarUploading(false);
        }
    };

    const handleRemoveAvatar = async () => {
        const saveError = await updateProfile({ avatar: null });
        setToast(saveError
            ? { message: saveError, type: 'error' }
            : { message: 'Profile photo removed.', type: 'success' });
    };

    // No page reload needed any more — the context updates from the server's
    // response, so React re-renders with the saved data on its own.
    const handleSaveProfile = async () => {
        const phoneChanged = editForm.phone !== user.phone;
        const saveError = await updateProfile(editForm);
        if (saveError) {
            setToast({ message: saveError, type: 'error' });
            return;
        }
        setIsEditing(false);
        setToast({ message: 'Profile updated successfully!', type: 'success' });
        // A new or changed phone number needs verifying
        if (editForm.phone && (phoneChanged || !user.phoneVerified)) {
            setShowPhoneModal(true);
        }
    };

    // ---- Address Handlers ----
    const openAddAddress = () => {
        setEditingAddress(null);
        setAddressForm(EMPTY_ADDRESS);
        setShowAddressModal(true);
        // New address: start on the map — that's how people find their spot.
        setShowAddressMap(true);
    };

    const openEditAddress = (addr: UserAddress) => {
        setEditingAddress(addr);
        setAddressForm({
            label: addr.label,
            address: addr.address,
            city: addr.city,
            isDefault: addr.isDefault,
            latitude: addr.latitude ?? null,
            longitude: addr.longitude ?? null,
        });
        setShowAddressModal(true);
    };

    const handleSaveAddress = async () => {
        if (!addressForm.label.trim() || !addressForm.address.trim() || !addressForm.city.trim()) {
            setToast({ message: 'Please fill in all address fields', type: 'error' });
            return;
        }
        setSavingAddress(true);
        const saveError = editingAddress
            ? await updateAddress(editingAddress.id, addressForm)
            : await addAddress(addressForm);
        setSavingAddress(false);
        if (saveError) {
            setToast({ message: saveError, type: 'error' });
            return;
        }
        setToast({ message: editingAddress ? 'Address updated!' : 'Address added!', type: 'success' });
        setShowAddressModal(false);
    };

    const handleAddressPicked = (picked: PickedLocation) => {
        setAddressForm(p => ({
            ...p,
            address: picked.label,
            city: picked.city || p.city,
            latitude: picked.coords.latitude,
            longitude: picked.coords.longitude,
        }));
        setShowAddressMap(false);
    };

    const handleDeleteAddress = async (id: string) => {
        await deleteAddress(id);
        setToast({ message: 'Address removed', type: 'success' });
    };

    const handleSetDefault = async (id: string) => {
        await setDefaultAddress(id);
        setToast({ message: 'Default address updated', type: 'success' });
    };

    // ---- Password Handler ----
    const handleChangePassword = async () => {
        setPasswordError('');
        if (!passwordForm.current || !passwordForm.newPass || !passwordForm.confirm) {
            setPasswordError('Please fill in all fields');
            return;
        }
        if (passwordForm.newPass !== passwordForm.confirm) {
            setPasswordError('New passwords do not match');
            return;
        }
        const result = await changePassword(passwordForm.current, passwordForm.newPass);
        if (!result.success) {
            setPasswordError(result.error || 'Failed to change password');
            return;
        }
        setShowPasswordModal(false);
        setPasswordForm({ current: '', newPass: '', confirm: '' });
        setToast({ message: 'Password changed successfully!', type: 'success' });
    };

    // ---- Delete Account Handler ----
    const handleDeleteAccount = async () => {
        await deleteAccount();
        navigate('/');
    };

    const filteredTransactions = transactions.filter(t => {
        if (txnFilter === 'all') return true;
        return t.status === txnFilter;
    });

    const totalSpent = transactions
        .filter(t => t.status !== 'cancelled' && t.status !== 'refunded')
        .reduce((sum, t) => sum + t.total, 0);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-NG', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('en-NG', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleLogout = async () => {
        showLoaderWithDelay(500);
        try {
            await logout();
        } finally {
            navigate('/');
        }
    };

    const SIDEBAR_TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
        { id: 'profile', label: 'My Profile', icon: <User size={18} /> },
        { id: 'transactions', label: 'Transactions', icon: <CreditCard size={18} /> },
        { id: 'addresses', label: 'Addresses', icon: <MapPin size={18} /> },
        { id: 'settings', label: 'Settings', icon: <Bell size={18} /> },
    ];

    return (
        <div className="min-h-screen bg-[#FAFAFA] font-poppins flex flex-col">
            <Header />

            <main className="flex-grow w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
                {/* Welcome Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1A1A1A] via-[#2D1F1F] to-[#C62222] p-6 sm:p-8 mb-8">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/20 blur-3xl -translate-y-1/2 translate-x-1/4" />
                        <div className="absolute bottom-0 left-1/4 w-48 h-48 rounded-full bg-[#C62222]/30 blur-3xl translate-y-1/2" />
                    </div>
                    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                        <div className="relative">
                            <div className="w-[72px] h-[72px] sm:w-[88px] sm:h-[88px] rounded-2xl overflow-hidden border-[3px] border-white/30 shadow-xl">
                                {user.avatar ? (
                                    <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-[#C62222] to-[#8B1616] flex items-center justify-center">
                                        <span className="text-white font-bold text-xl sm:text-2xl">{initials}</span>
                                    </div>
                                )}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-[3px] border-[#1A1A1A] flex items-center justify-center">
                                <CheckCircle2 size={12} className="text-white" />
                            </div>
                        </div>
                        <div className="flex-1">
                            <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">
                                Welcome back, {user.firstName}! 👋
                            </h1>
                            <p className="text-white/60 text-sm">
                                Member since {formatDate(user.joinedDate)} · {user.location}
                            </p>
                        </div>
                        <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full sm:w-auto">
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-center border border-white/10">
                                <p className="text-white/50 text-[10px] font-medium uppercase tracking-wider mb-0.5">Orders</p>
                                <p className="text-white text-lg sm:text-xl font-bold">{transactions.length}</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-center border border-white/10">
                                <p className="text-white/50 text-[10px] font-medium uppercase tracking-wider mb-0.5">Spent</p>
                                <p className="text-white text-lg sm:text-xl font-bold">₦{(totalSpent / 1000).toFixed(1)}k</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-center border border-white/10">
                                <p className="text-white/50 text-[10px] font-medium uppercase tracking-wider mb-0.5">Favorites</p>
                                <p className="text-white text-lg sm:text-xl font-bold">{user.favoriteVendors.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
                    {/* Sidebar */}
                    <aside className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-4 h-fit lg:sticky lg:top-28">
                        <nav className="space-y-1">
                            {SIDEBAR_TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${activeTab === tab.id
                                        ? 'bg-gradient-to-r from-[#FFF0F0] to-[#FFEDED] text-[#C62222] shadow-sm border border-red-100'
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                                        }`}
                                >
                                    <span className={`transition-colors ${activeTab === tab.id ? 'text-[#C62222]' : 'text-gray-400 group-hover:text-gray-500'}`}>
                                        {tab.icon}
                                    </span>
                                    {tab.label}
                                    <ChevronRight size={14} className={`ml-auto transition-all ${activeTab === tab.id ? 'text-[#C62222] opacity-100' : 'opacity-0 group-hover:opacity-50'
                                        }`} />
                                </button>
                            ))}
                        </nav>

                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <button
                                onClick={() => setShowLogoutConfirm(true)}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all duration-200"
                            >
                                <LogOut size={18} />
                                Sign Out
                            </button>
                        </div>
                    </aside>

                    {/* Content Area */}
                    <section className="space-y-6">
                        {/* ================= PROFILE TAB ================= */}
                        {activeTab === 'profile' && (
                            <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                                {/* Avatar Upload Section */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6 sm:p-8">
                                    <h2 className="text-lg font-bold text-gray-900 mb-1">Profile Picture</h2>
                                    <p className="text-xs text-gray-400 mb-5">Upload a photo to personalize your account</p>

                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarUpload}
                                        className="hidden"
                                        id="avatar-upload"
                                    />

                                    <div className="flex items-center gap-5">
                                        <div className="relative group">
                                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-gray-100 shadow-sm">
                                                {user.avatar ? (
                                                    <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-[#C62222] to-[#8B1616] flex items-center justify-center">
                                                        <span className="text-white font-bold text-2xl sm:text-3xl">{initials}</span>
                                                    </div>
                                                )}
                                            </div>
                                            {/* Hover overlay */}
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center cursor-pointer"
                                            >
                                                <Camera size={20} className="text-white" />
                                            </button>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex items-center gap-2 px-4 py-2 bg-[#C62222] text-white text-xs font-semibold rounded-lg hover:bg-[#A01B1B] transition-colors shadow-sm"
                                            >
                                                <Camera size={13} />
                                                {user.avatar ? 'Change Photo' : 'Upload Photo'}
                                            </button>
                                            {user.avatar && (
                                                <button
                                                    onClick={handleRemoveAvatar}
                                                    className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-500 text-xs font-medium rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors border border-gray-200"
                                                >
                                                    <X size={13} />
                                                    Remove
                                                </button>
                                            )}
                                            <p className="text-[10px] text-gray-400">{avatarUploading ? 'Uploading…' : 'JPG, PNG, WEBP or GIF.'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6 sm:p-8">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900">Personal Information</h2>
                                            <p className="text-xs text-gray-400 mt-0.5">Manage your personal details</p>
                                        </div>
                                        <button
                                            onClick={() => { if (isEditing) handleSaveProfile(); else setIsEditing(true); }}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${isEditing
                                                ? 'bg-[#C62222] text-white hover:bg-[#A01B1B] shadow-sm'
                                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                                                }`}
                                        >
                                            {isEditing ? <><CheckCircle2 size={13} /> Save Changes</> : <><Edit2 size={13} /> Edit</>}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">First Name</label>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={editForm.firstName}
                                                    onChange={e => setEditForm(p => ({ ...p, firstName: e.target.value }))}
                                                    className="w-full p-3 bg-white border-2 border-[#C62222]/20 rounded-lg text-gray-900 font-medium text-sm focus:outline-none focus:border-[#C62222] transition-colors"
                                                />
                                            ) : (
                                                <div className="p-3 bg-gray-50/80 rounded-lg text-gray-900 font-medium text-sm border border-gray-100">{user.firstName}</div>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Last Name</label>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={editForm.lastName}
                                                    onChange={e => setEditForm(p => ({ ...p, lastName: e.target.value }))}
                                                    className="w-full p-3 bg-white border-2 border-[#C62222]/20 rounded-lg text-gray-900 font-medium text-sm focus:outline-none focus:border-[#C62222] transition-colors"
                                                />
                                            ) : (
                                                <div className="p-3 bg-gray-50/80 rounded-lg text-gray-900 font-medium text-sm border border-gray-100">{user.lastName}</div>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Email Address</label>
                                            <div className="p-3 bg-gray-50/80 rounded-lg text-gray-900 text-sm flex items-center gap-2 border border-gray-100">
                                                <Mail size={15} className="text-gray-400" />
                                                {user.email}
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Phone Number</label>
                                            {isEditing ? (
                                                <div className="relative">
                                                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="tel"
                                                        value={editForm.phone}
                                                        onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                                                        className="w-full p-3 pl-9 bg-white border-2 border-[#C62222]/20 rounded-lg text-gray-900 font-medium text-sm focus:outline-none focus:border-[#C62222] transition-colors"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="p-3 bg-gray-50/80 rounded-lg text-sm flex items-center gap-2 border border-gray-100">
                                                    <Phone size={15} className="text-gray-400" />
                                                    {user.phone ? (
                                                        <div className="flex flex-1 items-center justify-between gap-2">
                                                            <span className="text-gray-900">{user.phone}</span>
                                                            {user.phoneVerified ? (
                                                                <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                                                    <CheckCircle2 size={10} /> Verified
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    onClick={() => setShowPhoneModal(true)}
                                                                    className="text-[10px] font-semibold text-[#C62222] bg-[#FFF0F0] px-2 py-0.5 rounded-full hover:bg-[#C62222] hover:text-white transition-colors"
                                                                >
                                                                    Verify
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 italic">Not added yet — click Edit to add</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Stats */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div className="bg-white rounded-xl p-4 border border-gray-100/80 shadow-sm hover:shadow-md transition-shadow duration-300">
                                        <div className="w-9 h-9 rounded-lg bg-[#FFF0F0] flex items-center justify-center mb-3">
                                            <ShoppingBag size={16} className="text-[#C62222]" />
                                        </div>
                                        <p className="text-lg font-bold text-gray-900">{transactions.length}</p>
                                        <p className="text-[11px] text-gray-400">Total Orders</p>
                                    </div>
                                    <div className="bg-white rounded-xl p-4 border border-gray-100/80 shadow-sm hover:shadow-md transition-shadow duration-300">
                                        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center mb-3">
                                            <TrendingUp size={16} className="text-emerald-600" />
                                        </div>
                                        <p className="text-lg font-bold text-gray-900">₦{totalSpent.toLocaleString()}</p>
                                        <p className="text-[11px] text-gray-400">Total Spent</p>
                                    </div>
                                    <div className="bg-white rounded-xl p-4 border border-gray-100/80 shadow-sm hover:shadow-md transition-shadow duration-300">
                                        <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
                                            <Heart size={16} className="text-amber-600" />
                                        </div>
                                        <p className="text-lg font-bold text-gray-900">{user.favoriteVendors.length}</p>
                                        <p className="text-[11px] text-gray-400">Favorite Vendors</p>
                                    </div>
                                    <div className="bg-white rounded-xl p-4 border border-gray-100/80 shadow-sm hover:shadow-md transition-shadow duration-300">
                                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
                                            <MapPin size={16} className="text-blue-600" />
                                        </div>
                                        <p className="text-lg font-bold text-gray-900">{user.addresses.length}</p>
                                        <p className="text-[11px] text-gray-400">Saved Addresses</p>
                                    </div>
                                </div>

                                {/* Favorite Vendors */}
                                {user.favoriteVendors.length > 0 && (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6">
                                        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                            <Heart size={16} className="text-[#C62222]" />
                                            Favorite Vendors
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {user.favoriteVendors.map(vendor => (
                                                <span key={vendor} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-xs font-medium text-gray-700 hover:border-[#C62222] hover:text-[#C62222] transition-colors cursor-pointer">
                                                    {vendor}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ================= TRANSACTIONS TAB ================= */}
                        {activeTab === 'transactions' && (
                            <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900">Transaction History</h2>
                                            <p className="text-xs text-gray-400 mt-0.5">View all your past orders and payments</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {(['all', 'delivered', 'cancelled'] as const).map(filter => (
                                                <button
                                                    key={filter}
                                                    onClick={() => setTxnFilter(filter)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${txnFilter === filter
                                                        ? 'bg-[#C62222] text-white shadow-sm'
                                                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-100'
                                                        }`}
                                                >
                                                    {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {filteredTransactions.length === 0 ? (
                                        <div className="text-center py-16">
                                            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <ShoppingBag className="text-gray-300" size={28} />
                                            </div>
                                            <p className="text-gray-500 text-sm font-medium mb-1">No transactions found</p>
                                            <p className="text-gray-400 text-xs">Your order history will appear here</p>
                                            <Link
                                                to="/explore"
                                                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-[#C62222] text-white text-xs font-semibold rounded-lg hover:bg-[#A01B1B] transition-colors"
                                            >
                                                Start Ordering
                                                <ChevronRight size={14} />
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {filteredTransactions.map((txn) => {
                                                const statusCfg = STATUS_CONFIG[txn.status];
                                                const isExpanded = expandedTxn === txn.id;

                                                return (
                                                    <div
                                                        key={txn.id}
                                                        className={`border rounded-xl overflow-hidden transition-all duration-300 ${isExpanded ? 'border-[#C62222]/20 shadow-md bg-[#FEFAFA]' : 'border-gray-100 hover:border-gray-200 bg-white'
                                                            }`}
                                                    >
                                                        {/* Transaction Header */}
                                                        <button
                                                            onClick={() => setExpandedTxn(isExpanded ? null : txn.id)}
                                                            className="w-full flex items-center gap-4 p-4 text-left transition-colors"
                                                        >
                                                            <div className="hidden sm:flex w-10 h-10 rounded-xl bg-gray-50 items-center justify-center flex-shrink-0 border border-gray-100">
                                                                <ShoppingBag size={16} className="text-gray-400" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-0.5">
                                                                    <p className="text-sm font-bold text-gray-900 truncate">{txn.orderId}</p>
                                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusCfg.bg} ${statusCfg.color}`}>
                                                                        {statusCfg.icon}
                                                                        {statusCfg.label}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-3 text-xs text-gray-400">
                                                                    <span className="flex items-center gap-1">
                                                                        <Calendar size={11} />
                                                                        {formatDate(txn.date)}
                                                                    </span>
                                                                    <span className="flex items-center gap-1">
                                                                        <Clock size={11} />
                                                                        {formatTime(txn.date)}
                                                                    </span>
                                                                    <span>· {txn.vendorName}</span>
                                                                </div>
                                                            </div>
                                                            <div className="text-right flex-shrink-0 flex items-center gap-3">
                                                                <div>
                                                                    <p className="text-sm font-bold text-gray-900">₦{txn.total.toLocaleString()}</p>
                                                                    <p className="text-[10px] text-gray-400">{txn.items.length} item{txn.items.length > 1 ? 's' : ''}</p>
                                                                </div>
                                                                <ChevronDown
                                                                    size={16}
                                                                    className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                                                                />
                                                            </div>
                                                        </button>

                                                        {/* Expanded Details */}
                                                        {isExpanded && (
                                                            <div className="border-t border-gray-100 px-4 pb-4 animate-[fadeIn_0.2s_ease-out]">
                                                                {/* Items */}
                                                                <div className="py-4 space-y-3">
                                                                    {txn.items.map((item, idx) => (
                                                                        <div key={idx} className="flex items-center gap-3">
                                                                            <img
                                                                                src={item.image}
                                                                                alt={item.name}
                                                                                className="w-11 h-11 rounded-lg object-cover border border-gray-100"
                                                                            />
                                                                            <div className="flex-1">
                                                                                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                                                                                <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                                                                            </div>
                                                                            <p className="text-sm font-semibold text-gray-900">₦{(item.price * item.quantity).toLocaleString()}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {/* Breakdown */}
                                                                <div className="border-t border-dashed border-gray-200 pt-3 space-y-2">
                                                                    <div className="flex justify-between text-xs text-gray-500">
                                                                        <span>Subtotal</span>
                                                                        <span>₦{txn.subtotal.toLocaleString()}</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-xs text-gray-500">
                                                                        <span>Delivery Fee</span>
                                                                        <span>₦{txn.deliveryFee.toLocaleString()}</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-100">
                                                                        <span>Total</span>
                                                                        <span>₦{txn.total.toLocaleString()}</span>
                                                                    </div>
                                                                </div>

                                                                {/* Meta Info */}
                                                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                    <div className="flex items-start gap-2 p-3 bg-gray-50/80 rounded-lg">
                                                                        <CreditCard size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                                                        <div>
                                                                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Payment</p>
                                                                            <p className="text-xs text-gray-700">{formatPaymentMethod(txn.paymentMethod)}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-start gap-2 p-3 bg-gray-50/80 rounded-lg">
                                                                        <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                                                        <div>
                                                                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Delivery</p>
                                                                            <p className="text-xs text-gray-700">{txn.deliveryAddress}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Actions */}
                                                                {txn.status === 'delivered' && (
                                                                    <div className="mt-3 flex items-center gap-2">
                                                                        <button className="flex items-center gap-1.5 px-3 py-2 bg-[#C62222] text-white text-xs font-semibold rounded-lg hover:bg-[#A01B1B] transition-colors">
                                                                            <RotateCcw size={12} />
                                                                            Reorder
                                                                        </button>
                                                                        <button className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors border border-gray-100">
                                                                            <Eye size={12} />
                                                                            Receipt
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ================= ADDRESSES TAB ================= */}
                        {activeTab === 'addresses' && (
                            <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6 sm:p-8">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900">Delivery Addresses</h2>
                                            <p className="text-xs text-gray-400 mt-0.5">Manage your saved delivery locations</p>
                                        </div>
                                        <button onClick={openAddAddress} className="flex items-center gap-1.5 px-4 py-2 bg-[#C62222] text-white text-xs font-semibold rounded-lg hover:bg-[#A01B1B] transition-colors shadow-sm">
                                            <Plus size={14} />
                                            Add New
                                        </button>
                                    </div>

                                    {user.addresses.length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                                <MapPin className="text-gray-300" size={24} />
                                            </div>
                                            <p className="text-gray-500 text-sm font-medium mb-1">No addresses saved</p>
                                            <p className="text-gray-400 text-xs mb-4">Add a delivery address to make ordering faster</p>
                                            <button onClick={openAddAddress} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#C62222] text-white text-xs font-semibold rounded-lg hover:bg-[#A01B1B] transition-colors">
                                                <Plus size={14} />
                                                Add Address
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {user.addresses.map(addr => (
                                                <div
                                                    key={addr.id}
                                                    className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-sm ${addr.isDefault
                                                        ? 'border-[#C62222]/30 bg-gradient-to-r from-[#FFFAFA] to-[#FFF5F5]'
                                                        : 'border-gray-100 bg-white hover:border-gray-200'
                                                        }`}
                                                >
                                                    <div className={`p-2.5 rounded-xl flex-shrink-0 ${addr.isDefault ? 'bg-[#C62222]/10 text-[#C62222]' : 'bg-gray-50 text-gray-400'
                                                        }`}>
                                                        <MapPin size={18} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className="text-sm font-bold text-gray-900">{addr.label}</p>
                                                            {addr.isDefault && (
                                                                <span className="text-[10px] font-bold text-[#C62222] bg-[#FEE4E2] px-2 py-0.5 rounded-full">
                                                                    Default
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-600">{addr.address}</p>
                                                        <p className="text-xs text-gray-400 mt-1">{addr.city}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {!addr.isDefault && (
                                                            <button
                                                                onClick={() => handleSetDefault(addr.id)}
                                                                title="Set as default"
                                                                className="p-2 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
                                                            >
                                                                <Check size={14} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => openEditAddress(addr)}
                                                            className="p-2 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteAddress(addr.id)}
                                                            className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ================= SETTINGS TAB ================= */}
                        {activeTab === 'settings' && (
                            <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
                                {/* Notifications */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6 sm:p-8">
                                    <h2 className="text-lg font-bold text-gray-900 mb-1">Notification Preferences</h2>
                                    <p className="text-xs text-gray-400 mb-6">Choose how you'd like to be notified</p>

                                    <div className="space-y-4">
                                        {[
                                            { key: 'orderUpdates', label: 'Order Updates', desc: 'Get notified about your order status changes', icon: <Truck size={18} /> },
                                            { key: 'promotions', label: 'Promotions', desc: 'Receive special offers and discounts', icon: <Star size={18} /> },
                                            { key: 'newsletter', label: 'Newsletter', desc: 'Weekly food recommendations and tips', icon: <Mail size={18} /> },
                                        ].map(item => (
                                            <div
                                                key={item.key}
                                                className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100/80 hover:border-gray-200 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-500">
                                                        {item.icon}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                                                        <p className="text-xs text-gray-400">{item.desc}</p>
                                                    </div>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={user.notifications[item.key as keyof typeof user.notifications]}
                                                        onChange={() => {
                                                            updateProfile({
                                                                notifications: {
                                                                    ...user.notifications,
                                                                    [item.key]: !user.notifications[item.key as keyof typeof user.notifications],
                                                                },
                                                            });
                                                        }}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-10 h-[22px] bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[18px] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-[#C62222] after:shadow-sm" />
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Security */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6 sm:p-8">
                                    <h2 className="text-lg font-bold text-gray-900 mb-1">Security</h2>
                                    <p className="text-xs text-gray-400 mb-6">Manage your account security</p>

                                    <div className="space-y-3">
                                        <button onClick={() => { setPasswordError(''); setPasswordForm({ current: '', newPass: '', confirm: '' }); setShowPasswordModal(true); }} className="w-full flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100/80 hover:border-gray-200 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-500">
                                                    <Shield size={18} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-sm font-semibold text-gray-900">Change Password</p>
                                                    <p className="text-xs text-gray-400">Update your account password</p>
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                                        </button>
                                    </div>
                                </div>

                                {/* Danger Zone */}
                                <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6 sm:p-8">
                                    <h2 className="text-lg font-bold text-red-600 mb-1">Danger Zone</h2>
                                    <p className="text-xs text-gray-400 mb-4">Irreversible actions</p>
                                    <button onClick={() => { setDeleteConfirmText(''); setShowDeleteAccountModal(true); }} className="flex items-center gap-2 px-4 py-2.5 border-2 border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors">
                                        Delete Account
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </main>

            <Footer />

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-[340px] w-full animate-[fadeIn_0.2s_ease-out]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-bold text-gray-900">Sign Out</h3>
                            <button onClick={() => setShowLogoutConfirm(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={18} />
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 mb-6">Are you sure you want to sign out of your account?</p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex-1 py-2.5 bg-[#C62222] text-white rounded-lg text-sm font-semibold hover:bg-[#A01B1B] transition-colors"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Address Add/Edit Modal */}
            {showAddressModal && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-[420px] w-full animate-[fadeIn_0.2s_ease-out]">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-base font-bold text-gray-900">
                                {editingAddress ? 'Edit Address' : 'Add New Address'}
                            </h3>
                            <button onClick={() => setShowAddressModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Label</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Home, Office, Gym"
                                    value={addressForm.label}
                                    onChange={e => setAddressForm(p => ({ ...p, label: e.target.value }))}
                                    className="w-full p-3 bg-white border-2 border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-[#C62222] transition-colors"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAddressMap(true)}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-colors ${addressForm.latitude != null
                                    ? 'border-green-200 bg-green-50/60 hover:border-green-300'
                                    : 'border-dashed border-[#C62222]/40 bg-[#FFF5F5] hover:border-[#C62222]'}`}
                            >
                                <MapPin size={18} className={addressForm.latitude != null ? 'text-green-600' : 'text-[#C62222]'} />
                                <span className="flex-1 min-w-0">
                                    <span className="block text-sm font-semibold text-gray-900">
                                        {addressForm.latitude != null ? 'Pinned on the map' : 'Pick location on the map'}
                                    </span>
                                    <span className="block text-xs text-gray-500">
                                        {addressForm.latitude != null ? 'Tap to move the pin' : 'So riders find the exact spot'}
                                    </span>
                                </span>
                                <ChevronRight size={16} className="text-gray-400" />
                            </button>
                            <div>
                                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Street Address</label>
                                <input
                                    type="text"
                                    placeholder="House number, street, estate"
                                    value={addressForm.address}
                                    onChange={e => setAddressForm(p => ({ ...p, address: e.target.value }))}
                                    className="w-full p-3 bg-white border-2 border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-[#C62222] transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">City</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Lagos, Nigeria"
                                    value={addressForm.city}
                                    onChange={e => setAddressForm(p => ({ ...p, city: e.target.value }))}
                                    className="w-full p-3 bg-white border-2 border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-[#C62222] transition-colors"
                                />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={addressForm.isDefault}
                                    onChange={e => setAddressForm(p => ({ ...p, isDefault: e.target.checked }))}
                                    className="w-4 h-4 rounded border-gray-300 text-[#C62222] focus:ring-[#C62222]"
                                />
                                <span className="text-sm text-gray-700">Set as default address</span>
                            </label>
                        </div>
                        <div className="flex items-center gap-3 mt-6">
                            <button
                                onClick={() => setShowAddressModal(false)}
                                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveAddress}
                                disabled={savingAddress}
                                className="flex-1 py-2.5 bg-[#C62222] text-white rounded-lg text-sm font-semibold hover:bg-[#A01B1B] transition-colors disabled:opacity-60"
                            >
                                {savingAddress ? 'Saving…' : editingAddress ? 'Save Changes' : 'Add Address'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <MapPicker
                open={showAddressMap}
                onClose={() => setShowAddressMap(false)}
                onConfirm={handleAddressPicked}
                title={editingAddress ? 'Move the pin' : 'Where should we deliver?'}
                confirmText="Use this location"
                initialCoords={addressForm.latitude != null && addressForm.longitude != null
                    ? { latitude: addressForm.latitude, longitude: addressForm.longitude }
                    : null}
                initialQuery={addressForm.latitude == null ? addressForm.address : undefined}
                autoLocate={addressForm.latitude == null && !addressForm.address}
            />

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-[400px] w-full animate-[fadeIn_0.2s_ease-out]">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-base font-bold text-gray-900">Change Password</h3>
                            <button onClick={() => setShowPasswordModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={18} />
                            </button>
                        </div>
                        {passwordError && (
                            <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
                                {passwordError}
                            </div>
                        )}
                        <div className="space-y-4">
                            <div>
                                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Current Password</label>
                                <input
                                    type="password"
                                    value={passwordForm.current}
                                    onChange={e => setPasswordForm(p => ({ ...p, current: e.target.value }))}
                                    className="w-full p-3 bg-white border-2 border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-[#C62222] transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">New Password</label>
                                <input
                                    type="password"
                                    value={passwordForm.newPass}
                                    onChange={e => setPasswordForm(p => ({ ...p, newPass: e.target.value }))}
                                    className="w-full p-3 bg-white border-2 border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-[#C62222] transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={passwordForm.confirm}
                                    onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))}
                                    className="w-full p-3 bg-white border-2 border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-[#C62222] transition-colors"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-3 mt-6">
                            <button
                                onClick={() => setShowPasswordModal(false)}
                                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleChangePassword}
                                className="flex-1 py-2.5 bg-[#C62222] text-white rounded-lg text-sm font-semibold hover:bg-[#A01B1B] transition-colors"
                            >
                                Update Password
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Account Confirmation Modal */}
            {showDeleteAccountModal && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-[400px] w-full animate-[fadeIn_0.2s_ease-out]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-bold text-red-600">Delete Account</h3>
                            <button onClick={() => setShowDeleteAccountModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={18} />
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">This action is <strong>permanent</strong> and cannot be undone. All your data including orders, addresses, and preferences will be deleted.</p>
                        <p className="text-sm text-gray-500 mb-4">Type <strong className="text-red-600">DELETE</strong> to confirm.</p>
                        <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={e => setDeleteConfirmText(e.target.value)}
                            placeholder="Type DELETE"
                            className="w-full p-3 bg-white border-2 border-red-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-red-500 transition-colors mb-4"
                        />
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowDeleteAccountModal(false)}
                                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleteConfirmText !== 'DELETE'}
                                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Delete Forever
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-[200] px-5 py-3 rounded-xl shadow-lg border text-sm font-medium animate-[fadeIn_0.2s_ease-out] flex items-center gap-2 ${toast.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    {toast.message}
                    <button onClick={() => setToast(null)} className="ml-2 opacity-50 hover:opacity-100">
                        <X size={14} />
                    </button>
                </div>
            )}

                {showPhoneModal && (
                    <PhoneVerificationModal
                        onClose={() => setShowPhoneModal(false)}
                        onVerified={() => {
                            setShowPhoneModal(false);
                            setToast({ message: 'Phone number verified!', type: 'success' });
                    }}
                />
            )}
        </div>
    );
};

export default UserProfile;
