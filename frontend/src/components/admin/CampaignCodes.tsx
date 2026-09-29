import React, { useEffect, useMemo, useState } from 'react';
import { Download, Loader2, Search, Trash2 } from 'lucide-react';
import { getCampaignCodes, issueCampaignCodes, revokeCampaignCode, describeDiscount, toErrorMessage } from '../../services/api';
import type { CampaignCode, CustomerLookup, Promotion } from '../../types/models';
import CustomerPicker from './CustomerPicker';

type Audience = 'customers' | 'emails' | 'inactive' | 'all';

const AUDIENCES: { value: Audience; label: string; hint: string }[] = [
    { value: 'customers', label: 'Customers I pick', hint: 'Search by name, email or phone.' },
    { value: 'emails', label: 'A list of emails', hint: 'Paste emails, one per line or separated by commas.' },
    { value: 'inactive', label: "Customers who haven't ordered lately", hint: 'Includes people who have never ordered.' },
    { value: 'all', label: 'Every customer', hint: 'Every verified customer account.' },
];

const fmt = (iso: string) =>
    new Date(iso).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * Personal codes for one campaign: hand them out, see who used theirs, take
 * back unused ones, download the list.
 */
const CampaignCodes: React.FC<{ promo: Promotion; onChanged?: () => void }> = ({ promo, onChanged }) => {
    const [codes, setCodes] = useState<CampaignCode[] | null>(null);
    const [error, setError] = useState('');
    const [audience, setAudience] = useState<Audience>('customers');
    const [picked, setPicked] = useState<CustomerLookup[]>([]);
    const [emailsText, setEmailsText] = useState('');
    const [days, setDays] = useState('30');
    const [sendEmail, setSendEmail] = useState(true);
    const [issuing, setIssuing] = useState(false);
    const [result, setResult] = useState('');
    const [filter, setFilter] = useState('');

    const load = () =>
        getCampaignCodes(promo.id)
            .then((c) => (setCodes(c), setError('')))
            .catch((e) => setError(toErrorMessage(e, "Couldn't load the codes.")));
    useEffect(() => {
        load();
    }, [promo.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const emails = emailsText.split(/[\s,;]+/).map((e) => e.trim()).filter((e) => e.includes('@'));
    const canIssue =
        (audience === 'customers' && picked.length > 0) ||
        (audience === 'emails' && emails.length > 0) ||
        (audience === 'inactive' && Number(days) >= 1) ||
        audience === 'all';

    const issue = async () => {
        if (!canIssue || issuing) return;
        if (audience === 'all' && !window.confirm('Give every customer their own code for this promo?')) return;
        setIssuing(true);
        setResult('');
        setError('');
        try {
            const input =
                audience === 'customers' ? { audience, customerIds: picked.map((c) => c.id), sendEmail }
                    : audience === 'emails' ? { audience, emails, sendEmail }
                        : audience === 'inactive' ? { audience, days: Number(days), sendEmail }
                            : { audience, sendEmail };
            const r = await issueCampaignCodes(promo.id, input);
            const parts = [
                `${r.created} new ${r.created === 1 ? 'code' : 'codes'} created`,
                r.skipped ? `${r.skipped} already had one` : '',
                r.notFound.length ? `no account for ${r.notFound.join(', ')}` : '',
            ].filter(Boolean);
            setResult(`${parts.join('; ')}.${r.emailing ? ' Emails are being sent now.' : ''}`);
            setPicked([]);
            setEmailsText('');
            await load();
            onChanged?.();
        } catch (e) {
            setError(toErrorMessage(e, "Couldn't create the codes."));
        } finally {
            setIssuing(false);
        }
    };

    const revoke = async (c: CampaignCode) => {
        if (!window.confirm(`Take back ${c.code} from ${c.customer?.name || c.customer?.email || 'this customer'}? It will stop working.`)) return;
        try {
            await revokeCampaignCode(promo.id, c.id);
            setCodes((list) => (list ? list.filter((x) => x.id !== c.id) : list));
            onChanged?.();
        } catch (e) {
            setError(toErrorMessage(e, "Couldn't remove that code."));
        }
    };

    const visible = useMemo(() => {
        const q = filter.trim().toLowerCase();
        if (!codes || !q) return codes ?? [];
        return codes.filter((c) => [c.code, c.customer?.name, c.customer?.email].some((v) => v?.toLowerCase().includes(q)));
    }, [codes, filter]);

    const downloadCsv = () => {
        if (!codes?.length) return;
        const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
        const rows = [
            ['Code', 'Name', 'Email', 'Status', 'Used at', 'Emailed at'],
            ...codes.map((c) => [c.code, c.customer?.name ?? '', c.customer?.email ?? '', c.usedAt ? 'Used' : 'Unused', c.usedAt ?? '', c.emailedAt ?? '']),
        ];
        const blob = new Blob([rows.map((r) => r.map((v) => cell(String(v))).join(',')).join('\n')], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${promo.title.replace(/[^\w-]+/g, '-').toLowerCase()}-codes.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const used = codes?.filter((c) => c.usedAt).length ?? 0;

    return (
        <div className="space-y-6">
            <div>
                <p className="text-sm font-semibold text-gray-900">{promo.title}</p>
                <p className="text-xs text-gray-500">
                    {describeDiscount(promo)}. Each person gets their own code that only works on their account, once.
                    {promo.birthday
                        ? ` 🎂 Sent automatically on each customer's birthday; each code works for ${promo.codeValidDays ?? 7} days.`
                        : promo.endsAt
                            ? ` Codes stop working when the promo ends (${fmt(promo.endsAt)}).`
                            : ' Set an end date on the promo to make codes expire.'}
                </p>
            </div>

            {/* Hand out codes */}
            <fieldset className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-4">
                <legend className="px-1 text-sm font-semibold text-gray-900">Give codes to</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {AUDIENCES.map((a) => (
                        <label
                            key={a.value}
                            className={`flex items-start gap-2 p-3 rounded-lg border bg-white cursor-pointer text-sm ${audience === a.value ? 'border-[#E00B0B]' : 'border-gray-200'}`}
                        >
                            <input type="radio" name="code-audience" className="accent-[#E00B0B] mt-0.5" checked={audience === a.value} onChange={() => setAudience(a.value)} />
                            <span>
                                <span className="block font-medium text-gray-900">{a.label}</span>
                                <span className="block text-[11px] text-gray-500">{a.hint}</span>
                            </span>
                        </label>
                    ))}
                </div>

                {audience === 'customers' && <CustomerPicker selected={picked} onChange={setPicked} />}
                {audience === 'emails' && (
                    <div>
                        <label htmlFor="code-emails" className="block text-[11px] font-semibold text-gray-500 mb-1">Emails</label>
                        <textarea
                            id="code-emails"
                            rows={4}
                            value={emailsText}
                            onChange={(e) => setEmailsText(e.target.value)}
                            placeholder={'ada@example.com\nbola@example.com'}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#E00B0B]"
                        />
                        <p className="text-[11px] text-gray-500 mt-1">{emails.length} {emails.length === 1 ? 'email' : 'emails'} found.</p>
                    </div>
                )}
                {audience === 'inactive' && (
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        No order in the last
                        <input
                            type="number"
                            min={1}
                            max={365}
                            value={days}
                            onChange={(e) => setDays(e.target.value)}
                            className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
                        />
                        days
                    </label>
                )}

                <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" className="accent-[#E00B0B] w-4 h-4" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
                    Email each person their code
                </label>
                <p className="text-[11px] text-gray-500 -mt-2">Either way, codes also appear in each customer's Rewards tab and at checkout.</p>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={issue}
                        disabled={!canIssue || issuing}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E00B0B] text-white text-sm font-semibold hover:bg-[#B80909] disabled:opacity-50"
                    >
                        {issuing && <Loader2 size={14} className="animate-spin" />}
                        Create codes
                    </button>
                    {!promo.isActive && <span className="text-[11px] text-amber-700">This promo is paused, so codes won't work until you resume it.</span>}
                </div>
                {result && <p className="text-sm text-green-800 bg-green-50 rounded-lg px-3 py-2" role="status">{result}</p>}
            </fieldset>

            {error && <p className="text-sm text-[#991B1B] bg-[#FEECEC] rounded-lg px-3 py-2">{error}</p>}

            {/* The codes */}
            <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-gray-900">
                        {codes ? `${codes.length} ${codes.length === 1 ? 'code' : 'codes'}, ${used} used` : 'Codes'}
                    </p>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                placeholder="Find a code or person"
                                aria-label="Find a code or person"
                                className="pl-7 pr-2 py-1.5 border border-gray-200 rounded-lg text-xs w-44"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={downloadCsv}
                            disabled={!codes?.length}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                            <Download size={13} /> CSV
                        </button>
                    </div>
                </div>
                {!codes ? (
                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#E00B0B]" /></div>
                ) : visible.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">{codes.length ? 'No matches.' : 'No codes yet. Create some above.'}</p>
                ) : (
                    <div className="overflow-x-auto border border-gray-100 rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-[11px] text-gray-500 text-left">
                                <tr>
                                    <th className="px-3 py-2 font-semibold">Code</th>
                                    <th className="px-3 py-2 font-semibold">Customer</th>
                                    <th className="px-3 py-2 font-semibold">Status</th>
                                    <th className="px-3 py-2"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {visible.slice(0, 500).map((c) => (
                                    <tr key={c.id}>
                                        <td className="px-3 py-2 font-mono font-semibold tracking-wide text-gray-900">{c.code}</td>
                                        <td className="px-3 py-2">
                                            <span className="block text-gray-900 truncate max-w-[220px]">{c.customer?.name || '(deleted account)'}</span>
                                            <span className="block text-[11px] text-gray-500 truncate max-w-[220px]">{c.customer?.email}</span>
                                        </td>
                                        <td className="px-3 py-2 text-xs">
                                            {c.usedAt ? (
                                                <span className="text-green-700 font-semibold">Used {fmt(c.usedAt)}</span>
                                            ) : c.expiresAt && new Date(c.expiresAt) < new Date() ? (
                                                <span className="text-gray-400">Expired {fmt(c.expiresAt)}</span>
                                            ) : (
                                                <span className="text-gray-600">
                                                    Unused{c.emailedAt ? ', emailed' : ''}{c.expiresAt ? ` · until ${fmt(c.expiresAt)}` : ''}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            {!c.usedAt && (
                                                <button type="button" onClick={() => revoke(c)} className="p-1.5 text-gray-400 hover:text-[#E00B0B]" aria-label={`Take back ${c.code}`}>
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {visible.length > 500 && <p className="px-3 py-2 text-[11px] text-gray-500">Showing 500 of {visible.length}. Download the CSV for all of them.</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CampaignCodes;
