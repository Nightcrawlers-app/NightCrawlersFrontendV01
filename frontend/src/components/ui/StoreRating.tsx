import React from 'react';
import { Star } from 'lucide-react';

/** "★ 4.3 (27)" — or "New" until a store has enough ratings to be fair. */
const StoreRating: React.FC<{ rating?: { average: number | null; count: number }; className?: string }> = ({ rating, className = '' }) => {
    if (!rating || rating.average === null) {
        return <span className={`text-[11px] sm:text-[12px] font-medium text-[#667085] ${className}`}>New</span>;
    }
    return (
        <span className={`inline-flex items-center gap-[3px] text-[11px] sm:text-[12px] font-medium text-[#222222] ${className}`} aria-label={`Rated ${rating.average} out of 5 from ${rating.count} ratings`}>
            <Star size={12} className="fill-[#F5B301] text-[#F5B301]" aria-hidden />
            {rating.average.toFixed(1)}
            <span className="text-[#98A2B3] font-normal" aria-hidden>({rating.count})</span>
        </span>
    );
};

/** "25–40 min" from a store's delivery estimate. */
export const etaLabel = (eta?: { min: number; max: number }) => (eta ? `${eta.min}–${eta.max} min` : '');

export default StoreRating;
