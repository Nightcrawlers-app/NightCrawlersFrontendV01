import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalLoader } from '../../context/GlobalLoaderContext';
import {
    ArrowLeft,
    Package,
    Clock,
    CheckCircle,
    ShoppingBag,
    MapPin,
    Phone
} from 'lucide-react';
import {
    getCurrentVendor,
    getOrdersForVendor,
    updateOrderStatus,
    toErrorMessage,
    Order,
    OrderStatus,
    VendorAccount
} from '../../services/api';

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    preparing: 'bg-blue-100 text-blue-700',
    ready: 'bg-orange-100 text-orange-700',
    accepted: 'bg-purple-100 text-purple-700',
    picked_up: 'bg-indigo-100 text-indigo-700',
    in_transit: 'bg-indigo-100 text-indigo-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
    pending: 'New Order',
    preparing: 'Preparing',
    ready: 'Ready for Rider',
    accepted: 'Rider Assigned',
    picked_up: 'Picked Up',
    in_transit: 'On the Way',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
};

const VendorOrders: React.FC = () => {
    const navigate = useNavigate();
    const { showLoaderWithDelay } = useGlobalLoader();
    const [orders, setOrders] = useState<Order[]>([]);
    const [vendor, setVendor] = useState<VendorAccount | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    // `cancelled` guards against setting state after the page unmounts, which
    // matters here because polling keeps requests in flight.
    const cancelledRef = useRef(false);

    const loadOrders = useCallback(async (vendorId: string) => {
        try {
            const vendorOrders = await getOrdersForVendor(vendorId);
            if (cancelledRef.current) return;
            // Sort so newer and actionable orders are at the top
            const sorted = [...vendorOrders].sort((a, b) => {
                const aTime = new Date(a.createdAt).getTime();
                const bTime = new Date(b.createdAt).getTime();
                return bTime - aTime;
            });
            setOrders(sorted);
            setLoadError('');
        } catch (error) {
            if (cancelledRef.current) return;
            setLoadError(toErrorMessage(error, 'Could not load orders.'));
        }
    }, []);

    useEffect(() => {
        cancelledRef.current = false;
        let interval: ReturnType<typeof setInterval> | undefined;

        const init = async () => {
            try {
                const currentVendor = await getCurrentVendor();
                if (cancelledRef.current) return;

                if (!currentVendor) {
                    navigate('/vendor-signin');
                    return;
                }

                setVendor(currentVendor);
                await loadOrders(currentVendor.id);

                // Poll for new orders. Swap for WebSockets when the backend
                // supports them — see BACKEND_API_GUIDE.md.
                interval = setInterval(() => {
                    loadOrders(currentVendor.id);
                }, 5000);
            } catch (error) {
                if (cancelledRef.current) return;
                setLoadError(toErrorMessage(error, 'Could not load your account.'));
            } finally {
                if (!cancelledRef.current) setIsLoading(false);
            }
        };

        init();

        return () => {
            cancelledRef.current = true;
            if (interval) clearInterval(interval);
        };
    }, [navigate, loadOrders]);

    const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
        showLoaderWithDelay(400);
        try {
            await updateOrderStatus(orderId, newStatus);
            if (vendor) await loadOrders(vendor.id);
        } catch (error) {
            setLoadError(toErrorMessage(error, 'Could not update the order status.'));
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center font-poppins">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-[#C62222] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Loading your orders…</p>
                </div>
            </div>
        );
    }

    if (!vendor) return null;

    const activeOrders = orders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status));
    const pastOrders = orders.filter(o => ['accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled'].includes(o.status));

    const renderOrderCard = (order: Order, isActive: boolean) => (
        <div key={order.id} className={`bg-white rounded-xl shadow-sm border p-5 ${isActive ? 'border-red-100' : 'border-gray-100'}`}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Order #{order.id.substring(0, 6)}</h3>
                    <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                    {STATUS_LABELS[order.status] || order.status}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1 mb-2">
                        <ShoppingBag size={14} className="text-gray-400" /> Items
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                        {order.items.map((item, idx) => (
                            <li key={idx} className="flex justify-between">
                                <span>{item.quantity}x {item.name}</span>
                                <span className="font-medium">₦{(item.price * item.quantity).toLocaleString()}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between font-semibold text-gray-900">
                        <span>Total</span>
                        <span>₦{order.totalAmount.toLocaleString()}</span>
                    </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                    <h4 className="font-medium text-gray-700 mb-2">Customer Details</h4>
                    <p className="text-gray-900 font-medium">{order.customerName}</p>
                    <p className="text-gray-600 flex items-center gap-1 mt-1">
                        <Phone size={12} /> {order.customerPhone}
                    </p>
                    <p className="text-gray-600 flex items-start gap-1 mt-1">
                        <MapPin size={12} className="mt-1 flex-shrink-0" />
                        <span>{order.customerAddress} ({order.customerLocation})</span>
                    </p>
                </div>
            </div>

            {isActive && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                    {order.status === 'pending' && (
                        <button
                            onClick={() => handleStatusUpdate(order.id, 'preparing')}
                            className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                        >
                            Start Preparing
                        </button>
                    )}
                    {order.status === 'preparing' && (
                        <button
                            onClick={() => handleStatusUpdate(order.id, 'ready')}
                            className="flex-1 bg-orange-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 transition"
                        >
                            Mark as Ready
                        </button>
                    )}
                    {order.status === 'ready' && (
                        <div className="flex-1 text-center py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
                            Waiting for Rider...
                        </div>
                    )}
                    {(order.status === 'pending' || order.status === 'preparing') && (
                        <button
                            onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-100 transition border border-red-200"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 font-poppins">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <button
                    onClick={() => navigate('/vendor-dashboard')}
                    className="flex items-center gap-2 text-gray-600 hover:text-[#C62222] transition-colors mb-6 font-medium"
                >
                    <ArrowLeft size={20} />
                    Back to Dashboard
                </button>

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Incoming Orders</h1>
                        <p className="text-gray-500 text-sm mt-1">Manage processing and view past orders</p>
                    </div>
                    <div className="bg-red-100 text-[#C62222] p-3 rounded-xl flex items-center gap-2">
                        <Package size={20} />
                        <span className="font-bold">{activeOrders.length}</span>
                        <span className="text-sm font-semibold">Active</span>
                    </div>
                </div>

                {loadError && (
                    <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
                        <p className="text-sm text-red-700 font-medium">{loadError}</p>
                        <p className="text-xs text-red-600 mt-1">Showing the last orders that loaded successfully.</p>
                    </div>
                )}

                <div className="space-y-8">
                    <section>
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Clock size={18} className="text-[#C62222]" /> Needs Attention
                        </h2>
                        {activeOrders.length === 0 ? (
                            <div className="bg-white border border-gray-100 rounded-xl p-8 text-center shadow-sm">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <CheckCircle className="text-gray-400" size={24} />
                                </div>
                                <p className="text-gray-600 font-medium">No active orders right now.</p>
                                <p className="text-gray-400 text-sm mt-1">When customers order, they will appear here.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {activeOrders.map(o => renderOrderCard(o, true))}
                            </div>
                        )}
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Past Orders</h2>
                        {pastOrders.length === 0 ? (
                            <p className="text-gray-500 text-sm">No past orders yet.</p>
                        ) : (
                            <div className="space-y-4 opacity-75">
                                {pastOrders.map(o => renderOrderCard(o, false))}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};

export default VendorOrders;
