/**
 * Paystack's in-app card popup (InlineJS v2).
 *
 * The card form is Paystack's own secure iframe: card numbers go straight
 * from the customer's phone to Paystack and never touch our frontend or
 * servers. We only pass the one-time access code our backend got from
 * POST /api/payments/paystack/initialize, so no Paystack key is needed here.
 *
 * If the script can't load (offline, blocked), callers fall back to sending
 * the customer to Paystack's hosted page instead.
 */
const SCRIPT_URL = 'https://js.paystack.co/v2/inline.js';

type PaystackTransaction = { reference: string; status?: string; message?: string };

type PaystackPopInstance = {
    resumeTransaction: (
        accessCode: string,
        callbacks?: {
            onSuccess?: (tx: PaystackTransaction) => void;
            onCancel?: () => void;
            onError?: (error: { message?: string }) => void;
        },
    ) => void;
};

declare global {
    interface Window {
        PaystackPop?: new () => PaystackPopInstance;
    }
}

let loading: Promise<void> | null = null;

export function loadPaystack(): Promise<void> {
    if (window.PaystackPop) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = SCRIPT_URL;
        script.async = true;
        script.onload = () => (window.PaystackPop ? resolve() : reject(new Error('Paystack did not load.')));
        script.onerror = () => {
            loading = null; // allow another try later
            script.remove();
            reject(new Error('Could not load Paystack.'));
        };
        document.head.appendChild(script);
    });
    return loading;
}

export type CardPopupResult =
    | { outcome: 'success'; reference: string }
    | { outcome: 'cancelled' }
    | { outcome: 'error'; message: string };

/** Open the card popup for a transaction our server already initialised. */
export async function payWithCardPopup(accessCode: string): Promise<CardPopupResult> {
    await loadPaystack();
    return new Promise<CardPopupResult>((resolve) => {
        const popup = new window.PaystackPop!();
        popup.resumeTransaction(accessCode, {
            onSuccess: (tx) => resolve({ outcome: 'success', reference: tx.reference }),
            onCancel: () => resolve({ outcome: 'cancelled' }),
            onError: (err) => resolve({ outcome: 'error', message: err?.message || 'The card payment failed.' }),
        });
    });
}
