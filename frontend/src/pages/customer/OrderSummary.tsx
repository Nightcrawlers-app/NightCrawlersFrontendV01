import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trash2, Plus, Minus, CreditCard, MapPin, Clock, CheckCircle, Loader2, Tag } from 'lucide-react';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { useCart } from '../../context/CartContext';
import { useAuth, Transaction } from '../../context/AuthContext';
import {
    ApiError,
    createOrder,
    toErrorMessage,
    formatPaymentMethod,
    getLivePromotions,
    getStoreById,
    quoteOrder,
    initializePayment,
    promotionAppliesToStore,
    describeDiscount,
} from '../../services/api';
import type { PaymentMethod, Promotion, OrderQuote } from '../../services/api';
import { usePromotion } from '../../context/PromotionContext';
import { useAppConfig } from '../../lib/appConfig';
import PhoneVerificationModal from '../../components/ui/PhoneVerificationModal';
import { useDeliveryLocation } from '../../context/DeliveryLocationContext';
import MapPicker from '../../components/map/MapPicker';
import type { PickedLocation } from '../../components/map/MapPicker';

// Nothing is charged online — there's no payment gateway wired up. The customer
// settles with the rider at the door. When a gateway lands this becomes a real
// choice on this screen; see the Payments section of BACKEND_API_GUIDE.md.
// (Online payment via Paystack is offered when the server has it switched on.)

