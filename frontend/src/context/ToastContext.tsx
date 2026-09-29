import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { TOAST_EVENT } from '../lib/toastBus';
import type { ToastKind } from '../lib/toastBus';

/**
 * Small pop-up messages ("Added to cart", "Signed in", "Session timed out").
 *
 *   const toast = useToast();
 *   toast.success('Added Jollof Rice to your cart');
 *   toast.error('Wrong email or password', { action: { label: 'Reset password', onClick } });
 *
 * They stack at the bottom on phones and bottom-right on larger screens, go
 * away on their own after a few seconds, and are announced to screen readers.
 */
export type { ToastKind };
export { emitToast } from '../lib/toastBus';

type ToastOptions = {
    /** How long it stays, in ms. Errors stay a little longer by default. */
    duration?: number;
    action?: { label: string; onClick: () => void };
    /** A toast with the same id replaces the previous one instead of stacking. */
    id?: string;
};

type ToastItem = { id: string; kind: ToastKind; message: string; action?: ToastOptions['action']; duration: number };

type ToastApi = {
    show: (kind: ToastKind, message: string, options?: ToastOptions) => void;
    success: (message: string, options?: ToastOptions) => void;
    error: (message: string, options?: ToastOptions) => void;
    info: (message: string, options?: ToastOptions) => void;
    dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastApi | undefined>(undefined);

const MAX_VISIBLE = 3;
let counter = 0;


export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const timers = useRef(new Map<string, number>());

    const dismiss = useCallback((id: string) => {
        setToasts((list) => list.filter((t) => t.id !== id));
        const timer = timers.current.get(id);
        if (timer) window.clearTimeout(timer);
        timers.current.delete(id);
    }, []);

    const show = useCallback(
        (kind: ToastKind, message: string, options: ToastOptions = {}) => {
            const id = options.id ?? `t${++counter}`;
            const duration = options.duration ?? (kind === 'error' ? 5000 : 2800);
            setToasts((list) => [...list.filter((t) => t.id !== id), { id, kind, message, action: options.action, duration }].slice(-MAX_VISIBLE));
            const old = timers.current.get(id);
            if (old) window.clearTimeout(old);
            timers.current.set(id, window.setTimeout(() => dismiss(id), duration));
        },
        [dismiss],
    );

    const api = useRef<ToastApi>({} as ToastApi);
    api.current.show = show;
    api.current.dismiss = dismiss;
    api.current.success = (m, o) => show('success', m, o);
    api.current.error = (m, o) => show('error', m, o);
    api.current.info = (m, o) => show('info', m, o);

    useEffect(() => {
        const onEvent = (e: Event) => {
            const { kind = 'info', message, id, duration } = (e as CustomEvent).detail || {};
            if (message) show(kind, message, { id, duration });
        };
        window.addEventListener(TOAST_EVENT, onEvent);
        const all = timers.current;
        return () => {
            window.removeEventListener(TOAST_EVENT, onEvent);
            all.forEach((t) => window.clearTimeout(t));
        };
    }, [show]);

    return (
        <ToastContext.Provider value={api.current}>
            {children}
            <div
                aria-live="polite"
                className="fixed z-[10000] inset-x-0 bottom-0 flex flex-col items-center gap-2 p-4 pointer-events-none sm:items-end sm:right-4 sm:left-auto sm:bottom-4 sm:p-0"
                style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            >
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        role={t.kind === 'error' ? 'alert' : 'status'}
                        className="nc-toast pointer-events-auto w-full max-w-sm flex items-start gap-3 rounded-xl bg-[#222222] text-white shadow-lg px-4 py-3 font-poppins"
                    >
                        <span className="mt-0.5 flex-shrink-0">
                            {t.kind === 'success' && <CheckCircle2 size={18} className="text-[#4ADE80]" />}
                            {t.kind === 'error' && <AlertCircle size={18} className="text-[#FF6B6B]" />}
                            {t.kind === 'info' && <Info size={18} className="text-[#93C5FD]" />}
                        </span>
                        <p className="flex-1 text-sm leading-snug">{t.message}</p>
                        {t.action && (
                            <button
                                type="button"
                                onClick={() => {
                                    t.action!.onClick();
                                    dismiss(t.id);
                                }}
                                className="text-sm font-semibold text-[#FF8A8A] hover:text-white whitespace-nowrap focus:outline-none focus-visible:underline"
                            >
                                {t.action.label}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => dismiss(t.id)}
                            aria-label="Dismiss"
                            className="text-white/50 hover:text-white flex-shrink-0 focus:outline-none focus-visible:text-white"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = (): ToastApi => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within a ToastProvider');
    return ctx;
};
