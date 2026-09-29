import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { Transaction } from '../../types/models';

/** Orders still on their way, newest first. */
export const ACTIVE_STATUSES = ['pending', 'preparing', 'ready', 'accepted', 'picked_up', 'in_transit'] as const;

const TWO_HOURS = 2 * 60 * 60 * 1000;

export const activeOrdersOf = (transactions: Transaction[]): Transaction[] =>
    transactions.filter((t) => {
        const active = t.rawStatus
            ? (ACTIVE_STATUSES as readonly string[]).includes(t.rawStatus)
            : t.status === 'preparing' || t.status === 'in-transit';
        // An online order left unpaid for hours was abandoned, not "current".
        if (active && t.awaitingPayment && Date.now() - new Date(t.date).getTime() > TWO_HOURS) return false;
        return active;
    });

// Where the order is, in the customer's words. The dots fill as it moves.
const STAGE: Record<string, { label: string; step: number }> = {
    pending: { label: 'Waiting for the store to accept', step: 1 },
    preparing: { label: 'Being prepared', step: 2 },
    ready: { label: 'Ready — finding a rider', step: 2 },
    accepted: { label: 'Rider heading to the store', step: 3 },
    picked_up: { label: 'Picked up — on the way to you', step: 4 },
    in_transit: { label: 'On the way to you', step: 4 },
};

/**
 * "Current orders" on the profile dashboard. Refreshes every 30 seconds while
 * something is on its way (and the tab is visible), so the status stays live.
 */
const CurrentOrders: React.FC<{ orders: Transaction[] }> = ({ orders }) => {
    const { reloadTransactions } = useAuth();

    useEffect(() => {
        if (!orders.length) return;
        const timer = window.setInterval(() => {
            if (document.visibilityState === 'visible') reloadTransactions();
        }, 30_000);
        return () => window.clearInterval(timer);
    }, [orders.length, reloadTransactions]);

    if (!orders.length) return null;

    return (
        <div id="current-orders" className="bg-white rounded-2xl shadow-sm border-2 border-[#E00B0B]/20 p-6 scroll-mt-28">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5" aria-hidden>
                        <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E00B0B] opacity-60" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#E00B0B]" />
                    </span>
                    {orders.length === 1 ? 'Your current order' : `Your ${orders.length} current orders`}
                </h2>
            </div>
            <ul className="space-y-3">
                {orders.map((o) => {
                    const stage = o.awaitingPayment
                        ? { label: 'Waiting for your payment', step: 0 }
                        : STAGE[o.rawStatus ?? ''] ?? { label: 'In progress', step: 2 };
                    return (
                        <li key={o.id}>
                            <Link
                                to={`/orders/${o.id}`}
                                className="group flex items-center gap-4 p-4 rounded-xl bg-[#FFF8F8] border border-[#FDE2E2] hover:border-[#E00B0B] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E00B0B]"
                            >
                                <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                                    <Package size={20} className="text-[#E00B0B]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{o.vendorName}</p>
                                    <p className="text-xs text-[#B42318] font-medium">{stage.label}</p>
                                    <div className="mt-2 flex gap-1" aria-label={`Step ${stage.step} of 4`}>
                                        {[1, 2, 3, 4].map((s) => (
                                            <span key={s} className={`h-1 flex-1 rounded-full ${s <= stage.step ? 'bg-[#E00B0B]' : 'bg-[#F2D4D4]'}`} />
                                        ))}
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-sm font-bold text-gray-900">₦{o.total.toLocaleString()}</p>
                                    <p className="text-xs font-semibold text-[#E00B0B] inline-flex items-center gap-0.5">
                                        Track <ChevronRight size={12} />
                                    </p>
                                </div>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default CurrentOrders;
