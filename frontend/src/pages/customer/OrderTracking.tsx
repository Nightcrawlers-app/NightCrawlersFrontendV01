import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Circle, Clock, Loader2, Phone, Store, Bike, MapPin, XCircle, RefreshCw } from 'lucide-react';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { getOrderTracking, formatPaymentMethod, toErrorMessage, ApiError } from '../../services/api';
import type { OrderTracking } from '../../services/api';
import TripMap from '../../components/map/TripMap';

const POLL_MS = 15000;
// While a rider is on the way, refresh faster so the map moves like a live app.
const LIVE_POLL_MS = 5000;

const time = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';

/** What to tell the customer at each stage. */
const HEADLINE: Record<string, { title: string; detail: (t: OrderTracking) => string }> = {
  pending: { title: 'Order placed', detail: (t) => `Waiting for ${t.store?.name ?? 'the store'} to confirm your order.` },
  preparing: { title: 'Being prepared', detail: (t) => `${t.store?.name ?? 'The store'} is getting your order ready.` },
  ready: { title: 'Ready for pickup', detail: () => 'Your order is packed. We’re assigning a rider.' },
  accepted: { title: 'Rider on the way to the store', detail: (t) => `${t.rider?.firstName ?? 'Your rider'} is heading to pick up your order.` },
  picked_up: { title: 'On its way to you', detail: (t) => `${t.rider?.firstName ?? 'Your rider'} has your order.` },
  in_transit: { title: 'On its way to you', detail: (t) => `${t.rider?.firstName ?? 'Your rider'} has your order.` },
  delivered: { title: 'Delivered', detail: () => 'Enjoy! Thanks for ordering with Nightcrawlers.' },
  cancelled: { title: 'Order cancelled', detail: () => 'This order was cancelled. If you paid online, contact support about a refund.' },
};

