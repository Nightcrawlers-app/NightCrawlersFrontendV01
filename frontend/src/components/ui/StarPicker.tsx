import React, { useState } from 'react';
import { Star } from 'lucide-react';

const WORDS = ['', 'Poor', 'Not great', 'Okay', 'Good', 'Excellent'];

/** Tap 1–5 stars. Keyboard: arrow keys, like a radio group. */
const StarPicker: React.FC<{ label: string; value: number; onChange: (n: number) => void }> = ({ label, value, onChange }) => {
    const [hover, setHover] = useState(0);
    const shown = hover || value;
    return (
        <div>
            <p className="text-sm font-medium text-[#222222] mb-1.5" id={`${label}-label`}>{label}</p>
            <div className="flex items-center gap-1" role="radiogroup" aria-labelledby={`${label}-label`} onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((n) => (
                    <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={value === n}
                        aria-label={`${n} star${n === 1 ? '' : 's'}: ${WORDS[n]}`}
                        tabIndex={value === n || (!value && n === 1) ? 0 : -1}
                        onClick={() => onChange(n)}
                        onMouseEnter={() => setHover(n)}
                        onKeyDown={(e) => {
                            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(Math.min(5, (value || 0) + 1));
                            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(Math.max(1, (value || 2) - 1));
                        }}
                        className="p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E00B0B]"
                    >
                        <Star size={30} className={n <= shown ? 'fill-[#F5B301] text-[#F5B301]' : 'text-gray-300'} />
                    </button>
                ))}
                <span className="ml-2 text-xs text-[#667085] w-20">{WORDS[shown]}</span>
            </div>
        </div>
    );
};

export default StarPicker;
