import React, { useEffect, useState } from 'react';

/** Seconds left until `deadline` (never negative). Re-renders every second. */
export function useSecondsLeft(deadline: string | Date | null | undefined): number | null {
    const target = deadline ? new Date(deadline).getTime() : null;
    const calc = () => (target === null ? null : Math.max(0, Math.round((target - Date.now()) / 1000)));
    const [left, setLeft] = useState(calc);
    useEffect(() => {
        setLeft(calc());
        if (target === null) return;
        const t = window.setInterval(() => setLeft(calc()), 1000);
        return () => window.clearInterval(t);
    }, [target]); // eslint-disable-line react-hooks/exhaustive-deps
    return left;
}

export const formatLeft = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/**
 * "4:32" counting down to a deadline. `urgentBelow` (seconds) turns it red.
 * Screen readers get a calm "about 5 minutes left" instead of every tick.
 */
const Countdown: React.FC<{ deadline: string | Date; urgentBelow?: number; className?: string }> = ({ deadline, urgentBelow = 120, className = '' }) => {
    const left = useSecondsLeft(deadline);
    if (left === null) return null;
    const minutes = Math.max(1, Math.ceil(left / 60));
    return (
        <span className={`tabular-nums font-bold ${left <= urgentBelow ? 'text-[#B42318]' : ''} ${className}`}>
            <span aria-hidden>{formatLeft(left)}</span>
            <span className="sr-only">{left === 0 ? 'time is up' : `about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} left`}</span>
        </span>
    );
};

export default Countdown;
