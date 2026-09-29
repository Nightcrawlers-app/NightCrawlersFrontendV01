import React, { useState } from 'react';
import { Cake, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Birthday (day + month, no year). Set once; after that it's shown read-only
 * — corrections go through support, so it can't be changed to collect extra
 * birthday codes.
 */
const BirthdayField: React.FC = () => {
    const { user, updateProfile } = useAuth();
    const toast = useToast();
    const [day, setDay] = useState('');
    const [month, setMonth] = useState('');
    const [saving, setSaving] = useState(false);
    if (!user) return null;

    const saved = user.birthday;
    const maxDay = month ? DAYS_IN[Number(month) - 1] : 31;

    const save = async () => {
        if (!day || !month) return;
        if (!window.confirm(`Save your birthday as ${Number(day)} ${MONTHS[Number(month) - 1]}? You won't be able to change it yourself later.`)) return;
        setSaving(true);
        const error = await updateProfile({ birthday: { day: Number(day), month: Number(month) } });
        setSaving(false);
        if (error) toast.error(error, { id: 'birthday' });
        else toast.success("Birthday saved. Look out for a treat on the day! 🎂", { id: 'birthday' });
    };

    return (
        <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider" htmlFor={saved ? undefined : 'birthday-day'}>
                Birthday
            </label>
            {saved ? (
                <div className="p-3 bg-gray-50/80 rounded-lg text-sm flex items-center gap-2 border border-gray-100">
                    <Cake size={15} className="text-gray-400" />
                    <span className="text-gray-900">{saved.day} {MONTHS[saved.month - 1]}</span>
                    <span className="ml-auto text-[11px] text-gray-400">Wrong? Contact us to correct it.</span>
                </div>
            ) : (
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        id="birthday-day"
                        aria-label="Day"
                        value={day}
                        onChange={(e) => setDay(e.target.value)}
                        className="p-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#E00B0B]"
                    >
                        <option value="">Day</option>
                        {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select
                        aria-label="Month"
                        value={month}
                        onChange={(e) => {
                            setMonth(e.target.value);
                            if (day && Number(day) > DAYS_IN[Number(e.target.value) - 1]) setDay('');
                        }}
                        className="p-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#E00B0B]"
                    >
                        <option value="">Month</option>
                        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                    <button
                        type="button"
                        onClick={save}
                        disabled={!day || !month || saving}
                        className="inline-flex items-center gap-1.5 px-4 py-3 rounded-lg bg-[#E00B0B] text-white text-sm font-semibold hover:bg-[#B80909] disabled:opacity-50"
                    >
                        {saving && <Loader2 size={14} className="animate-spin" />} Save
                    </button>
                    <p className="basis-full text-[11px] text-gray-400">Add it to get a birthday treat from us. We don't ask for the year.</p>
                </div>
            )}
        </div>
    );
};

export default BirthdayField;
