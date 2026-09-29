import React, { useEffect, useState } from 'react';
import { X, Loader2, RotateCcw, CheckCircle2, Wallet } from 'lucide-react';
import { getRefunds, retryRefund, markRefundedManually, toErrorMessage } from '../../services/api';
import type { RefundRow, RefundStatus } from '../../types/models';

type Tab = 'attention' | 'pending' | 'done' | 'all';
const TABS: { value: Tab; label: string }[] = [
    { value: 'attention', label: 'Needs you' },
    { value: 'pending', label: 'In progress' },
    { value: 'done', label: 'Refunded' },
    { value: 'all', label: 'All' },
];

const BADGE: Record<RefundStatus, { label: string; cls: string }> = {
    none: { label: '—', cls: 'bg-gray-100 text-gray-600' },
    requesting: { label: 'Asking Paystack', cls: 'bg-blue-50 text-blue-700' },
    pending: { label: 'Processing', cls: 'bg-blue-50 text-blue-700' },
    processed: { label: 'Refunded', cls: 'bg-green-50 text-green-700' },
    manual: { label: 'Refunded by hand', cls: 'bg-green-50 text-green-700' },
    failed: { label: 'Failed', cls: 'bg-red-50 text-red-700' },
};

const when = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

/**
 * Refunds for cancelled online orders. They happen automatically; this screen
 * is for the ones Paystack refused or that got stuck, so no customer is left
 * out of pocket.
 */
const RefundsManager: React.FC<{ onClose: () => void; onCountChange?: (n: number) => void }> = ({ onClose, onCountChange }) => {
    const [tab, setTab] = useState<Tab>('attention');
    const [rows, setRows] = useState<RefundRow[] | null>(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState<string | null>(null);
    const [manualFor, setManualFor] = useState<RefundRow | null>(null);
    const [note, setNote] = useState('');

    const load = async (t: Tab = tab) => {
        setRows(null);
        setError('');
        try {
            const r = await getRefunds(t);
            setRows(r.orders);
            onCountChange?.(r.attention);
        } catch (e) {
            setError(toErrorMessage(e, "Couldn't load refunds."));
            setRows([]);
        }
    };
    useEffect(() => {
        load(tab);
    }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

    const retry = async (r: RefundRow) => {
        setBusy(r.id);
        setError('');
        try {
            await retryRefund(r.id);
            await load();
        } catch (e) {
            setError(toErrorMessage(e, "Couldn't retry the refund."));
        } finally {
            setBusy(null);
        }
    };

    const saveManual = async () => {
        if (!manualFor || !note.trim()) return;
        setBusy(manualFor.id);
        try {
            await markRefundedManually(manualFor.id, note.trim());
            setManualFor(null);
            setNote('');
            await load();
        } catch (e) {
            setError(toErrorMessage(e, "Couldn't save."));
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div role="dialog" aria-modal="true" aria-labelledby="refunds-title" className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[760px] max-h-[90vh] flex flex-col overflow-hidden font-poppins">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <Wallet size={18} className="text-[#E00B0B]" />
                        <h2 id="refunds-title" className="text-lg font-bold text-gray-900">Refunds</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Close"><X size={20} /></button>
                </div>

                <div className="px-6 pt-4">
                    <p className="text-sm text-gray-500 mb-3">
                        Paid online orders are refunded automatically when they're cancelled. Anything Paystack refused shows under "Needs you".
                    </p>
                    <div className="flex gap-1 border-b border-gray-100" role="tablist">
                        {TABS.map((t) => (
                            <button
                                key={t.value}
                                role="tab"
                                aria-selected={tab === t.value}
                                onClick={() => setTab(t.value)}
                                className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px ${tab === t.value ? 'border-[#E00B0B] text-[#E00B0B]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {error && <p className="mb-4 text-sm text-[#991B1B] bg-[#FEECEC] rounded-lg px-3 py-2">{error}</p>}
                    {!rows ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#E00B0B]" /></div>
                    ) : rows.length === 0 ? (
                        <div className="text-center py-10">
                            <CheckCircle2 className="mx-auto text-green-500 mb-2" />
                            <p className="text-sm text-gray-500">{tab === 'attention' ? 'Nothing needs you. Every refund has gone through or is on its way.' : 'Nothing here.'}</p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {rows.map((r) => (
                                <li key={r.id} className="border border-gray-100 rounded-xl p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900">
                                                ₦{(r.refundAmount || r.totalPaid).toLocaleString()} · {r.customerName}
                                                <span className="font-normal text-gray-500"> · {r.customerPhone}</span>
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {r.storeName} · order #{r.id.slice(-6).toUpperCase()} · cancelled {when(r.cancelledAt)}
                                                {r.cancelledBy ? ` by ${r.cancelledBy === 'system' ? 'timer' : r.cancelledBy}` : ''}
                                            </p>
                                            {r.cancelReason && <p className="text-xs text-gray-500 mt-0.5">Reason: {r.cancelReason}</p>}
                                            {r.refundError && <p className="text-xs text-[#B42318] mt-1">Paystack: {r.refundError.replace(/^Paystack:\s*/, '')}</p>}
                                            {r.refundStatus === 'manual' && r.refundNote && <p className="text-xs text-gray-600 mt-1">Note: {r.refundNote}</p>}
                                            {r.paystackReference && <p className="text-[11px] text-gray-400 mt-1 font-mono">Paystack ref {r.paystackReference}</p>}
                                        </div>
                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${BADGE[r.refundStatus]?.cls}`}>{BADGE[r.refundStatus]?.label}</span>
                                    </div>
                                    {!['processed', 'manual'].includes(r.refundStatus) && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <button
                                                onClick={() => retry(r)}
                                                disabled={busy === r.id}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E00B0B] text-white text-xs font-semibold hover:bg-[#B80909] disabled:opacity-60"
                                            >
                                                {busy === r.id ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />} Try Paystack again
                                            </button>
                                            <button
                                                onClick={() => (setManualFor(r), setNote(''))}
                                                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                            >
                                                I refunded it myself
                                            </button>
                                        </div>
                                    )}
                                    {manualFor?.id === r.id && (
                                        <div className="mt-3 space-y-2">
                                            <label htmlFor={`note-${r.id}`} className="block text-[11px] font-semibold text-gray-500">How was it refunded?</label>
                                            <input
                                                id={`note-${r.id}`}
                                                value={note}
                                                onChange={(e) => setNote(e.target.value)}
                                                placeholder="e.g. Bank transfer from GTB, ref 00123"
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#E00B0B]"
                                            />
                                            <div className="flex gap-2">
                                                <button onClick={saveManual} disabled={!note.trim() || busy === r.id} className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-semibold disabled:opacity-50">Save</button>
                                                <button onClick={() => setManualFor(null)} className="px-3 py-1.5 text-xs font-semibold text-gray-600">Cancel</button>
                                            </div>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RefundsManager;
