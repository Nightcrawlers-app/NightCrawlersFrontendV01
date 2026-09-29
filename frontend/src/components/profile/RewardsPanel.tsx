import React, { useCallback, useEffect, useState } from 'react';
import { Copy, Gift, Loader2, Share2, Star, Ticket, Truck, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getMyRewards, getMyCodes, redeemPoints, describeDiscount, toErrorMessage } from '../../services/api';
import type { RewardsSummary, MyCode } from '../../services/api';

/** Points, delivery credit, free deliveries and the customer's referral code. */
const RewardsPanel: React.FC = () => {
    const { refreshUser } = useAuth();
    const toast = useToast();
    const [data, setData] = useState<RewardsSummary | null>(null);
    const [error, setError] = useState('');
    const [redeeming, setRedeeming] = useState(false);
    const [codes, setCodes] = useState<MyCode[]>([]);
    const navigate = useNavigate();

    // Codes tied to this account (personal codes and codes set up for them)
    useEffect(() => {
        getMyCodes().then(setCodes).catch(() => setCodes([]));
    }, []);

    const load = useCallback(() => {
        getMyRewards()
            .then((d) => (setData(d), setError('')))
            .catch((e) => setError(toErrorMessage(e, "Couldn't load your rewards.")));
    }, []);
    useEffect(load, [load]);

    if (error) return <p className="text-sm text-[#B42318] bg-white rounded-2xl border border-gray-100 p-6">{error}</p>;
    if (!data) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 flex justify-center">
                <Loader2 className="animate-spin text-[#E00B0B]" />
            </div>
        );
    }

    const { rules } = data;
    const blocks = Math.floor(data.points / rules.redeemBlock);
    const toNext = rules.redeemBlock - (data.points % rules.redeemBlock);
    const referrerReward =
        rules.referralReward === 'credit' ? `₦${rules.referralCreditAmount.toLocaleString()} delivery credit` : 'a free delivery';
    const friendReward = rules.newUserFreeDeliveries === 1 ? 'a free delivery' : `${rules.newUserFreeDeliveries} free deliveries`;
    const shareText = `Late-night food, groceries and drinks in Abuja. Join Nightcrawlers with my code ${data.referralCode} and get ${friendReward}: ${data.referralLink}`;

    const redeem = async () => {
        setRedeeming(true);
        try {
            const res = await redeemPoints();
            toast.success(res.message, { id: 'rewards' });
            load();
            refreshUser();
        } catch (e) {
            toast.error(toErrorMessage(e, "Couldn't redeem your points."), { id: 'rewards' });
        } finally {
            setRedeeming(false);
        }
    };

    const copy = async (text: string, what: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`${what} copied`, { id: 'copy' });
        } catch {
            toast.error("Couldn't copy. Press and hold to copy it instead.", { id: 'copy' });
        }
    };

    const share = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ title: 'Nightcrawlers', text: shareText, url: data.referralLink });
            } catch {
                // They closed the share sheet — nothing to do.
            }
        } else {
            copy(shareText, 'Invite message');
        }
    };

    return (
        <div className="space-y-6">
            {/* Codes tied to this account */}
            {codes.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border-2 border-[#E00B0B]/20 p-6">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Ticket size={18} className="text-[#E00B0B]" /> Your codes
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5 mb-4">These only work on your account. Enter one at checkout, or tap it there to apply.</p>
                    <ul className="space-y-3">
                        {codes.map((c) => (
                            <li key={c.code} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-[#FFF8F8] border border-[#FDE2E2]">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900">{c.kind === 'birthday' ? `🎂 ${c.title}` : c.title}</p>
                                    <p className="text-xs text-gray-600">{describeDiscount(c)}</p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">
                                        {c.kind === 'personal' ? 'One use. ' : ''}
                                        {c.endsAt
                                            ? `Expires ${new Date(c.endsAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}.`
                                            : 'No expiry date.'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => copy(c.code, 'Code')}
                                        aria-label={`Copy code ${c.code}`}
                                        className="flex items-center gap-2 rounded-lg border border-dashed border-[#E00B0B]/50 bg-white px-3 py-2 font-mono text-sm font-bold tracking-wide text-[#E00B0B] hover:border-[#E00B0B]"
                                    >
                                        {c.code} <Copy size={13} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => navigate(c.storeIds.length === 1 ? `/vendor-details?store=${c.storeIds[0]}` : `/explore${c.businessType ? `?category=${encodeURIComponent(c.businessType)}` : ''}`)}
                                        className="px-3 py-2 rounded-lg bg-[#E00B0B] text-white text-xs font-semibold hover:bg-[#B80909]"
                                    >
                                        Order now
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Balances */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-5 border border-gray-100/80 shadow-sm">
                    <Star size={18} className="text-amber-500 mb-3" />
                    <p className="text-2xl font-bold text-gray-900">{data.points.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">Points</p>
                </div>
                <div className="bg-white rounded-xl p-5 border border-gray-100/80 shadow-sm">
                    <Wallet size={18} className="text-emerald-600 mb-3" />
                    <p className="text-2xl font-bold text-gray-900">₦{data.deliveryCredit.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">Delivery credit</p>
                </div>
                <div className="bg-white rounded-xl p-5 border border-gray-100/80 shadow-sm">
                    <Truck size={18} className="text-[#E00B0B] mb-3" />
                    <p className="text-2xl font-bold text-gray-900">{data.freeDeliveries}</p>
                    <p className="text-xs text-gray-400">Free {data.freeDeliveries === 1 ? 'delivery' : 'deliveries'}</p>
                </div>
            </div>

            {/* Points → credit */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6">
                <h2 className="text-lg font-bold text-gray-900">Turn points into delivery credit</h2>
                <p className="text-sm text-gray-500 mt-1">
                    You earn {rules.pointsPer100Naira} point{rules.pointsPer100Naira === 1 ? '' : 's'} for every ₦100 of food once an order is
                    delivered. Every {rules.redeemBlock.toLocaleString()} points becomes ₦{rules.redeemValue.toLocaleString()} off delivery.
                    Credit and free deliveries are used automatically at checkout.
                </p>
                <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
                    <button
                        type="button"
                        onClick={redeem}
                        disabled={blocks < 1 || redeeming}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#E00B0B] text-white text-sm font-semibold hover:bg-[#B80909] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {redeeming && <Loader2 size={15} className="animate-spin" />}
                        {blocks >= 1
                            ? `Redeem ${(blocks * rules.redeemBlock).toLocaleString()} points for ₦${(blocks * rules.redeemValue).toLocaleString()}`
                            : 'Redeem points'}
                    </button>
                    {blocks < 1 && (
                        <p className="text-xs text-gray-400">{toNext.toLocaleString()} more points until you can redeem.</p>
                    )}
                </div>
            </div>

            {/* Referral */}
            <div className="rounded-2xl p-6 bg-[#1A1A1A] text-white">
                <Gift size={22} className="text-[#FF6B6B] mb-3" />
                <h2 className="text-lg font-bold">Invite friends, get {referrerReward}</h2>
                <p className="text-sm text-white/70 mt-1 max-w-prose">
                    Friends who join with your code get {friendReward}. When their first order is delivered, you get {referrerReward}.
                </p>
                <div className="mt-5 flex flex-col sm:flex-row gap-3">
                    <button
                        type="button"
                        onClick={() => copy(data.referralCode, 'Code')}
                        className="flex-1 flex items-center justify-between gap-3 rounded-lg border border-dashed border-white/40 px-4 py-3 hover:border-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        aria-label={`Copy your referral code ${data.referralCode}`}
                    >
                        <span className="text-xl font-bold tracking-[0.15em]">{data.referralCode}</span>
                        <Copy size={16} className="text-white/70" />
                    </button>
                    <button
                        type="button"
                        onClick={share}
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#E00B0B] text-white text-sm font-semibold hover:bg-[#B80909]"
                    >
                        <Share2 size={16} /> Share invite
                    </button>
                </div>
                <p className="text-xs text-white/50 mt-4">
                    {data.referrals === 0
                        ? 'No one has joined with your code yet.'
                        : `${data.referrals} joined with your code; ${data.rewardedReferrals} ${data.rewardedReferrals === 1 ? 'has' : 'have'} earned you a reward so far.`}
                </p>
            </div>
        </div>
    );
};

export default RewardsPanel;
