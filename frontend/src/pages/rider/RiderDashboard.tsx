import React, { useEffect, useState, useCallback, useRef } from 'react';
import ApprovalChecklist from '../../components/ui/ApprovalChecklist';
import { useNavigate } from 'react-router-dom';
import { useGlobalLoader } from '../../context/GlobalLoaderContext';
import { MapPin, Package, DollarSign, Clock, Navigation, Power, Bell, CheckCircle, Truck, Phone, ExternalLink, LogOut, ShieldCheck } from 'lucide-react';
import {
    getCurrentRider,
    RiderAccount,
    Order,
    setRiderOnlineStatus,
    getPendingOrdersForRider,
    getOrdersForRider,
    acceptOrder,
    updateOrderStatus,
    getStoreLocation,
    logoutRider,
    updateRiderLocation,
    toErrorMessage,
    Coordinates
} from '../../services/api';
import { getCurrentPosition } from '../../lib/geolocation';

const RiderDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { showLoaderWithDelay } = useGlobalLoader();
    const [rider, setRider] = useState<RiderAccount | null>(null);
    const [isOnline, setIsOnline] = useState(false);
    const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
    const [activeOrders, setActiveOrders] = useState<Order[]>([]);
    const [completedToday, setCompletedToday] = useState(0);
    const [todayEarnings, setTodayEarnings] = useState(0);

    const [loadError, setLoadError] = useState('');
    const [isCheckingStatus, setIsCheckingStatus] = useState(false);

    // Guards against setting state after unmount — polling keeps requests in flight.
    const cancelledRef = useRef(false);
    // Latest known position. A ref rather than state so refreshing it doesn't
    // retrigger the polling effect.
    const coordsRef = useRef<Coordinates | null>(null);

    const fetchOrders = useCallback(async () => {
        if (!rider) return;

        try {
            // Independent requests, so fire them together rather than in sequence.
            // Coordinates, when the device has shared them, let the backend sort
            // pending orders by real distance instead of matching location text.
            const [pending, myOrders] = await Promise.all([
                getPendingOrdersForRider(rider.location, coordsRef.current),
                getOrdersForRider(rider.id),
            ]);

            if (cancelledRef.current) return;

            setPendingOrders(pending);
            setActiveOrders(myOrders.filter(o => ['accepted', 'picked_up', 'in_transit'].includes(o.status)));

            // Calculate today's stats
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayCompleted = myOrders.filter(o =>
                o.status === 'delivered' &&
                new Date(o.deliveredAt || o.createdAt) >= today
            );
            setCompletedToday(todayCompleted.length);
            setTodayEarnings(todayCompleted.reduce((sum, o) => sum + o.deliveryFee, 0));
            setLoadError('');
        } catch (error) {
            if (cancelledRef.current) return;
            setLoadError(toErrorMessage(error, 'Could not refresh your orders.'));
        }
    }, [rider]);

    useEffect(() => {
        cancelledRef.current = false;

        const loadRider = async () => {
            try {
                const currentRider = await getCurrentRider();
                if (cancelledRef.current) return;

                if (!currentRider) {
                    navigate('/vendor-signin');
                    return;
                }
                setRider(currentRider);
                setIsOnline(currentRider.isOnline || false);
            } catch (error) {
                if (cancelledRef.current) return;
                setLoadError(toErrorMessage(error, 'Could not load your account.'));
            }
        };

        loadRider();

        return () => {
            cancelledRef.current = true;
        };
    }, [navigate]);

    useEffect(() => {
        if (!rider) return;
        cancelledRef.current = false;
        fetchOrders();

        // Poll for new orders every 5 seconds
        const interval = setInterval(fetchOrders, 5000);
        return () => {
            cancelledRef.current = true;
            clearInterval(interval);
        };
    }, [rider, fetchOrders]);

    const toggleOnlineStatus = async () => {
        if (!rider) return;
        showLoaderWithDelay(500);

        const newStatus = !isOnline;
        setIsOnline(newStatus); // optimistic — revert below if the server rejects it
        try {
            await setRiderOnlineStatus(rider.id, newStatus);
        } catch (error) {
            setIsOnline(!newStatus);
            setLoadError(toErrorMessage(error, 'Could not change your status. Please try again.'));
            return;
        }

        if (newStatus) {
            // Going online is a deliberate tap, so it's the right moment to ask
            // for location permission. Declining just means dispatch falls back
            // to matching on the rider's location text.
            try {
                const coords = await getCurrentPosition();
                coordsRef.current = coords;
                await updateRiderLocation(rider.id, coords);
                await fetchOrders();
            } catch {
                // Not fatal — the rider can still work without sharing position.
            }
        } else {
            coordsRef.current = null;
        }
    };

    const handleAcceptOrder = async (orderId: string) => {
        if (!rider) return;
        try {
            const accepted = await acceptOrder(orderId, rider.id);
            if (accepted) {
                await fetchOrders();
            } else {
                // Another rider got there first — refresh so it disappears.
                setLoadError('That order was already taken by another rider.');
                await fetchOrders();
            }
        } catch (error) {
            setLoadError(toErrorMessage(error, 'Could not accept the order.'));
        }
    };

    const handleUpdateStatus = async (orderId: string, status: 'picked_up' | 'in_transit' | 'delivered') => {
        try {
            await updateOrderStatus(orderId, status);
            await fetchOrders();
        } catch (error) {
            setLoadError(toErrorMessage(error, 'Could not update the delivery status.'));
        }
    };

    const openNavigation = async (order: Order, destination: 'store' | 'customer') => {
        const buildMapsUrl = (address: string) => {
            const encodedAddress = encodeURIComponent(address);
            // Try to detect if iOS or Android, default to Google Maps
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            return isIOS
                ? `maps://maps.apple.com/?daddr=${encodedAddress}`
                : `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
        };

        if (destination === 'customer') {
            window.open(buildMapsUrl(order.customerAddress), '_blank');
            return;
        }

        // The store address needs a round trip. Open the tab NOW, while we still
        // have the click gesture — opening it after the await would be caught by
        // the popup blocker — then point it at the real address once it arrives.
        const tab = window.open('', '_blank');
        let address = order.storeName;
        try {
            address = (await getStoreLocation(order.storeId)) || order.storeName;
        } catch {
            // Fall back to the store name; it's usually enough for maps search.
        }

        if (tab) {
            tab.location.href = buildMapsUrl(address);
        } else {
            // Popup was blocked entirely — navigate in place as a last resort.
            window.open(buildMapsUrl(address), '_blank');
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m ago`;
    };

    if (!rider) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center font-poppins">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-dashed border-gray-200 rounded-full animate-spin border-t-[#C62222]"></div>
                    <p className="text-sm text-gray-500 font-medium">Starting engine...</p>
                </div>
            </div>
        );
    }

    // Check if rider is verified
    if (!rider.verified) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex flex-col items-center justify-center font-poppins p-6">
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Clock className="w-10 h-10 text-orange-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Pending Verification</h1>
                    <p className="text-gray-500 mb-6">
                        Your rider account is currently under review by our admin team.
                        You'll be able to start accepting deliveries once approved.
                    </p>

                    <ApprovalChecklist
                        role="rider"
                        account={rider}
                        onChanged={async () => {
                            const fresh = await getCurrentRider().catch(() => null);
                            if (fresh) setRider(fresh);
                        }}
                    />

                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
                        <div className="flex items-center gap-2 text-orange-700 text-sm font-medium">
                            <ShieldCheck size={18} />
                            <span>Once both steps are done, review typically takes 24-48 hours</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button
                            disabled={isCheckingStatus}
                            onClick={async () => {
                                // Re-fetch the rider so an admin approval shows up.
                                setIsCheckingStatus(true);
                                try {
                                    const currentRider = await getCurrentRider();
                                    if (currentRider) setRider(currentRider);
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
                                showLoaderWithDelay(600);
                                try {
                                    await logoutRider();
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

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-poppins pb-20">
            {/* Top Bar */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 text-white font-bold text-sm bg-[#C62222] border-red-400`}>
                        {rider.firstName.charAt(0)}
                    </div>
                    <div>
                        <h1 className="font-bold text-sm leading-tight text-gray-900">{rider.firstName} {rider.lastName}</h1>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-1">
                            {rider.vehicleType}
                            {isOnline && <span className="w-1.5 h-1.5 bg-night-green-600 rounded-full animate-pulse"></span>}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative cursor-pointer hover:bg-red-50 p-2 rounded-full transition-colors group">
                        {pendingOrders.length > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#C62222] rounded-full border-2 border-white text-[9px] text-white font-bold flex items-center justify-center">
                                {pendingOrders.length}
                            </span>
                        )}
                        <Bell size={20} className="text-gray-400 group-hover:text-[#C62222] transition-colors" />
                    </div>
                    <button
                        onClick={async () => {
                            showLoaderWithDelay(600);
                            try {
                                await logoutRider();
                            } finally {
                                navigate('/vendor-signin');
                            }
                        }}
                        className="p-2 bg-red-50 hover:bg-[#C62222] rounded-full text-[#C62222] hover:text-white transition-colors border border-red-100"
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-6 py-6 space-y-6">
                {loadError && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start justify-between gap-3">
                        <p className="text-sm text-red-700 font-medium">{loadError}</p>
                        <button
                            onClick={() => setLoadError('')}
                            className="text-xs text-red-600 font-semibold hover:underline flex-shrink-0"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {/* Status Toggle */}
                <section className="relative overflow-hidden rounded-3xl bg-white border border-gray-100 shadow-sm h-44 flex flex-col items-center justify-center">
                    {isOnline && (
                        <div className="absolute inset-0 z-0">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-night-green-600/5 rounded-full blur-3xl animate-pulse"></div>
                        </div>
                    )}

                    <div className="z-10 flex flex-col items-center gap-3">
                        <button
                            onClick={toggleOnlineStatus}
                            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 border-4 ${isOnline ? 'bg-night-green-600 border-night-green-500 scale-110' : 'bg-white border-[#C62222] text-[#C62222] hover:bg-red-50 shadow-red-100'}`}
                        >
                            <Power size={28} className={isOnline ? "text-white" : "text-[#C62222]"} />
                        </button>
                        <div className="text-center">
                            <h2 className={`text-lg font-bold ${isOnline ? 'text-gray-900' : 'text-gray-400'}`}>
                                {isOnline ? 'You are Online' : 'You are Offline'}
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {isOnline ? `Receiving orders near ${rider.location}` : 'Go online to start earning'}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-32 relative group overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-3 bg-red-50 w-fit rounded-xl text-[#C62222]">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 tracking-tight">₦{todayEarnings.toLocaleString()}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Today's Earnings</p>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-32 relative group overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-3 bg-red-50 w-fit rounded-xl text-[#C62222]">
                            <CheckCircle size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 tracking-tight">{completedToday}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Completed Today</p>
                        </div>
                    </div>
                </div>



                {/* Active Orders */}
                {isOnline && activeOrders.length > 0 && (
                    <section>
                        <div className="flex justify-between items-end mb-4">
                            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                <Truck size={20} className="text-[#C62222]" />
                                Active Orders
                            </h3>
                            <span className="text-xs font-bold text-white bg-[#C62222] px-2 py-1 rounded-full">{activeOrders.length}</span>
                        </div>

                        <div className="space-y-4">
                            {activeOrders.map((order) => (
                                <div key={order.id} className="bg-gradient-to-br from-[#C62222] to-[#991b1b] text-white rounded-2xl p-5 shadow-lg shadow-red-900/20">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="font-bold text-base">Order #{order.id.slice(-6)}</h4>
                                            <p className="text-xs text-red-100/80">{order.storeName} • {order.items.length} items</p>
                                        </div>
                                        <span className="font-bold text-lg">₦{(order.totalAmount + order.deliveryFee).toLocaleString()}</span>
                                    </div>

                                    <div className="bg-black/20 backdrop-blur-sm rounded-xl p-3 mb-3 border border-white/5">
                                        <div className="flex items-center gap-2 text-sm">
                                            <MapPin size={14} className="text-red-200" />
                                            <span className="truncate">{order.customerAddress}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm mt-1">
                                            <Phone size={14} className="text-red-200" />
                                            <span>{order.customerPhone}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {order.status === 'accepted' && (
                                            <>
                                                <button
                                                    onClick={() => openNavigation(order, 'store')}
                                                    className="flex-1 py-2.5 bg-white text-[#C62222] text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm"
                                                >
                                                    <Navigation size={16} /> Go to Store
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatus(order.id, 'picked_up')}
                                                    className="px-4 py-2.5 bg-black/30 hover:bg-black/50 text-white text-sm font-bold rounded-xl transition-colors border border-white/10"
                                                >
                                                    Picked Up
                                                </button>
                                            </>
                                        )}
                                        {order.status === 'picked_up' && (
                                            <>
                                                <button
                                                    onClick={() => openNavigation(order, 'customer')}
                                                    className="flex-1 py-2.5 bg-white text-[#C62222] text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm"
                                                >
                                                    <Navigation size={16} /> Navigate to Customer
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatus(order.id, 'delivered')}
                                                    className="px-4 py-2.5 bg-black/30 hover:bg-black/50 text-white text-sm font-bold rounded-xl transition-colors border border-white/10"
                                                >
                                                    Delivered
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Available Orders */}
                {isOnline && (
                    <section>
                        <div className="flex justify-between items-end mb-4">
                            <h3 className="font-bold text-lg text-gray-900">Nearby Orders</h3>
                            {pendingOrders.length > 0 && (
                                <span className="text-xs font-bold text-gray-500">{pendingOrders.length} available</span>
                            )}
                        </div>

                        {pendingOrders.length === 0 ? (
                            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8 text-center">
                                <Package size={40} className="mx-auto text-gray-300 mb-3" />
                                <h4 className="font-bold text-gray-700">No orders nearby</h4>
                                <p className="text-xs text-gray-400 mt-1">New orders will appear here automatically</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pendingOrders.map((order, idx) => (
                                    <div key={order.id} className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 hover:border-[#C62222]/30 hover:shadow-md transition-all relative overflow-hidden">
                                        {idx === 0 && <div className="absolute top-0 left-0 bg-[#C62222] text-white text-[9px] font-bold px-3 py-1 rounded-br-lg shadow-sm">NEW</div>}

                                        <div className="flex justify-between items-start mb-3 mt-1">
                                            <div className="flex gap-3 items-center">
                                                <div className="h-10 w-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 border border-gray-100">
                                                    <Package size={18} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 text-sm">{order.storeName}</h4>
                                                    <p className="text-xs text-gray-500 font-medium">{order.items.length} items • {formatTime(order.createdAt)}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-lg text-gray-900">₦{order.deliveryFee.toLocaleString()}</span>
                                                <p className="text-[10px] text-gray-400">Delivery Fee</p>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs text-gray-600">
                                            <div className="flex items-center gap-2">
                                                <MapPin size={12} className="text-[#C62222]" />
                                                <span className="truncate">{order.customerAddress}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleAcceptOrder(order.id)}
                                                className="flex-1 py-3 bg-[#C62222] text-white text-sm font-bold rounded-xl hover:bg-[#a01b1b] transition-colors shadow-lg shadow-red-100"
                                            >
                                                Accept Order
                                            </button>
                                            <button
                                                onClick={() => openNavigation(order, 'store')}
                                                className="p-3 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200"
                                                title="Preview location"
                                            >
                                                <ExternalLink size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {!isOnline && (
                    <section className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
                        <Power size={40} className="mx-auto text-gray-300 mb-3" />
                        <h4 className="font-bold text-gray-700">You're Offline</h4>
                        <p className="text-xs text-gray-400 mt-1 mb-4">Toggle the power button above to start receiving orders</p>
                    </section>
                )}

                {/* Support Section */}
                <section className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-gray-900">Rider Support</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Need help with an ongoing order?</p>
                        </div>
                        <button className="bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                            Contact
                        </button>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default RiderDashboard;
