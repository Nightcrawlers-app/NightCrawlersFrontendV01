import React, { useEffect, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { searchCustomersForAdmin, toErrorMessage } from '../../services/api';
import type { CustomerLookup } from '../../types/models';

type Props = {
    selected: CustomerLookup[];
    onChange: (next: CustomerLookup[]) => void;
    /** Visible label for the search box. */
    label?: string;
};

/** Search customers by name, email or phone and pick one or more. */
const CustomerPicker: React.FC<Props> = ({ selected, onChange, label = 'Find customers' }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<CustomerLookup[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) {
            setResults([]);
            setError('');
            return;
        }
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            setLoading(true);
            searchCustomersForAdmin(q, controller.signal)
                .then((r) => (setResults(r), setError('')))
                .catch((e) => !controller.signal.aborted && setError(toErrorMessage(e, "Couldn't search customers.")))
                .finally(() => !controller.signal.aborted && setLoading(false));
        }, 250);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [query]);

    const chosen = new Set(selected.map((c) => c.id));

    return (
        <div>
            <label htmlFor="customer-search" className="block text-[11px] font-semibold text-gray-500 mb-1">{label}</label>
            <div className="border border-gray-200 rounded-lg">
                <div className="relative border-b border-gray-100">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        id="customer-search"
                        className="w-full pl-8 pr-8 py-2 text-sm outline-none rounded-t-lg"
                        placeholder="Name, email or phone"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoComplete="off"
                    />
                    {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
                </div>
                {query.trim().length >= 2 && (
                    <ul className="max-h-40 overflow-y-auto py-1">
                        {results.map((c) => (
                            <li key={c.id}>
                                <label className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="accent-[#E00B0B]"
                                        checked={chosen.has(c.id)}
                                        onChange={(e) => onChange(e.target.checked ? [...selected, c] : selected.filter((x) => x.id !== c.id))}
                                    />
                                    <span className="flex-1 truncate">{c.name || '(no name)'}</span>
                                    <span className="text-[11px] text-gray-400 truncate max-w-[55%]">{c.email}</span>
                                </label>
                            </li>
                        ))}
                        {!loading && !error && results.length === 0 && <li className="px-3 py-2 text-sm text-gray-400">No customers found.</li>}
                        {error && <li className="px-3 py-2 text-sm text-[#991B1B]">{error}</li>}
                    </ul>
                )}
                {selected.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 border-t border-gray-100">
                        {selected.map((c) => (
                            <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-gray-100 pl-2.5 pr-1 py-0.5 text-xs text-gray-700">
                                {c.name || c.email}
                                <button
                                    type="button"
                                    onClick={() => onChange(selected.filter((x) => x.id !== c.id))}
                                    aria-label={`Remove ${c.name || c.email}`}
                                    className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-gray-200"
                                >
                                    <X size={11} />
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerPicker;
