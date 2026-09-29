import React, { useEffect, useState } from 'react';
import { X, Loader2, BellRing, Phone, MapPin, CheckCircle2 } from 'lucide-react';
import { getOpsAlerts, resolveOpsAlert, adminCancelOrder, toErrorMessage } from '../../services/api';
import type { OpsAlert } from '../../types/models';

const TITLE: Record<OpsAlert['type'], string> = {
    prep_very_late: 'Store very late preparing',
    no_rider_admin: 'No rider has taken a ready order',
    delivery_stalled: 'Delivery may be stalled',
    cancelled_after_ready: 'Cancelled after the food was made',
};

const ADVICE: Record<OpsAlert['type'], string> = {
    prep_very_late: 'Call the store. If they can’t make it, cancel the order; paid orders are refunded automatically.',
    no_rider_admin: 'Call riders you know are out tonight. The customer will be offered to cancel after 20 minutes.',
    delivery_stalled: 'Call the rider first, then the customer. If you can’t reach the rider, treat it as a safety concern.',
    cancelled_after_ready: 'The customer was refunded. Decide whether to pay the vendor for the food they made.',
};

const ago = (iso: string) => {
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ${m % 60} min ago`;
};

/** Orders the team should look at right now (late prep, no rider, stalled delivery). */
const AlertsManager: React.FC<{ onClose: () => void; onCountChange?: (n: number) => void }> = ({ onClose, onCountChange }) => {
    const [alerts, setAlerts] = useState<OpsAlert[] | null>(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState<string | null>(null);

    const load = async () => {
        try {
            const r = await getOpsAlerts();
            setAlerts(r.alerts);
            onCountChange?.(r.open);
            setError('');
        } catch (e) {
            setError(toErrorMessage(e, "Couldn't load alerts."));
            setAlerts((a) => a ?? []);
        }
    };
    useEffect(() => {
        load();
        const t = window.setInterval(load, 30000);
        return () => window.clearInterval(t);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const resolve = async (a: OpsAlert) => {
        setBusy(`${a.orderId}:${a.type}`);
        try {
            await resolveOpsAlert(a.orderId, a.type);
            await load();
        } catch (e) {
            setError(toErrorMessage(e, "Couldn't update."));
        } finally {
            setBusy(null);
        }
    };

    const cancelOrder = async (a: OpsAlert) => {
        if (!window.confirm(`Cancel this ${a.storeName} order?${a.paymentMethod === 'online' ? ' The customer will be refunded automatically.' : ''}`)) return;
        setBusy(`${a.orderId}:${a.type}`);
        try {
            await adminCancelOrder(a.orderId, 'Sorry, we cancelled your order because it was running very late.');
            await resolveOpsAlert(a.orderId, a.type, 'Cancelled by admin').catch(() => undefined);
            await load();
        } catch (e) {
            setError(toErrorMessage(e, "Couldn't cancel the order."));
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div role="dialog" aria-modal="true" aria-labelledby="alerts-title" className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[760px] max-h-[90vh] flex flex-col overflow-hidden font-poppins">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <BellRing size={18} className="text-[#E00B0B]" />
                        <h2 id="alerts-title" className="text-lg font-bold text-gray-900">Orders running late</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Close"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {error && <p className="mb-4 text-sm text-[#991B1B] bg-[#FEECEC] rounded-lg px-3 py-2">{error}</p>}
                    {!alerts ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#E00B0B]" /></div>
                    ) : alerts.length === 0 ? (
                        <div className="text-center py-10">
                            <CheckCircle2 className="mx-auto text-green-500 mb-2" />
                            <p className="text-sm text-gray-500">Nothing running late. This list refreshes every 30 seconds.</p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {alerts.map((a) => {
                                const key = `${a.orderId}:${a.type}`;
                                const loc = a.rider?.lastLocation;
                                return (
                                    <li key={key} className={`rounded-xl border p-4 ${a.stillHappening ? 'border-red-200 bg-[#FFF8F8]' : 'border-gray-100 bg-white opacity-80'}`}>
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-gray-900">{TITLE[a.type]}</p>
                                                <p className="text-xs text-gray-600">
                                                    {a.storeName} · order #{a.orderId.slice(-6).toUpperCase()} · ₦{a.total.toLocaleString()} · {ago(a.at)}
                                                </p>
                                                <p className="text-xs text-gray-600 mt-0.5">{a.message}</p>
                                            </div>
                                            {!a.stillHappening && (
                                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                                                    Sorted itself · now {a.status.replace('_', ' ')}
                                                </span>
                                            )}
                                        </div>

                                        {a.stillHappening && <p className="text-xs text-gray-500 mt-2">{ADVICE[a.type]}</p>}

                                        {/* Who to call */}
                                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                            {a.rider?.phone && (
                                                <a href={`tel:${a.rider.phone}`} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-[#E00B0B]">
                                                    <Phone size={12} /> Rider {a.rider.name}
                                                </a>
                                            )}
                                            {a.vendorPhone && (
                                                <a href={`tel:${a.vendorPhone}`} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-[#E00B0B]">
                                                    <Phone size={12} /> {a.storeName}
                                                </a>
                                            )}
                                            <a href={`tel:${a.customerPhone}`} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-[#E00B0B]">
                                                <Phone size={12} /> Customer {a.customerName}
                                            </a>
                                            {loc && (
                                                <a
                                                    href={`https://maps.google.com/?q=${loc.latitude},${loc.longitude}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-[#E00B0B]"
                                                >
                                                    <MapPin size={12} /> Rider's last location{loc.at ? ` (${ago(loc.at)})` : ''}
                                                </a>
                                            )}
                                        </div>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <button
                                                onClick={() => resolve(a)}
                                                disabled={busy === key}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-semibold disabled:opacity-60"
                                            >
                                                {busy === key && <Loader2 size={12} className="animate-spin" />}
                                                {a.stillHappening ? 'Mark handled' : 'Dismiss'}
                                            </button>
                                            {a.stillHappening && ['prep_very_late', 'no_rider_admin'].includes(a.type) && (
                                                <button
                                                    onClick={() => cancelOrder(a)}
                                                    disabled={busy === key}
                                                    className="px-3 py-1.5 rounded-lg border border-red-200 text-[#E00B0B] text-xs font-semibold hover:bg-red-50 disabled:opacity-60"
                                                >
                                                    Cancel order{a.paymentMethod === 'online' ? ' & refund' : ''}
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AlertsManager;
