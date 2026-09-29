import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

/**
 * Light / dark theme.
 *   'system' (default) follows the phone or computer's setting and switches
 *   live when it changes; 'light' / 'dark' are the customer's own choice,
 *   remembered on this device.
 *
 * The class on <html> is also set by a tiny script in index.html before the
 * app loads, so dark-mode users never see a white flash. The colours
 * themselves live in styles/dark.css.
 */
export type ThemeChoice = 'system' | 'light' | 'dark';
const KEY = 'nc_theme';
const LIGHT_BAR = '#E00B0B';
const DARK_BAR = '#0E0E13';

type ThemeApi = {
    choice: ThemeChoice;
    /** What's actually showing right now */
    resolved: 'light' | 'dark';
    setChoice: (c: ThemeChoice) => void;
    /** Light ↔ dark (sets an explicit choice) */
    toggle: () => void;
};

const ThemeContext = createContext<ThemeApi | undefined>(undefined);

const systemPrefersDark = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

const readChoice = (): ThemeChoice => {
    try {
        const v = localStorage.getItem(KEY);
        return v === 'light' || v === 'dark' ? v : 'system';
    } catch {
        return 'system';
    }
};

const apply = (resolved: 'light' | 'dark') => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? DARK_BAR : LIGHT_BAR);
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [choice, setChoiceState] = useState<ThemeChoice>(readChoice);
    const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark);
    const resolved: 'light' | 'dark' = choice === 'system' ? (systemDark ? 'dark' : 'light') : choice;

    // Follow the device setting live while on 'system'
    useEffect(() => {
        const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
        if (!mq) return;
        const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
        mq.addEventListener?.('change', onChange);
        return () => mq.removeEventListener?.('change', onChange);
    }, []);

    useEffect(() => apply(resolved), [resolved]);

    const setChoice = useCallback((c: ThemeChoice) => {
        setChoiceState(c);
        try {
            if (c === 'system') localStorage.removeItem(KEY);
            else localStorage.setItem(KEY, c);
        } catch {
            // storage blocked — works for this visit only
        }
    }, []);

    const toggle = useCallback(() => setChoice(resolved === 'dark' ? 'light' : 'dark'), [resolved, setChoice]);

    return <ThemeContext.Provider value={{ choice, resolved, setChoice, toggle }}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeApi => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
};
