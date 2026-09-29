import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import type { ThemeChoice } from '../../context/ThemeContext';

/** Round sun/moon button for the header. */
export const ThemeToggleButton: React.FC<{ className?: string }> = ({ className = '' }) => {
    const { resolved, toggle } = useTheme();
    const dark = resolved === 'dark';
    return (
        <button
            type="button"
            onClick={toggle}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={dark ? 'Light mode' : 'Dark mode'}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E00B0B] ${className}`}
        >
            {dark ? <Sun size={19} /> : <Moon size={19} />}
        </button>
    );
};

/** Light / Dark / Automatic picker, for the mobile menu and settings. */
export const ThemePicker: React.FC<{ className?: string }> = ({ className = '' }) => {
    const { choice, setChoice } = useTheme();
    const options: { value: ThemeChoice; label: string; icon: React.ReactNode }[] = [
        { value: 'light', label: 'Light', icon: <Sun size={14} /> },
        { value: 'dark', label: 'Dark', icon: <Moon size={14} /> },
        { value: 'system', label: 'Auto', icon: <Monitor size={14} /> },
    ];
    return (
        <div role="radiogroup" aria-label="Theme" className={`grid grid-cols-3 gap-1 p-1 rounded-xl bg-gray-100 ${className}`}>
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={choice === o.value}
                    onClick={() => setChoice(o.value)}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${choice === o.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    {o.icon}
                    {o.label}
                </button>
            ))}
        </div>
    );
};