const OrderSummary: React.FC = () => {
    const navigate = useNavigate();
    const { cartItems, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart();
    const { user, isAuthenticated, addTransaction, addAddress } = useAuth();
    const [showMap, setShowMap] = useState(false);
    const config = useAppConfig();
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash_on_delivery');
    const [redirectingToPay, setRedirectingToPay] = useState(false);
    // The server asks for a verified phone before ordering (when that's switched on).
    const [showPhoneModal, setShowPhoneModal] = useState(false);
    const [savingPin, setSavingPin] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderPlaced, setOrderPlaced] = useState(false);
    const [orderId, setOrderId] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState('');

    // Whatever the customer picked on Explore or the vendor page, falling back
    // to their default saved address. Previously this ignored the choice
    // entirely and could deliver somewhere they never selected.
    const { deliveryAddress: chosenAddress, coords: pickedCoords, setLocation } = useDeliveryLocation();
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

    // The saved address being delivered to (if it's one of theirs) — its own
    // pin wins, so the rider gets the right point even if the customer switched
    // addresses on this page.
    const selectedSaved = user?.addresses.find(a => a.address === deliveryAddress);
    const chosenCoords =
        selectedSaved?.latitude != null && selectedSaved?.longitude != null
            ? { latitude: selectedSaved.latitude, longitude: selectedSaved.longitude }
            : deliveryAddress === chosenAddress ? pickedCoords : null;

    // Pick a new spot on the map: saved to their profile (so it's reusable and
    // the order has a real, pinned address) and selected straight away.
    const handleMapPicked = async (picked: PickedLocation) => {
        setShowMap(false);
        if (!user) return;
        setSavingPin(true);
        const saveError = await addAddress({
            label: user.addresses.length === 0 ? 'Home' : 'Pinned location',
            address: picked.label,
            city: picked.city || 'Nigeria',
            latitude: picked.coords.latitude,
            longitude: picked.coords.longitude,
            isDefault: user.addresses.length === 0,
        });
        setSavingPin(false);
        if (saveError) {
            setSubmitError(saveError);
            return;
        }
        setLocation(picked.label, picked.coords);
        setDeliveryAddress(picked.label);
    };


    // ── Promotions ───────────────────────────────────────────────────────────
    // Promos that cover this store; the one the customer tapped (from a banner)
    // is used if it applies here, otherwise the top one is applied for them.
    const { selectedPromotion, selectPromotion } = usePromotion();
    const cartStoreId = cartItems[0]?.storeId;
    const [storePromos, setStorePromos] = useState<Promotion[]>([]);
    const [orderQuote, setOrderQuote] = useState<OrderQuote | null>(null);
    const [quoting, setQuoting] = useState(false);

    useEffect(() => {
        if (!cartStoreId) {
            setStorePromos([]);
            return;
        }
        let cancelled = false;
        Promise.all([getLivePromotions(), getStoreById(String(cartStoreId))])
            .then(([promos, store]) => {
                if (cancelled || !store) return;
                setStorePromos(promos.filter((p) => promotionAppliesToStore(p, store)));
            })
            .catch(() => !cancelled && setStorePromos([]));
        return () => {
            cancelled = true;
        };
    }, [cartStoreId]);

    // True after the customer taps "Remove" — then we stop auto-applying.
    const [promoDeclined, setPromoDeclined] = useState(false);
    const activePromo = promoDeclined
        ? null
        : storePromos.find((p) => p.id === selectedPromotion?.id) ?? storePromos[0] ?? null;

    // Every figure on this page comes from the server (menu prices, delivery
    // fee, service fee, promo) — the same calculation used to place the order.
    const cartKey = cartItems.map((i) => `${i.id}x${i.quantity}`).join(',');
    useEffect(() => {
        if (!cartStoreId || cartItems.length === 0) {
            setOrderQuote(null);
            return;
        }
        const controller = new AbortController();
        setQuoting(true);
        const timer = window.setTimeout(() => {
            quoteOrder(
                {
                    storeId: String(cartStoreId),
                    items: cartItems.map((i) => ({ menuItemId: String(i.id), quantity: i.quantity })),
                    promotionId: activePromo?.id ?? null,
                    // Where it's going — the delivery fee depends on the distance
                    customerLatitude: chosenCoords?.latitude ?? null,
                    customerLongitude: chosenCoords?.longitude ?? null,
                    customerAddress: deliveryAddress || undefined,
                },
                controller.signal,
            )
                .then((q) => {
                    setOrderQuote(q);
                    setSubmitError('');
                })
                .catch((err) => {
                    if (controller.signal.aborted) return;
                    setOrderQuote(null);
                    setSubmitError(toErrorMessage(err, "Couldn't work out your total. Please try again."));
                })
                .finally(() => !controller.signal.aborted && setQuoting(false));
        }, 250);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [cartKey, cartStoreId, activePromo?.id, chosenCoords?.latitude, chosenCoords?.longitude, deliveryAddress]); // eslint-disable-line react-hooks/exhaustive-deps

    const quote = orderQuote?.promotion ?? null; // the promo part of the quote
    const deliveryFee = orderQuote?.deliveryFee ?? 0;
    const serviceFee = orderQuote?.serviceFee ?? 0;
    const discount = orderQuote?.discount ?? 0;
    const finalTotal = orderQuote?.total ?? cartTotal;

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
                customerLocation: selectedSaved?.city || user?.location || '',
                customerAddress: deliveryAddress,
                // Sent when the customer shared a real point, so the rider can
                // navigate to it rather than guessing from the address text.
                customerLatitude: chosenCoords?.latitude ?? null,
                customerLongitude: chosenCoords?.longitude ?? null,
                // Only ids and quantities — the server uses the menu's real
                // prices and its own delivery fee.
                items: cartItems.map(item => ({
                    menuItemId: String(item.id),
                    quantity: item.quantity,
                })),
                paymentMethod,
                promotionId: quote?.eligible && activePromo ? activePromo.id : null,
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
                    // What the server actually charged, not the cart's copy
                    subtotal: order.totalAmount,
                    deliveryFee: order.deliveryFee,
                    total: order.totalPaid ?? order.totalAmount + order.deliveryFee + (order.serviceFee ?? 0) - (order.discountAmount ?? 0),
                    vendorName: storeName,
                    vendorImage: cartItems[0]?.vendorImage,
                    paymentMethod,
                    deliveryAddress,
                };
                addTransaction(txn);
            }

            clearCart();
            selectPromotion(null); // used up for this order

            if (paymentMethod === 'online') {
                // Off to Paystack's secure checkout; it sends them back to
                // /payment/callback, which confirms the payment with our server.
                setRedirectingToPay(true);
                try {
                    const { authorizationUrl } = await initializePayment(order.id);
                    window.location.href = authorizationUrl;
                    return;
                } catch (payErr) {
                    setRedirectingToPay(false);
                    // The order exists; they can retry payment from the callback page.
                    navigate(`/payment/callback?order=${order.id}&error=${encodeURIComponent(toErrorMessage(payErr, 'Could not start payment.'))}`);
                    return;
                }
            }

            setOrderId(order.id);
            setOrderPlaced(true);
        } catch (error) {
            if (error instanceof ApiError && (error.body as { needsPhoneVerification?: boolean })?.needsPhoneVerification) {
                setShowPhoneModal(true);
                return;
            }
            // Cart is deliberately left intact so the customer can retry.
            // If the promo stopped being valid (ended, wrong store), drop it
            // so the next tap places the order at full price, visibly.
            if (error instanceof ApiError && (error.body as { promotionInvalid?: boolean })?.promotionInvalid) {
                selectPromotion(null);
                setStorePromos((list) => list.filter((p) => p.id !== activePromo?.id));
            }
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
                                            <p className="text-[#667085] text-sm mb-3">Where should we deliver?</p>
                                            <button
                                                onClick={() => setShowMap(true)}
                                                disabled={savingPin}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#C62222] text-white text-xs font-semibold rounded-lg hover:bg-[#A01B1B] disabled:opacity-60"
                                            >
                                                <MapPin size={14} />
                                                {savingPin ? 'Saving…' : 'Choose on the map'}
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
                                            <button
                                                onClick={() => setShowMap(true)}
                                                disabled={savingPin}
                                                className="w-full p-3 rounded-lg border border-dashed border-[#C62222]/40 text-[#C62222] text-xs font-semibold flex items-center justify-center gap-2 hover:bg-[#FFF5F5] disabled:opacity-60"
                                            >
                                                <MapPin size={14} />
                                                {savingPin ? 'Saving…' : 'Deliver somewhere else — pick on the map'}
                                            </button>
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
                                    <span className="font-medium text-[#222222]">₦ {(orderQuote?.subtotal ?? cartTotal).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-[#667085] text-sm">
                                    <span>Delivery Fee{orderQuote?.distanceKm != null ? ` (${orderQuote.distanceKm} km)` : ''}</span>
                                    <span className="font-medium text-[#222222]">₦ {deliveryFee.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-[#667085] text-sm">
                                    <span>Service Fee ({orderQuote?.serviceFeePercent ?? 5}%)</span>
                                    <span className="font-medium text-[#222222]">₦ {serviceFee.toLocaleString()}</span>
                                </div>
                                {discount > 0 && activePromo && (
                                    <div className="flex justify-between text-green-700 text-sm">
                                        <span className="flex items-center gap-1.5 min-w-0">
                                            <Tag size={13} className="flex-shrink-0" />
                                            <span className="truncate">{activePromo.badge || activePromo.title}</span>
                                        </span>
                                        <span className="font-semibold">− ₦ {discount.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            {/* Promos available at this store */}
                            {storePromos.length > 0 && (
                                <div className="mb-6 space-y-2">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#98A2B3]">Promos</p>
                                    {storePromos.map((p) => {
                                        const applied = activePromo?.id === p.id;
                                        return (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => {
                                                    setPromoDeclined(applied);
                                                    selectPromotion(applied ? null : p);
                                                }}
                                                className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex items-start gap-2.5 ${applied ? 'border-[#C62222] bg-[#FFF5F5]' : 'border-gray-200 hover:border-[#C62222]/40'}`}
                                            >
                                                <Tag size={14} className={`mt-0.5 flex-shrink-0 ${applied ? 'text-[#C62222]' : 'text-gray-400'}`} />
                                                <span className="flex-1 min-w-0">
                                                    <span className="block font-semibold text-[#222222]">{p.title}</span>
                                                    <span className="block text-[#667085]">{describeDiscount(p)}</span>
                                                    {applied && quote && !quote.eligible && quote.reason && (
                                                        <span className="block text-amber-700 mt-1">{quote.reason}</span>
                                                    )}
                                                </span>
                                                <span className={`font-semibold ${applied ? 'text-[#C62222]' : 'text-gray-500'}`}>
                                                    {applied ? 'Remove' : 'Apply'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[#222222] font-bold text-lg">Total</span>
                                <span className="text-[#C62222] font-bold text-xl">₦ {finalTotal.toLocaleString()}</span>
                            </div>

                            {/* Payment method */}
                            <div className="mb-6 space-y-2">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#98A2B3]">Payment</p>
                                {([
                                    { value: 'cash_on_delivery', title: formatPaymentMethod('cash_on_delivery'), detail: 'Pay the rider when your order arrives.' },
                                    ...(config.onlinePayments
                                        ? [{ value: 'online', title: 'Pay now online', detail: `Card, bank transfer or USSD via Paystack.${config.paystackTestMode ? ' (Test mode — no real charge)' : ''}` }]
                                        : []),
                                ] as { value: PaymentMethod; title: string; detail: string }[]).map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setPaymentMethod(opt.value)}
                                        className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex items-start gap-2.5 ${paymentMethod === opt.value ? 'border-[#C62222] bg-[#FFF5F5]' : 'border-gray-200 hover:border-[#C62222]/40'}`}
                                    >
                                        <CreditCard size={14} className={`mt-0.5 flex-shrink-0 ${paymentMethod === opt.value ? 'text-[#C62222]' : 'text-gray-400'}`} />
                                        <span>
                                            <span className="block font-semibold text-[#222222]">{opt.title}</span>
                                            <span className="block text-[#667085]">{opt.detail}</span>
                                        </span>
                                    </button>
                                ))}
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
                                    <p className="text-[11px] text-amber-600">Pick where to deliver before placing your order.</p>
                                    <button
                                        onClick={() => setShowMap(true)}
                                        className="text-[11px] text-[#C62222] font-semibold mt-1 hover:underline"
                                    >
                                        Choose on the map →
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
                                disabled={isSubmitting || redirectingToPay || quoting || !orderQuote || !user || !user.phone || user.addresses.length === 0}
                                className="w-full h-12 bg-[#222222] text-white font-semibold rounded-lg hover:bg-black transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 mb-4 group disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isSubmitting || redirectingToPay ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        {redirectingToPay ? 'Opening secure payment…' : 'Processing...'}
                                    </>
                                ) : (
                                    <>
                                        {paymentMethod === 'online' ? `Pay ₦${finalTotal.toLocaleString()}` : 'Place Order'}
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
            {showPhoneModal && (
                <PhoneVerificationModal
                    onClose={() => setShowPhoneModal(false)}
                    onVerified={() => {
                        setShowPhoneModal(false);
                        handlePlaceOrder(); // pick up where they left off
                    }}
                />
            )}
            <MapPicker
                open={showMap}
                onClose={() => setShowMap(false)}
                onConfirm={handleMapPicked}
                title="Where should we deliver?"
                confirmText="Deliver here"
                initialCoords={chosenCoords}
                autoLocate={!chosenCoords}
            />
        </div>
    );
};

export default OrderSummary;
