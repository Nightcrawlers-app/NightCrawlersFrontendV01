/**
 * Raise a pop-up message from code that isn't a React component (the API
 * client, service functions). ToastProvider listens for this event.
 */
export type ToastKind = 'success' | 'error' | 'info';

export const TOAST_EVENT = 'nc:toast';

export const emitToast = (kind: ToastKind, message: string, id?: string): void => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { kind, message, id } }));
};
