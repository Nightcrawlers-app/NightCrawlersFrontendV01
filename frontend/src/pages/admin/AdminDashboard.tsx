import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Store, Package, TrendingUp, ShieldAlert, Activity, Bike, LogOut, Search, CheckCircle, X, Check, XCircle, Truck, Clock, Phone, MapPin, DollarSign, Calendar, BarChart3, ChevronRight } from 'lucide-react';
import { getCurrentAdmin, AdminAccount, getPlatformStats, PlatformStats, getSystemActivity, getPendingActions, ActivityItem, PendingItem, verifyUser, getOrderStats, OrderStats, getOnlineRiders, RiderAccount, getAllRiders, getAllEarningsForAdmin, EntityEarnings, getAllStoreEarningsForAdmin, StoreEarnings, logoutAdmin, toErrorMessage } from '../../services/api';
import Footer from '../../components/layout/Footer';

import Loader from '../../components/ui/Loader';
import PromotionsManager from '../../components/admin/PromotionsManager';

const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
        return `₦${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
        return `₦${(amount / 1000).toFixed(1)}K`;
    }
    return `₦${amount.toLocaleString()}`;
};

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [admin, setAdmin] = useState<AdminAccount | null>(null);
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [pending, setPending] = useState<PendingItem[]>([]);
    const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
    const [onlineRiders, setOnlineRiders] = useState<RiderAccount[]>([]);

    // Modal State
    const [selectedAction, setSelectedAction] = useState<PendingItem | null>(null);
    const [showRidersModal, setShowRidersModal] = useState(false);
    const [allRiders, setAllRiders] = useState<RiderAccount[]>([]);

    // Earnings State
    const [showEarningsModal, setShowEarningsModal] = useState(false);
    const [showPromotions, setShowPromotions] = useState(false);
    const [allEarnings, setAllEarnings] = useState<EntityEarnings[]>([]);
    const [allStoreEarnings, setAllStoreEarnings] = useState<StoreEarnings[]>([]);
    const [earningsTab, setEarningsTab] = useState<'vendors' | 'stores' | 'riders'>('vendors');
    const [earningsPeriod, setEarningsPeriod] = useState<'today' | 'month' | 'year'>('today');

    const [loadError, setLoadError] = useState('');
    // Sections that failed while the rest of the dashboard loaded fine.
    const [partialErrors, setPartialErrors] = useState<string[]>([]);
    const [isProcessingAction, setIsProcessingAction] = useState(false);
    const [actionError, setActionError] = useState('');
    const [confirmReject, setConfirmReject] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    // Guards against setting state after unmount — polling keeps requests in flight.
    const cancelledRef = useRef(false);

    const fetchData = useCallback(async () => {
        // All independent, so fetch them concurrently. allSettled (not all):
        // one broken panel used to blank the whole dashboard with a
        // misleading "backend not running" screen.
        const sections = [
            ['Platform stats', getPlatformStats(), setStats],
            ['Activity', getSystemActivity(), setActivity],
            ['Pending approvals', getPendingActions(), setPending],
            ['Order stats', getOrderStats(), setOrderStats],
            ['Online riders', getOnlineRiders(), setOnlineRiders],
            ['Riders', getAllRiders(), setAllRiders],
            ['Earnings', getAllEarningsForAdmin(), setAllEarnings],
            ['Store earnings', getAllStoreEarningsForAdmin(), setAllStoreEarnings],
        ] as const;

        const results = await Promise.allSettled(sections.map(([, p]) => p));
        if (cancelledRef.current) return;

        const failed: string[] = [];
        results.forEach((r, i) => {
            const [name, , setter] = sections[i];
            if (r.status === 'fulfilled') (setter as (v: unknown) => void)(r.value);
            else failed.push(`${name}: ${toErrorMessage(r.reason, 'failed')}`);
        });

        if (results[0].status === 'rejected') {
            // The page is built around the platform stats, so it can't render without them.
            setLoadError(toErrorMessage(results[0].reason, 'Could not load dashboard data.'));
        } else {
            setLoadError('');
            setPartialErrors(failed);
        }
    }, []);

    useEffect(() => {
        cancelledRef.current = false;
        let interval: ReturnType<typeof setInterval> | undefined;

        const init = async () => {
            try {
                const currentAdmin = await getCurrentAdmin();
                if (cancelledRef.current) return;

                if (!currentAdmin) {
                    navigate('/admin-login');
                    return;
                }
                setAdmin(currentAdmin);
                await fetchData();

                // Refresh every 5 seconds for a "real-time" feel. Only starts
                // once we know the admin is signed in.
                interval = setInterval(fetchData, 5000);
            } catch (error) {
                if (cancelledRef.current) return;
                setLoadError(toErrorMessage(error, 'Could not load your account.'));
            }
        };

        init();

        return () => {
            cancelledRef.current = true;
            if (interval) clearInterval(interval);
        };
    }, [navigate, fetchData, reloadKey]);

    const handleLogout = async () => {
        try {
            await logoutAdmin();
        } finally {
            navigate('/admin-login');
        }
    };

    const handleProcessAction = async (action: 'approve' | 'reject') => {
        if (!selectedAction || isProcessingAction) return;

        // Rejecting DELETES the account on the backend — ask twice.
        if (action === 'reject' && !confirmReject) {
            setConfirmReject(true);
            setActionError('');
            return;
        }

        const target = selectedAction;
        setIsProcessingAction(true);
        setActionError('');
        try {
            await verifyUser(target.id, target.type, action);
            // Drop it locally straight away, then refetch to stay in sync.
            setPending(prev => prev.filter(p => p.id !== target.id));
            setSelectedAction(null);
            await fetchData();
        } catch (error) {
            // Shown inside the popup. It used to go to the page-level error,
            // which isn't visible once the dashboard has loaded — so clicking
            // Approve on an applicant with an unverified phone did nothing
            // visible at all.
            setActionError(toErrorMessage(error, `Could not ${action} this ${target.type}.`));
        } finally {
            setIsProcessingAction(false);
            setConfirmReject(false);
        }
    };

    const openAction = (item: PendingItem | null) => {
        setSelectedAction(item);
        setActionError('');
        setConfirmReject(false);
    };

    if (!admin || !stats) {
        if (loadError) {
            return (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center font-poppins p-6">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
                        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                            <ShieldAlert className="w-7 h-7 text-[#C62222]" />
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 mb-2">Couldn't load the dashboard</h1>
                        <p className="text-sm text-gray-500 mb-6">{loadError}</p>
                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    // Re-runs the whole init effect, so the admin
                                    // session is re-checked too, not just the data.
                                    setLoadError('');
                                    setReloadKey((k) => k + 1);
                                }}
                                className="w-full py-2.5 bg-[#C62222] text-white text-sm font-semibold rounded-lg hover:bg-[#A01B1B] transition-colors"
                            >
                                Try again
                            </button>
                            <button
                                onClick={() => navigate('/admin-login')}
                                className="w-full py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Back to login
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        return <Loader fullScreen />;
    }

    return (
        <div className="min-h-screen bg-white flex flex-col font-poppins relative">

            {/* Admin Header */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
                <div className="max-w-[1400px] mx-auto px-3 md:px-6 h-16 md:h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="h-7 w-7 md:h-10 md:w-10 bg-[#C62222] text-white rounded-xl flex items-center justify-center shadow-lg shadow-gray-200">
                            <ShieldAlert size={14} className="md:hidden" />
                            <ShieldAlert size={20} className="hidden md:block" />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900 leading-none text-xs md:text-base">Admin Console</h1>
                            <span className="text-[7px] md:text-[10px] font-semibold text-[#C62222] uppercase tracking-widest">Night Crawlers</span>
                        </div>
                    </div>

                    {/* Mobile Controls */}
                    <div className="flex items-center gap-1.5 md:hidden">
                        <div className="text-right mr-1">
                            <p className="text-[10px] font-bold text-gray-900">{admin.username}</p>
                            <p className="text-[8px] text-[#C62222] font-medium">Online</p>
                        </div>
                        <div className="h-7 w-7 bg-[#C62222] rounded-full flex items-center justify-center text-white text-[10px] font-bold border border-gray-200">
                            {admin.username.substring(0, 2).toUpperCase()}
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-1.5 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>

                    {/* Desktop Controls */}
                    <div className="items-center gap-6 hidden md:flex">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search system..."
                                className="w-64 h-10 pl-9 pr-4 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C62222]/20 transition-all font-medium"
                            />
                        </div>

                        <div className="h-6 w-[1px] bg-gray-100"></div>

                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-sm font-bold text-gray-900">{admin.username}</p>
                                <p className="text-[10px] text-[#C62222] font-medium bg-red-50 px-2 rounded-full inline-block">Online</p>
                            </div>
                            <div className="h-10 w-10 bg-[#C62222] rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-md">
                                {admin.username.substring(0, 2).toUpperCase()}
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-[#C62222] transition-colors"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-grow w-full max-w-[1400px] mx-auto px-4 md:px-6 py-6 md:py-10">

                <div className="mb-6 md:mb-10 flex items-end justify-between">
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900">Platform Overview</h2>
                        <p className="text-gray-500 mt-1 text-xs md:text-sm">Real-time metrics & ongoing activity</p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wide">Live</span>
                    </div>
                </div>

                {partialErrors.length > 0 && (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        <p className="font-semibold mb-1">Some sections couldn't load:</p>
                        <ul className="list-disc pl-5 space-y-0.5">
                            {partialErrors.map((e) => <li key={e}>{e}</li>)}
                        </ul>
                    </div>
                )}

                {/* Promotions entry point */}
                <div className="flex justify-end mb-4">
                    <button
                        onClick={() => setShowPromotions(true)}
                        className="inline-flex items-center gap-2 bg-[#C62222] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#A01B1B] shadow-sm"
                    >
                        <BarChart3 size={16} /> Manage promotions
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-10">

                    {/* Revenue Card - CLICKABLE for Earnings */}
                    <div
                        onClick={() => setShowEarningsModal(true)}
                        className="group bg-white p-4 md:p-6 rounded-xl md:rounded-2xl border border-gray-100 hover:border-[#C62222]/20 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 cursor-pointer"
                    >
                        <div className="flex justify-between items-start mb-2 md:mb-4">
                            <div className="p-2 md:p-3 bg-red-50 text-[#C62222] rounded-lg md:rounded-xl group-hover:scale-110 transition-transform">
                                <TrendingUp size={18} className="md:hidden" />
                                <TrendingUp size={24} className="hidden md:block" />
                            </div>
                            <span className="text-[10px] md:text-xs font-semibold text-gray-600 bg-gray-100 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md">+12.5%</span>
                        </div>
                        <h3 className="text-xl md:text-3xl font-bold text-gray-900 tracking-tight mb-0.5 md:mb-1">{formatCurrency(stats.totalRevenue)}</h3>
                        <p className="text-[10px] md:text-xs font-medium text-gray-400 uppercase tracking-wider">Total Revenue</p>
                        <p className="text-[10px] md:text-xs text-[#C62222] mt-1 md:mt-2 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">Click to view earnings breakdown →</p>
                    </div>

                    {/* Vendors Card */}
                    <div className="group bg-white p-4 md:p-6 rounded-xl md:rounded-2xl border border-gray-100 hover:border-[#C62222]/20 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300">
                        <div className="flex justify-between items-start mb-2 md:mb-4">
                            <div className="p-2 md:p-3 bg-red-50 text-[#C62222] rounded-lg md:rounded-xl group-hover:scale-110 transition-transform">
                                <Store size={18} className="md:hidden" />
                                <Store size={24} className="hidden md:block" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-1 md:gap-2 mb-0.5 md:mb-1">
                            <h3 className="text-xl md:text-3xl font-bold text-gray-900 tracking-tight">{stats.totalVendors}</h3>
                            <span className="text-xs md:text-sm font-medium text-gray-400">/ {stats.totalStores}</span>
                        </div>
                        <p className="text-[10px] md:text-xs font-medium text-gray-400 uppercase tracking-wider">Vendors / Stores</p>
                    </div>

                    {/* Riders Card - With Online Status - CLICKABLE */}
                    <div
                        onClick={() => setShowRidersModal(true)}
                        className="group bg-white p-4 md:p-6 rounded-xl md:rounded-2xl border border-gray-100 hover:border-[#C62222]/20 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 cursor-pointer"
                    >
                        <div className="flex justify-between items-start mb-2 md:mb-4">
                            <div className="p-2 md:p-3 bg-red-50 text-[#C62222] rounded-lg md:rounded-xl group-hover:scale-110 transition-transform">
                                <Bike size={18} className="md:hidden" />
                                <Bike size={24} className="hidden md:block" />
                            </div>
                            {orderStats && (
                                <span className={`text-[10px] md:text-xs font-semibold px-1.5 md:px-2 py-0.5 md:py-1 rounded-md flex items-center gap-1 ${orderStats.onlineRiders > 0 ? 'text-[#C62222] bg-red-50' : 'text-gray-500 bg-gray-100'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${orderStats.onlineRiders > 0 ? 'bg-[#C62222] animate-pulse' : 'bg-gray-400'}`}></span>
                                    <span className="hidden sm:inline">{orderStats.onlineRiders} Online</span>
                                    <span className="sm:hidden">{orderStats.onlineRiders}</span>
                                </span>
                            )}
                        </div>
                        <div className="flex items-baseline gap-1 md:gap-2 mb-0.5 md:mb-1">
                            <h3 className="text-xl md:text-3xl font-bold text-gray-900 tracking-tight">{stats.totalRiders}</h3>
                            <span className="text-xs md:text-sm font-medium text-gray-400">riders</span>
                        </div>
                        <p className="text-[10px] md:text-xs font-medium text-gray-400 uppercase tracking-wider">Delivery Fleet</p>
                        <p className="text-[10px] md:text-xs text-[#C62222] mt-1 md:mt-2 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">Click to view all riders →</p>
                    </div>

                    {/* Orders Card - With Active Orders */}
                    <div className="group bg-white p-4 md:p-6 rounded-xl md:rounded-2xl border border-gray-100 hover:border-[#C62222]/20 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300">
                        <div className="flex justify-between items-start mb-2 md:mb-4">
                            <div className="p-2 md:p-3 bg-red-50 text-[#C62222] rounded-lg md:rounded-xl group-hover:scale-110 transition-transform">
                                <Package size={18} className="md:hidden" />
                                <Package size={24} className="hidden md:block" />
                            </div>
                            {orderStats && orderStats.activeOrders > 0 && (
                                <span className="text-[10px] md:text-xs font-semibold text-white bg-[#C62222] px-1.5 md:px-2 py-0.5 md:py-1 rounded-md flex items-center gap-1">
                                    <Truck size={10} className="md:hidden" />
                                    <Truck size={12} className="hidden md:block" />
                                    <span className="hidden sm:inline">{orderStats.activeOrders} Active</span>
                                    <span className="sm:hidden">{orderStats.activeOrders}</span>
                                </span>
                            )}
                        </div>
                        <div className="flex items-baseline gap-1 md:gap-2 mb-0.5 md:mb-1">
                            <h3 className="text-xl md:text-3xl font-bold text-gray-900 tracking-tight">{orderStats?.totalOrders || stats.totalOrders}</h3>
                            {orderStats && orderStats.pendingOrders > 0 && (
                                <span className="text-[10px] md:text-sm font-medium text-gray-500">({orderStats.pendingOrders})</span>
                            )}
                        </div>
                        <p className="text-[10px] md:text-xs font-medium text-gray-400 uppercase tracking-wider">Total Orders</p>
                    </div>
                </div>

                {/* Order Stats Row */}
                {orderStats && (orderStats.todayOrders > 0 || orderStats.activeOrders > 0) && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-6 md:mb-10">
                        <div className="bg-[#C62222] p-3 md:p-4 rounded-lg md:rounded-xl text-white">
                            <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
                                <Clock size={14} className="md:hidden" />
                                <Clock size={16} className="hidden md:block" />
                                <span className="text-[10px] md:text-xs font-medium text-white/70">Today</span>
                            </div>
                            <p className="text-lg md:text-2xl font-bold">{orderStats.todayOrders}</p>
                            <p className="text-[10px] md:text-xs text-white/70">Orders</p>
                        </div>
                        <div className="bg-[#C62222] p-3 md:p-4 rounded-lg md:rounded-xl text-white border border-red-700">
                            <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
                                <Package size={14} className="md:hidden" />
                                <Package size={16} className="hidden md:block" />
                                <span className="text-[10px] md:text-xs font-medium text-white/90">Pending</span>
                            </div>
                            <p className="text-lg md:text-2xl font-bold">{orderStats.pendingOrders}</p>
                            <p className="text-[10px] md:text-xs text-white/90">Awaiting</p>
                        </div>
                        <div className="bg-gray-900 p-3 md:p-4 rounded-lg md:rounded-xl text-white">
                            <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
                                <Truck size={14} className="md:hidden" />
                                <Truck size={16} className="hidden md:block" />
                                <span className="text-[10px] md:text-xs font-medium text-white/70">Transit</span>
                            </div>
                            <p className="text-lg md:text-2xl font-bold">{orderStats.activeOrders}</p>
                            <p className="text-[10px] md:text-xs text-white/70">Delivering</p>
                        </div>
                        <div className="bg-white border border-gray-200 p-3 md:p-4 rounded-lg md:rounded-xl text-gray-600">
                            <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2 text-[#C62222]">
                                <CheckCircle size={14} className="md:hidden" />
                                <CheckCircle size={16} className="hidden md:block" />
                                <span className="text-[10px] md:text-xs font-medium text-gray-500">Done</span>
                            </div>
                            <p className="text-lg md:text-2xl font-bold text-gray-900">{orderStats.completedOrders}</p>
                            <p className="text-[10px] md:text-xs text-gray-500">Delivered</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
                    {/* System Activity Feed */}
                    <div className="lg:col-span-2 bg-white rounded-xl md:rounded-2xl border border-gray-100 p-4 md:p-6 overflow-hidden relative">
                        <div className="flex justify-between items-center mb-4 md:mb-6">
                            <h3 className="font-bold text-gray-900 text-base md:text-lg">System Activity</h3>
                            <button className="text-xs md:text-sm font-medium text-[#C62222] hover:text-[#a01b1b] transition-colors">View Logs</button>
                        </div>

                        {/* Real Activity List */}
                        <div className="space-y-4 md:space-y-6 relative before:absolute before:left-[15px] md:before:left-[19px] before:top-2 before:bottom-0 before:w-[2px] before:bg-gray-100">
                            {activity.length > 0 ? (
                                activity.map((item, i) => (
                                    <div key={i} className="flex gap-3 md:gap-4 relative">
                                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full ${item.type === 'vendor' ? 'bg-[#C62222]' : item.type === 'rider' ? 'bg-black' : 'bg-gray-600'} flex items-center justify-center text-white shadow-sm flex-shrink-0 z-10 border-2 md:border-4 border-white`}>
                                            {item.type === 'vendor' && <Store size={12} className="md:hidden" />}
                                            {item.type === 'vendor' && <Store size={14} className="hidden md:block" />}
                                            {item.type === 'rider' && <Bike size={12} className="md:hidden" />}
                                            {item.type === 'rider' && <Bike size={14} className="hidden md:block" />}
                                            {item.type === 'store' && <Activity size={12} className="md:hidden" />}
                                            {item.type === 'store' && <Activity size={14} className="hidden md:block" />}
                                        </div>
                                        <div className="pt-0.5 md:pt-1 flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900 text-sm md:text-base truncate">{item.message}</p>
                                            <p className="text-[10px] md:text-xs text-gray-400 mt-0.5">{item.timeAgo}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="pl-10 md:pl-12 text-gray-500 text-xs md:text-sm italic py-4">
                                    No recent activity recorded.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pending Actions - UPDATED STYLING */}
                    <div className="bg-gradient-to-br from-[#C62222] to-[#991b1b] rounded-xl md:rounded-2xl p-4 md:p-6 text-white relative overflow-hidden flex flex-col shadow-lg shadow-red-900/20">
                        {/* Decorative Background Elements */}
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-black opacity-10 rounded-full -ml-10 -mb-10 blur-2xl"></div>

                        <div className="flex items-center justify-between mb-4 md:mb-6 relative z-10">
                            <div>
                                <h3 className="font-bold text-base md:text-lg leading-tight">Pending Actions</h3>
                                <p className="text-xs md:text-sm text-red-100">Requires attention</p>
                            </div>
                            <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
                                <ShieldAlert size={18} className="text-white" />
                            </div>
                        </div>

                        <div className="space-y-2 md:space-y-3 relative z-10 flex-grow">
                            {pending.length > 0 ? (
                                pending.map((item, i) => (
                                    <div
                                        key={i}
                                        onClick={() => openAction(item)}
                                        className="bg-white border border-gray-100 flex items-center p-3 md:p-4 rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer group"
                                    >
                                        <div className={`w-10 h-10 rounded-full ${item.type === 'vendor' ? 'bg-red-50 text-[#C62222]' : 'bg-orange-50 text-orange-600'} flex items-center justify-center flex-shrink-0 mr-3`}>
                                            {item.type === 'vendor' ? <Store size={18} /> : <Bike size={18} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-900 text-xs md:text-sm truncate">{item.title}</p>
                                            <p className="text-[10px] text-gray-500 truncate font-medium">Tap to review application</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#C62222] group-hover:text-white transition-colors">
                                            <div className="md:hidden"><Check size={14} /></div>
                                            <div className="hidden md:block"><Check size={16} /></div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20 text-center h-full flex flex-col items-center justify-center min-h-[150px]">
                                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3">
                                        <CheckCircle size={24} className="text-white" />
                                    </div>
                                    <span className="text-sm font-bold text-white">All Caught Up!</span>
                                    <span className="text-xs text-red-100 mt-1 opacity-80">No pending approvals found.</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </main>

            {/* Action Popup Modal */}
            {selectedAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => openAction(null)} />
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 relative z-50 animate-in fade-in zoom-in-95 duration-200">
                        <button
                            onClick={() => openAction(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
                        >
                            <X size={20} />
                        </button>

                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-1">Process Application</h3>
                            <p className="text-sm text-gray-500">{selectedAction.title}</p>
                        </div>

                        {actionError && (
                            <div className="mb-4 rounded-xl bg-[#FEECEC] border border-[#F5C2C2] px-3 py-2.5 text-sm text-[#991B1B]">
                                {actionError}
                                {/phone/i.test(actionError) && (
                                    <p className="text-xs mt-1 text-[#991B1B]/80">
                                        They can verify it from their dashboard's pending screen.
                                    </p>
                                )}
                            </div>
                        )}
                        {confirmReject && (
                            <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-800">
                                Rejecting <strong>permanently deletes</strong> this account and emails them. Tap Reject again to confirm.
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => handleProcessAction('reject')}
                                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-red-50 hover:text-[#C62222] transition-colors flex items-center justify-center gap-2"
                            >
                                <XCircle size={18} /> {confirmReject ? 'Yes, delete' : 'Reject'}
                            </button>
                            <button
                                onClick={() => handleProcessAction('approve')}
                                className="flex-1 py-3 px-4 bg-[#C62222] text-white font-bold rounded-xl hover:bg-[#a01b1b] transition-colors shadow-lg shadow-red-200 flex items-center justify-center gap-2"
                            >
                                <Check size={18} /> Approve
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Riders Modal */}
            {showRidersModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRidersModal(false)} />
                    <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl relative z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Delivery Fleet</h3>
                                <p className="text-sm text-gray-500 mt-1">{allRiders.length} riders registered • <span className="text-[#C62222] font-medium">{onlineRiders.length} online</span></p>
                            </div>
                            <button
                                onClick={() => setShowRidersModal(false)}
                                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-4">
                            {allRiders.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <Bike size={48} className="mx-auto mb-4 opacity-30" />
                                    <p>No riders registered yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {allRiders.map((rider) => (
                                        <div
                                            key={rider.id}
                                            className={`p-3 sm:p-4 rounded-xl border ${rider.isOnline ? 'border-red-200 bg-red-50/30' : 'border-gray-100 bg-white'} transition-all overflow-hidden`}
                                        >
                                            <div className="flex items-start gap-3 sm:gap-4">
                                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base flex-shrink-0 ${rider.isOnline ? 'bg-[#C62222]' : 'bg-gray-800'}`}>
                                                    {rider.firstName.charAt(0)}{rider.lastName.charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="font-bold text-gray-900 text-sm sm:text-base truncate max-w-[140px] sm:max-w-none">{rider.firstName} {rider.lastName}</h4>
                                                        {rider.isOnline && (
                                                            <span className="text-[10px] font-bold text-[#C62222] bg-red-100 px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                                                                <span className="w-1.5 h-1.5 bg-[#C62222] rounded-full animate-pulse"></span>
                                                                ONLINE
                                                            </span>
                                                        )}
                                                        {!rider.verified && (
                                                            <span className="text-[10px] font-bold text-gray-600 bg-gray-200 px-2 py-0.5 rounded-full flex-shrink-0">
                                                                PENDING
                                                            </span>
                                                        )}
                                                        {rider.verified && (
                                                            <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                                                                <CheckCircle size={10} />
                                                                VERIFIED
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 sm:gap-4 mt-1 text-xs sm:text-sm text-gray-500 flex-wrap">
                                                        <span className="flex items-center gap-1 flex-shrink-0">
                                                            <Bike size={14} />
                                                            {rider.vehicleType}
                                                        </span>
                                                        <span className="flex items-center gap-1 truncate">
                                                            <MapPin size={14} className="flex-shrink-0" />
                                                            <span className="truncate">{rider.location}</span>
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3 sm:gap-4 mt-1 text-[11px] sm:text-xs text-gray-400 flex-wrap">
                                                        <span className="flex items-center gap-1 flex-shrink-0">
                                                            <Phone size={12} />
                                                            {rider.phoneNumber}
                                                        </span>
                                                        <span className="truncate">{rider.email}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Earnings Modal */}
            {showEarningsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEarningsModal(false)} />
                    <div className="bg-white w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl relative z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <BarChart3 size={20} className="text-[#C62222]" />
                                        <h3 className="text-xl font-bold text-gray-900">Earnings Overview</h3>
                                    </div>
                                    <p className="text-sm text-gray-500">Detailed breakdown by day, month &amp; year</p>
                                </div>
                                <button
                                    onClick={() => setShowEarningsModal(false)}
                                    className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Tabs: Vendors / Stores / Riders */}
                            <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                <button
                                    onClick={() => setEarningsTab('vendors')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 flex-shrink-0 ${earningsTab === 'vendors' ? 'bg-[#C62222] text-white shadow-lg shadow-red-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    <Users size={16} />
                                    Vendors
                                </button>
                                <button
                                    onClick={() => setEarningsTab('stores')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 flex-shrink-0 ${earningsTab === 'stores' ? 'bg-[#C62222] text-white shadow-lg shadow-red-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    <Store size={16} />
                                    Stores
                                </button>
                                <button
                                    onClick={() => setEarningsTab('riders')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 flex-shrink-0 ${earningsTab === 'riders' ? 'bg-[#C62222] text-white shadow-lg shadow-red-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    <Bike size={16} />
                                    Riders
                                </button>
                            </div>

                            {/* Period Selector */}
                            <div className="flex gap-1 mt-3 bg-gray-100 rounded-lg p-1 w-fit">
                                {(['today', 'month', 'year'] as const).map(period => (
                                    <button
                                        key={period}
                                        onClick={() => setEarningsPeriod(period)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${earningsPeriod === period ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        {period === 'today' ? 'Today' : period === 'month' ? 'This Month' : 'This Year'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Earnings List */}
                        <div className="overflow-y-auto flex-1 p-4">
                            {earningsTab === 'stores' ? (
                                /* ---------- STORES TAB ---------- */
                                (() => {
                                    if (allStoreEarnings.length === 0) {
                                        return (
                                            <div className="text-center py-12 text-gray-500">
                                                <Store size={48} className="mx-auto mb-4 opacity-30" />
                                                <p className="font-medium">No stores created yet</p>
                                                <p className="text-xs text-gray-400 mt-1">Store earnings will appear once vendors create stores</p>
                                            </div>
                                        );
                                    }

                                    const getStoreAmount = (se: StoreEarnings) => {
                                        if (earningsPeriod === 'today') return se.todayEarnings;
                                        if (earningsPeriod === 'month') return se.monthEarnings;
                                        return se.yearEarnings;
                                    };
                                    const getStoreOrders = (se: StoreEarnings) => {
                                        if (earningsPeriod === 'today') return se.todayOrders;
                                        if (earningsPeriod === 'month') return se.monthOrders;
                                        return se.yearOrders;
                                    };

                                    const totalStoreEarnings = allStoreEarnings.reduce((sum, se) => sum + getStoreAmount(se), 0);
                                    const totalStoreOrders = allStoreEarnings.reduce((sum, se) => sum + getStoreOrders(se), 0);

                                    // Group by vendor
                                    const byVendor: Record<string, StoreEarnings[]> = {};
                                    allStoreEarnings.forEach(se => {
                                        if (!byVendor[se.vendorId]) byVendor[se.vendorId] = [];
                                        byVendor[se.vendorId].push(se);
                                    });

                                    return (
                                        <>
                                            {/* Summary Bar */}
                                            <div className="grid grid-cols-2 gap-3 mb-4">
                                                <div className="bg-gradient-to-br from-[#C62222] to-[#991b1b] text-white p-4 rounded-xl">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <DollarSign size={16} />
                                                        <span className="text-xs font-bold text-red-100 uppercase tracking-wider">Total Store Earnings</span>
                                                    </div>
                                                    <p className="text-2xl font-bold">₦{totalStoreEarnings.toLocaleString()}</p>
                                                </div>
                                                <div className="bg-gray-900 text-white p-4 rounded-xl">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Package size={16} />
                                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Orders</span>
                                                    </div>
                                                    <p className="text-2xl font-bold">{totalStoreOrders}</p>
                                                </div>
                                            </div>

                                            {/* Stores grouped by vendor */}
                                            <div className="space-y-4">
                                                {Object.entries(byVendor)
                                                    .sort(([, a], [, b]) => {
                                                        const sumA = a.reduce((s, se) => s + getStoreAmount(se), 0);
                                                        const sumB = b.reduce((s, se) => s + getStoreAmount(se), 0);
                                                        return sumB - sumA;
                                                    })
                                                    .map(([vendorId, vendorStores]) => {
                                                        const vendorTotal = vendorStores.reduce((s, se) => s + getStoreAmount(se), 0);
                                                        const vendorOrderTotal = vendorStores.reduce((s, se) => s + getStoreOrders(se), 0);
                                                        return (
                                                            <div key={vendorId} className="border border-gray-100 rounded-xl overflow-hidden">
                                                                {/* Vendor header */}
                                                                <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-full bg-[#C62222] flex items-center justify-center text-white text-xs font-bold">
                                                                            {vendorStores[0].vendorName.split(' ').map(n => n.charAt(0)).join('').substring(0, 2)}
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-bold text-gray-900">{vendorStores[0].vendorName}</p>
                                                                            <p className="text-[10px] text-gray-400">{vendorStores.length} store{vendorStores.length !== 1 ? 's' : ''} • {vendorOrderTotal} orders</p>
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-sm font-bold text-gray-900">₦{vendorTotal.toLocaleString()}</p>
                                                                </div>
                                                                {/* Individual stores */}
                                                                <div className="divide-y divide-gray-50">
                                                                    {vendorStores
                                                                        .sort((a, b) => getStoreAmount(b) - getStoreAmount(a))
                                                                        .map(se => {
                                                                            const amount = getStoreAmount(se);
                                                                            const count = getStoreOrders(se);
                                                                            return (
                                                                                <div key={se.storeId} className="flex items-center gap-3 p-3 px-4 hover:bg-gray-50/50 transition-colors">
                                                                                    <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center text-[#C62222] flex-shrink-0">
                                                                                        <Store size={14} />
                                                                                    </div>
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <p className="text-sm font-medium text-gray-800 truncate">{se.storeName}</p>
                                                                                        <p className="text-[10px] text-gray-400">{count} order{count !== 1 ? 's' : ''}</p>
                                                                                    </div>
                                                                                    <p className={`font-bold text-sm tabular-nums ${amount > 0 ? 'text-gray-900' : 'text-gray-300'}`}>₦{amount.toLocaleString()}</p>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                }
                                            </div>

                                            {/* All periods summary */}
                                            <div className="mt-6 bg-gray-50 rounded-xl p-4 border border-gray-100">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                    <Calendar size={14} />
                                                    All Periods Summary (Stores)
                                                </h4>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className={`p-3 rounded-lg border transition-colors ${earningsPeriod === 'today' ? 'border-[#C62222] bg-red-50' : 'border-gray-200 bg-white'}`}>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Today</p>
                                                        <p className="text-sm font-bold text-gray-900 mt-1">
                                                            ₦{allStoreEarnings.reduce((s, se) => s + se.todayEarnings, 0).toLocaleString()}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400">{allStoreEarnings.reduce((s, se) => s + se.todayOrders, 0)} orders</p>
                                                    </div>
                                                    <div className={`p-3 rounded-lg border transition-colors ${earningsPeriod === 'month' ? 'border-[#C62222] bg-red-50' : 'border-gray-200 bg-white'}`}>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">This Month</p>
                                                        <p className="text-sm font-bold text-gray-900 mt-1">
                                                            ₦{allStoreEarnings.reduce((s, se) => s + se.monthEarnings, 0).toLocaleString()}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400">{allStoreEarnings.reduce((s, se) => s + se.monthOrders, 0)} orders</p>
                                                    </div>
                                                    <div className={`p-3 rounded-lg border transition-colors ${earningsPeriod === 'year' ? 'border-[#C62222] bg-red-50' : 'border-gray-200 bg-white'}`}>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">This Year</p>
                                                        <p className="text-sm font-bold text-gray-900 mt-1">
                                                            ₦{allStoreEarnings.reduce((s, se) => s + se.yearEarnings, 0).toLocaleString()}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400">{allStoreEarnings.reduce((s, se) => s + se.yearOrders, 0)} orders</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()
                            ) : (
                                /* ---------- VENDORS / RIDERS TAB ---------- */
                                (() => {
                                    const filtered = allEarnings.filter(e => e.type === (earningsTab === 'vendors' ? 'vendor' : 'rider'));

                                    if (filtered.length === 0) {
                                        return (
                                            <div className="text-center py-12 text-gray-500">
                                                {earningsTab === 'vendors' ?
                                                    <Store size={48} className="mx-auto mb-4 opacity-30" /> :
                                                    <Bike size={48} className="mx-auto mb-4 opacity-30" />
                                                }
                                                <p className="font-medium">No {earningsTab} registered yet</p>
                                                <p className="text-xs text-gray-400 mt-1">Earnings will appear here once {earningsTab} start receiving orders</p>
                                            </div>
                                        );
                                    }

                                    // Summary totals
                                    const totalEarnings = filtered.reduce((sum, e) => {
                                        if (earningsPeriod === 'today') return sum + e.earnings.today;
                                        if (earningsPeriod === 'month') return sum + e.earnings.thisMonth;
                                        return sum + e.earnings.thisYear;
                                    }, 0);
                                    const totalOrders = filtered.reduce((sum, e) => {
                                        if (earningsPeriod === 'today') return sum + e.earnings.todayOrders;
                                        if (earningsPeriod === 'month') return sum + e.earnings.monthOrders;
                                        return sum + e.earnings.yearOrders;
                                    }, 0);

                                    return (
                                        <>
                                            {/* Summary Bar */}
                                            <div className="grid grid-cols-2 gap-3 mb-4">
                                                <div className="bg-gradient-to-br from-[#C62222] to-[#991b1b] text-white p-4 rounded-xl">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <DollarSign size={16} />
                                                        <span className="text-xs font-bold text-red-100 uppercase tracking-wider">Total Earnings</span>
                                                    </div>
                                                    <p className="text-2xl font-bold">₦{totalEarnings.toLocaleString()}</p>
                                                </div>
                                                <div className="bg-gray-900 text-white p-4 rounded-xl">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Package size={16} />
                                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Orders</span>
                                                    </div>
                                                    <p className="text-2xl font-bold">{totalOrders}</p>
                                                </div>
                                            </div>

                                            {/* Individual Earnings */}
                                            <div className="space-y-2">
                                                {filtered
                                                    .sort((a, b) => {
                                                        const getAmount = (e: EntityEarnings) => {
                                                            if (earningsPeriod === 'today') return e.earnings.today;
                                                            if (earningsPeriod === 'month') return e.earnings.thisMonth;
                                                            return e.earnings.thisYear;
                                                        };
                                                        return getAmount(b) - getAmount(a);
                                                    })
                                                    .map(entity => {
                                                        const amount = earningsPeriod === 'today' ? entity.earnings.today
                                                            : earningsPeriod === 'month' ? entity.earnings.thisMonth
                                                                : entity.earnings.thisYear;
                                                        const orderCount = earningsPeriod === 'today' ? entity.earnings.todayOrders
                                                            : earningsPeriod === 'month' ? entity.earnings.monthOrders
                                                                : entity.earnings.yearOrders;

                                                        return (
                                                            <div key={entity.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all">
                                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${entity.type === 'vendor' ? 'bg-[#C62222]' : 'bg-gray-800'}`}>
                                                                    {entity.name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2)}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="font-bold text-gray-900 text-sm truncate">{entity.name}</h4>
                                                                    <div className="flex items-center gap-3 mt-0.5">
                                                                        <span className="text-xs text-gray-500">{orderCount} order{orderCount !== 1 ? 's' : ''}</span>
                                                                        <span className="text-[10px] text-gray-300">•</span>
                                                                        <span className="text-xs text-gray-400 capitalize">{entity.type === 'vendor' ? 'Product Sales' : 'Delivery Fees'}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right flex items-center gap-2">
                                                                    <p className={`font-bold text-lg ${amount > 0 ? 'text-gray-900' : 'text-gray-300'}`}>₦{amount.toLocaleString()}</p>
                                                                    {entity.type === 'vendor' && (
                                                                        <button
                                                                            onClick={() => setEarningsTab('stores')}
                                                                            className="text-gray-300 hover:text-[#C62222] transition-colors"
                                                                            title="View stores breakdown"
                                                                        >
                                                                            <ChevronRight size={16} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                }
                                            </div>

                                            {/* All periods summary at bottom */}
                                            <div className="mt-6 bg-gray-50 rounded-xl p-4 border border-gray-100">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                    <Calendar size={14} />
                                                    All Periods Summary
                                                </h4>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className={`p-3 rounded-lg border transition-colors ${earningsPeriod === 'today' ? 'border-[#C62222] bg-red-50' : 'border-gray-200 bg-white'}`}>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Today</p>
                                                        <p className="text-sm font-bold text-gray-900 mt-1">
                                                            ₦{filtered.reduce((s, e) => s + e.earnings.today, 0).toLocaleString()}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400">{filtered.reduce((s, e) => s + e.earnings.todayOrders, 0)} orders</p>
                                                    </div>
                                                    <div className={`p-3 rounded-lg border transition-colors ${earningsPeriod === 'month' ? 'border-[#C62222] bg-red-50' : 'border-gray-200 bg-white'}`}>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">This Month</p>
                                                        <p className="text-sm font-bold text-gray-900 mt-1">
                                                            ₦{filtered.reduce((s, e) => s + e.earnings.thisMonth, 0).toLocaleString()}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400">{filtered.reduce((s, e) => s + e.earnings.monthOrders, 0)} orders</p>
                                                    </div>
                                                    <div className={`p-3 rounded-lg border transition-colors ${earningsPeriod === 'year' ? 'border-[#C62222] bg-red-50' : 'border-gray-200 bg-white'}`}>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">This Year</p>
                                                        <p className="text-sm font-bold text-gray-900 mt-1">
                                                            ₦{filtered.reduce((s, e) => s + e.earnings.thisYear, 0).toLocaleString()}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400">{filtered.reduce((s, e) => s + e.earnings.yearOrders, 0)} orders</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })())}
                        </div>
                    </div>
                </div>
            )}

            <Footer />
            {showPromotions && <PromotionsManager onClose={() => setShowPromotions(false)} />}
        </div>
    );
};

export default AdminDashboard;
