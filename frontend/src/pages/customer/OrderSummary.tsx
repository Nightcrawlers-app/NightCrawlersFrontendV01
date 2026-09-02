import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trash2, Plus, Minus, CreditCard, MapPin, Clock, CheckCircle, Loader2 } from 'lucide-react';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { useCart } from '../../context/CartContext';
import { useAuth, Transaction } from '../../context/AuthContext';
import { createOrder, toErrorMessage, formatPaymentMethod } from '../../services/api';
import type { PaymentMethod } from '../../services/api';
import { useDeliveryLocation } from '../../context/DeliveryLocationContext';

// Nothing is charged online — there's no payment gateway wired up. The customer
// settles with the rider at the door. When a gateway lands this becomes a real
// choice on this screen; see the Payments section of BACKEND_API_GUIDE.md.
const PAYMENT_METHOD: PaymentMethod = 'cash_on_delivery';

const OrderSummary: React.FC = () => {
    const navigate = useNavigate();
    const { cartItems, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart();
    const { user, isAuthenticated, addTransaction } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderPlaced, setOrderPlaced] = useState(false);
    const [orderId, setOrderId] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState('');

    // Whatever the customer picked on Explore or the vendor page, falling back
    // to their default saved address. Previously this ignored the choice
    // entirely and could deliver somewhere they never selected.
    const { deliveryAddress: chosenAddress, coords: chosenCoords } = useDeliveryLocation();
    const defaultAddr = user?.addresses.find(a => a.isDefault) || user?.addresses[0];
    const [deliveryAddress, setDeliveryAddress] = useState(
        chosenAddress || defaultAddr?.address || ''
    );
    const [customerName, setCustomerName] = useState(
        user ? `${user.firstName} ${user.lastName}` : 'Customer'
    );
    const [customerPhone, setCustomerPhone] = useState(
        user?.phone || '+234 801 234 5678'
    );

    // Keep fields in sync if the user signs in after page load, or changes
    // their delivery address elsewhere. The chosen address wins over the saved
    // default, otherwise picking one on Explore would be silently discarded.
    useEffect(() => {
        if (user) {
            setCustomerName(`${user.firstName} ${user.lastName}`);
            setCustomerPhone(user.phone);
        }
        const fallback = user?.addresses.find(a => a.isDefault) || user?.addresses[0];
        const next = chosenAddress || fallback?.address;
        if (next) setDeliveryAddress(next);
    }, [user, chosenAddress]);

    const deliveryFee = 800; // Mock delivery fee
    const serviceFee = Math.round(cartTotal * 0.05); // 5% service fee
    const finalTotal = cartTotal + deliveryFee + serviceFee;

    const incrementItem = (id: string | number) => {
        const item = cartItems.find(i => i.id === id);
        if (item) updateQuantity(id, item.quantity + 1);
    };

    const decrementItem = (id: string | number) => {
        const item = cartItems.find(i => i.id === id);
        if (item && item.quantity > 1) {
            updateQuantity(id, item.quantity - 1);
        }
    };

    const handlePlaceOrder = async () => {
        if (cartItems.length === 0 || isSubmitting) return;

        // An order belongs to exactly one store. The cart doesn't enforce that,
        // so check it here rather than sending the backend a basket whose items
        // come from two different kitchens.
        const storeIds = Array.from(new Set(cartItems.map(item => item.storeId)));
        if (storeIds.length > 1) {
            setSubmitError(
                'Your cart has items from more than one store. Please order from one store at a time.',
            );
            return;
        }

        // No fallback here on purpose. A missing storeId used to become the
        // literal string 'store-1', which would file the order against a store
        // that doesn't exist instead of failing where someone can see it.
        const storeId = cartItems[0]?.storeId;
        const storeName = cartItems[0]?.storeName;
        if (!storeId || !storeName) {
            setSubmitError(
                "We couldn't tell which store this order is for. Please empty your cart and add the items again.",
            );
            return;
        }

        setIsSubmitting(true);
        setSubmitError('');

        try {
            // customerId is NOT sent — the backend reads it from the session.
            const order = await createOrder({
                storeId,
                storeName,
                customerName,
                customerPhone,
                customerLocation: 'Lagos',
                customerAddress: deliveryAddress,
                // Sent when the customer shared a real point, so the rider can
                // navigate to it rather than guessing from the address text.
                customerLatitude: chosenCoords?.latitude ?? null,
                customerLongitude: chosenCoords?.longitude ?? null,
                items: cartItems.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price
                })),
                deliveryFee,
                paymentMethod: PAYMENT_METHOD,
            });

            // Mirror the order into the profile's history so it shows immediately.
            // The authoritative list comes from the backend on next load.
            if (isAuthenticated) {
                const txn: Transaction = {
                    id: 'txn_' + order.id,
                    orderId: `#NC-${order.id}`,
                    date: order.createdAt ?? new Date().toISOString(),
                    status: 'preparing',
                    items: cartItems.map(item => ({
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        image: item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop',
                    })),
                    subtotal: cartTotal,
                    deliveryFee,
                    total: finalTotal,
                    vendorName: storeName,
                    vendorImage: cartItems[0]?.vendorImage,
                    paymentMethod: PAYMENT_METHOD,
                    deliveryAddress,
                };
                addTransaction(txn);
            }

            setOrderId(order.id);
            setOrderPlaced(true);
            clearCart();
        } catch (error) {
            // Cart is deliberately left intact so the customer can retry.
            setSubmitError(toErrorMessage(error, 'Could not place your order. Please try again.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Order Success Screen
    if (orderPlaced && orderId) {
        return (
            <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-poppins">
                <Header />
                <main className="flex-grow flex flex-col items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md w-full">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-[#222222] mb-2">Order Placed!</h1>
                        <p className="text-[#667085] mb-2">Your order has been sent to nearby riders.</p>
                        <p className="text-sm text-gray-500 mb-6">Order ID: <span className="font-mono font-bold">{orderId.slice(-8).toUpperCase()}</span></p>

                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
                            <p className="text-sm text-orange-800 font-medium">
                                🚴 A rider will accept your order soon. You'll be able to track your delivery once accepted.
                            </p>
                        </div>

                        <button
                            onClick={() => navigate('/explore')}
                            className="w-full py-3 bg-[#C62222] text-white font-medium rounded-lg hover:bg-[#A01B1B] transition-colors"
                        >
                            Continue Shopping
                        </button>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (cartItems.length === 0) {
        return (
            <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-poppins">
                <Header />
                <main className="flex-grow flex flex-col items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md w-full">
                        <div className="w-16 h-16 bg-[#FEECEC] rounded-full flex items-center justify-center mx-auto mb-4">
                            <CreditCard className="w-8 h-8 text-[#C62222]" />
                        </div>
                        <h1 className="text-2xl font-bold text-[#222222] mb-2">Your Cart is Empty</h1>
                        <p className="text-[#667085] mb-6">Looks like you haven't added anything to your order yet.</p>
                        <button
                            onClick={() => navigate('/explore')}
                            className="w-full py-3 bg-[#C62222] text-white font-medium rounded-lg hover:bg-[#A01B1B] transition-colors"
                        >
                            Start Exploring
                        </button>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-poppins">
            <Header />

            <main className="flex-grow w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                {/* Breadcrumb / Back */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-[#667085] hover:text-[#C62222] transition-colors mb-6 sm:mb-8 font-medium text-sm"
                >
                    <ChevronLeft size={16} />
                    Back to Menu
                </button>

                <h1 className="text-2xl sm:text-3xl font-bold text-[#222222] mb-8">Order Summary</h1>

                <div className="flex flex-col lg:flex-row justify-between gap-8 lg:gap-16 xl:gap-24">

                    {/* Left Column: Cart Items */}
                    <div className="flex-grow space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-[#EAECF0] overflow-hidden">
                            <div className="p-6 border-b border-[#EAECF0] flex justify-between items-center">
                                <h2 className="text-lg font-semibold text-[#222222]">Items Details</h2>
                                <button
                                    onClick={clearCart}
                                    className="text-sm text-[#C62222] hover:text-[#A01B1B] font-medium"
                                >
                                    Clear Order
                                </button>
                            </div>

                            <div className="divide-y divide-[#EAECF0]">
                                {cartItems.map((item) => (
                                    <div key={item.id} className="p-4 sm:p-6 flex gap-4 sm:gap-6 items-start hover:bg-[#FAFAFA] transition-colors">
                                        {/* Item Image */}
                                        <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-grow flex flex-col justify-between min-h-[80px] sm:min-h-[96px]">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="text-base sm:text-lg font-bold text-[#222222] mb-1 line-clamp-2">{item.name}</h3>
                                                    <p className="text-[#C62222] font-semibold text-sm sm:text-base">
                                                        ₦ {item.price.toLocaleString()}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="text-[#98A2B3] hover:text-[#C62222] p-1 transition-colors"
                                                    aria-label="Remove item"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>

                                            <div className="flex items-center justify-between mt-4">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => decrementItem(item.id)}
                                                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-[#C62222] hover:text-[#C62222] transition-colors"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="text-[#222222] font-semibold text-sm w-6 text-center">{item.quantity}</span>
                                                    <button
                                                        onClick={() => incrementItem(item.id)}
                                                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-[#C62222] hover:text-[#C62222] transition-colors"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                                <p className="text-[#222222] font-bold text-sm sm:text-base">
                                                    ₦ {(item.price * item.quantity).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Delivery Details Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-[#EAECF0] p-6">
                            <h2 className="text-lg font-semibold text-[#222222] mb-4">Delivery Details</h2>
                            <div className="space-y-4">
                                {/* Address Section */}
                                <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#EAECF0]">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm text-[#C62222]">
                                            <MapPin size={16} />
                                        </div>
                                        <p className="text-[#222222] font-medium text-sm">Delivery Address</p>
                                    </div>

                                    {!user ? (
                                        /* Not logged in */
                                        <div className="text-center py-4">
                                            <p className="text-[#667085] text-sm mb-2">You need to sign in to set a delivery address</p>
                                            <button
                                                onClick={() => navigate('/signin')}
                                                className="text-[#C62222] text-xs font-semibold hover:underline"
                                            >
                                                Sign In / Sign Up →
                                            </button>
                                        </div>
                                    ) : user.addresses.length === 0 ? (
                                        /* No addresses saved */
                                        <div className="text-center py-4">
                                            <p className="text-[#667085] text-sm mb-2">No delivery address saved</p>
                                            <button
                                                onClick={() => navigate('/user-profile')}
                                                className="text-[#C62222] text-xs font-semibold hover:underline"
                                            >
                                                Go to Profile to add an address →
                                            </button>
                                        </div>
                                    ) : (
                                        /* Show all saved addresses as selectable options */
                                        <div className="space-y-2">
                                            {user.addresses.map(addr => (
                                                <button
                                                    key={addr.id}
                                                    onClick={() => setDeliveryAddress(addr.address)}
                                                    className={`w-full text-left p-3 rounded-lg border text-sm transition-all flex items-start gap-3 ${deliveryAddress === addr.address
                                                        ? 'border-[#C62222] bg-[#FFF5F5]'
                                                        : 'border-gray-200 bg-white hover:border-[#C62222]/40'
                                                        }`}
                                                >
                                                    <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${deliveryAddress === addr.address
                                                        ? 'border-[#C62222]'
                                                        : 'border-gray-300'
                                                        }`}>
                                                        {deliveryAddress === addr.address && (
                                                            <div className="w-2 h-2 rounded-full bg-[#C62222]" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className={`font-semibold text-xs mb-0.5 ${deliveryAddress === addr.address ? 'text-[#C62222]' : 'text-gray-800'
                                                            }`}>
                                                            {addr.label}
                                                            {addr.isDefault && (
                                                                <span className="ml-1.5 text-[9px] font-bold bg-[#FEE4E2] text-[#C62222] px-1.5 py-0.5 rounded-full">
                                                                    Default
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className={`text-xs ${deliveryAddress === addr.address ? 'text-[#C62222]/70' : 'text-gray-500'
                                                            }`}>
                                                            {addr.address}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Estimated time */}
                                <div className="flex items-start gap-4 p-4 bg-[#F9FAFB] rounded-lg border border-[#EAECF0]">
                                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-[#C62222]">
                                        <Clock size={20} />
                                    </div>
                                    <div className="flex-grow">
                                        <p className="text-[#222222] font-medium text-sm mb-1">Estimated Delivery Time</p>
                                        <p className="text-[#667085] text-sm">
                                            25 - 35 mins
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Checkout Summary */}
                    <div className="w-full lg:w-[380px] flex-shrink-0">
                        <div className="bg-white rounded-xl shadow-sm border border-[#EAECF0] p-6 sticky top-24">
                            <h2 className="text-lg font-semibold text-[#222222] mb-6">Payment Summary</h2>

                            <div className="space-y-4 mb-6 border-b border-[#EAECF0] pb-6">
                                <div className="flex justify-between text-[#667085] text-sm">
                                    <span>Subtotal</span>
                                    <span className="font-medium text-[#222222]">₦ {cartTotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-[#667085] text-sm">
                                    <span>Delivery Fee</span>
                                    <span className="font-medium text-[#222222]">₦ {deliveryFee.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-[#667085] text-sm">
                                    <span>Service Fee (5%)</span>
                                    <span className="font-medium text-[#222222]">₦ {serviceFee.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[#222222] font-bold text-lg">Total</span>
                                <span className="text-[#C62222] font-bold text-xl">₦ {finalTotal.toLocaleString()}</span>
                            </div>

                            <div className="flex items-center gap-2 mb-6 px-3 py-2.5 bg-gray-50 border border-[#EAECF0] rounded-lg">
                                <CreditCard size={14} className="text-gray-400 flex-shrink-0" />
                                <p className="text-xs text-[#667085]">
                                    Pay <span className="font-medium text-[#222222]">{formatPaymentMethod(PAYMENT_METHOD)}</span> — you settle with the rider when your order arrives.
                                </p>
                            </div>

                            {/* Not logged in warning */}
                            {!user && (
                                <div className="mb-4 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-xs text-blue-700 font-medium mb-1">👋 Sign in required</p>
                                    <p className="text-[11px] text-blue-600">Please sign in to complete your checkout securely.</p>
                                    <button
                                        onClick={() => navigate('/signin')}
                                        className="text-[11px] text-blue-700 font-semibold mt-1 hover:underline"
                                    >
                                        Sign In / Sign Up →
                                    </button>
                                </div>
                            )}

                            {/* Phone number warning */}
                            {user && !user.phone && (
                                <div className="mb-4 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                                    <p className="text-xs text-amber-700 font-medium mb-1">📞 Phone number required</p>
                                    <p className="text-[11px] text-amber-600">Add your phone number so the rider can contact you for delivery.</p>
                                    <button
                                        onClick={() => navigate('/user-profile')}
                                        className="text-[11px] text-[#C62222] font-semibold mt-1 hover:underline"
                                    >
                                        Go to Profile →
                                    </button>
                                </div>
                            )}

                            {/* No address warning */}
                            {user && user.addresses.length === 0 && (
                                <div className="mb-4 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                                    <p className="text-xs text-amber-700 font-medium mb-1">📍 Delivery address required</p>
                                    <p className="text-[11px] text-amber-600">Add a delivery address before placing your order.</p>
                                    <button
                                        onClick={() => navigate('/user-profile')}
                                        className="text-[11px] text-[#C62222] font-semibold mt-1 hover:underline"
                                    >
                                        Go to Profile →
                                    </button>
                                </div>
                            )}

                            {submitError && (
                                <div className="mb-3 p-3 rounded-lg bg-[#FEECEC] border border-[#F5C2C2]">
                                    <p className="text-[12px] text-[#991B1B] font-medium">{submitError}</p>
                                </div>
                            )}

                            <button
                                onClick={handlePlaceOrder}
                                disabled={isSubmitting || !user || !user.phone || user.addresses.length === 0}
                                className="w-full h-12 bg-[#222222] text-white font-semibold rounded-lg hover:bg-black transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 mb-4 group disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        Place Order
                                        <ChevronLeft size={16} className="rotate-180 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>

                            <p className="text-xs text-[#98A2B3] text-center">
                                By processing this order you agree to our Terms and Conditions.
                            </p>
                        </div>
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    );
};

export default OrderSummary;