const OrderTrackingPage: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<OrderTracking | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const t = await getOrderTracking(id);
      setData(t);
      setError('');
      setUpdatedAt(new Date());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate('/signin');
        return;
      }
      setError(toErrorMessage(err, "Couldn't load this order."));
    } finally {
      setRefreshing(false);
    }
  }, [id, navigate]);

  // Refresh every 15s while the order is active and the tab is visible.
  const active = !data || !['delivered', 'cancelled'].includes(data.status);
  const live = Boolean(data?.trip);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!active) return;
    const tick = () => {
      if (document.visibilityState === 'visible') load();
    };
    timer.current = window.setInterval(tick, live ? LIVE_POLL_MS : POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer.current);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [active, live, load]);

  if (!data) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-poppins">
        <Header />
        <main className="flex-grow flex items-center justify-center p-6 text-center">
          {error ? (
            <div>
              <p className="text-[#222222] font-semibold mb-2">{error}</p>
              <Link to="/user-profile" className="text-[#E00B0B] text-sm font-medium hover:underline">Back to my orders</Link>
            </div>
          ) : (
            <Loader2 className="animate-spin text-[#E00B0B]" />
          )}
        </main>
        <Footer />
      </div>
    );
  }

  const cancelled = data.status === 'cancelled';
  const head = HEADLINE[data.status] ?? HEADLINE.pending;
  const steps = [
    { key: 'placed', label: 'Order placed', at: data.steps.placed, icon: <CheckCircle2 size={18} /> },
    { key: 'confirmed', label: 'Store preparing your order', at: data.steps.confirmed, icon: <Store size={18} /> },
    { key: 'ready', label: 'Ready for pickup', at: data.steps.ready, icon: <CheckCircle2 size={18} /> },
    { key: 'pickedUp', label: 'Rider picked it up', at: data.steps.pickedUp, icon: <Bike size={18} /> },
    { key: 'delivered', label: 'Delivered', at: data.steps.delivered, icon: <MapPin size={18} /> },
  ];
  const currentIndex = steps.reduce((acc, s, i) => (s.at ? i : acc), 0);

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-poppins">
      <Header />
      <main className="flex-grow w-full max-w-[640px] mx-auto px-4 py-8 space-y-4">
        <Link to="/user-profile" className="text-sm text-[#667085] hover:text-[#E00B0B]">← My orders</Link>

        {/* Status + arrival window */}
        <section className={`rounded-2xl p-6 text-white shadow-lg ${cancelled ? 'bg-gray-700' : data.status === 'delivered' ? 'bg-green-600' : 'bg-gradient-to-br from-[#E00B0B] to-[#9E0808]'}`}>
          <p className="text-xs uppercase tracking-wider text-white/70 mb-1">Order #{data.id.slice(-6).toUpperCase()}</p>
          <h1 className="text-2xl font-bold">{head.title}</h1>
          <p className="text-white/85 text-sm mt-1">{head.detail(data)}</p>
          {data.eta && (
            <div className="mt-5 flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
              <Clock size={20} />
              <div>
                <p className="text-xs text-white/70">Estimated arrival</p>
                <p className="text-lg font-semibold">{time(data.eta.earliest)} – {time(data.eta.latest)}</p>
              </div>
            </div>
          )}
          {data.status === 'delivered' && data.steps.delivered && (
            <p className="mt-4 text-sm">Delivered at {time(data.steps.delivered)}</p>
          )}
        </section>

        {/* Live trip: road route, rider position, time and distance left */}
        {data.trip && !cancelled && data.status !== 'delivered' && (
          <section className="bg-white border border-gray-100 rounded-2xl p-3 space-y-3">
            <div className="flex items-center justify-between px-2 pt-1">
              <p className="text-sm font-semibold text-[#222222]">
                {data.trip.arrived && data.trip.destination === 'customer'
                  ? 'Your rider has arrived'
                  : data.trip.destination === 'store'
                    ? `Rider is ${data.trip.durationMin} min from the store`
                    : `${data.trip.durationMin} min away`}
              </p>
              <p className="text-xs text-[#667085]">{data.trip.distanceKm} km</p>
            </div>
            <TripMap
              line={data.trip.line}
              rider={data.trip.riderLocation}
              destination={data.trip.destination === 'store' ? data.pickupPoint : data.deliveryPoint}
              destinationKind={data.trip.destination}
              height={240}
            />
          </section>
        )}

        {/* Rider */}
        {data.rider && !cancelled && data.status !== 'delivered' && (
          <section className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4">
            <span className="w-12 h-12 rounded-full bg-[#FFF5F5] text-[#E00B0B] flex items-center justify-center font-bold text-lg">
              {data.rider.firstName.charAt(0)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#222222]">{data.rider.firstName}</p>
              <p className="text-xs text-[#667085]">
                {data.rider.vehicleType}
                {data.rider.distanceKm != null && ` · about ${data.rider.distanceKm} km away`}
              </p>
            </div>
            {data.rider.phoneNumber && (
              <a
                href={`tel:${data.rider.phoneNumber}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E00B0B] text-white text-sm font-semibold hover:bg-[#B80909]"
              >
                <Phone size={16} /> Call
              </a>
            )}
          </section>
        )}

        {/* Timeline */}
        <section className="bg-white border border-gray-100 rounded-2xl p-5">
          {cancelled ? (
            <p className="flex items-center gap-2 text-sm text-gray-700">
              <XCircle size={18} className="text-gray-500" /> Cancelled at {time(data.steps.cancelled)}
            </p>
          ) : (
            <ol className="space-y-4">
              {steps.map((s, i) => {
                const done = Boolean(s.at);
                const current = i === currentIndex && data.status !== 'delivered';
                return (
                  <li key={s.key} className="flex items-start gap-3">
                    <span className={`mt-0.5 ${done ? 'text-green-600' : 'text-gray-300'}`}>
                      {done ? s.icon : <Circle size={18} />}
                    </span>
                    <div className="flex-1">
                      <p className={`text-sm ${done ? 'text-[#222222] font-medium' : 'text-gray-400'}`}>{s.label}</p>
                      {s.at && <p className="text-xs text-[#667085]">{time(s.at)}</p>}
                    </div>
                    {current && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#E00B0B] bg-[#FFF5F5] px-2 py-0.5 rounded-full">
                        Now
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* Order details */}
        <section className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-[#667085]">From</span>
            <span className="font-medium text-[#222222] text-right">{data.store?.name}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#667085] shrink-0">Deliver to</span>
            <span className="font-medium text-[#222222] text-right">{data.deliveryAddress}</span>
          </div>
          <div className="border-t border-gray-100 pt-3 space-y-1.5">
            {data.items.map((i, idx) => (
              <div key={idx} className="flex justify-between text-[#344054]">
                <span>{i.quantity} × {i.name}</span>
                <span>₦{(i.price * i.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3 space-y-1 text-[#667085]">
            <div className="flex justify-between"><span>Delivery</span><span>₦{data.deliveryFee.toLocaleString()}</span></div>
            {data.serviceFee > 0 && <div className="flex justify-between"><span>Service fee</span><span>₦{data.serviceFee.toLocaleString()}</span></div>}
            {data.discount > 0 && <div className="flex justify-between text-green-700"><span>Discount</span><span>− ₦{data.discount.toLocaleString()}</span></div>}
            <div className="flex justify-between font-semibold text-[#222222] pt-1"><span>Total</span><span>₦{data.total.toLocaleString()}</span></div>
            <p className="text-xs pt-1">
              {data.paymentMethod === 'online'
                ? data.paymentStatus === 'paid' ? 'Paid online' : 'Online payment not completed'
                : formatPaymentMethod(data.paymentMethod)}
            </p>
          </div>
        </section>

        {active && (
          <p className="flex items-center justify-center gap-2 text-xs text-[#98A2B3]">
            {refreshing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Updates automatically{updatedAt && ` · last checked ${updatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default OrderTrackingPage;
