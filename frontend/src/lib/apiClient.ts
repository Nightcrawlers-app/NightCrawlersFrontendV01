/**
 * Nightcrawlers — HTTP client
 *
 * Authentication: the backend returns a JWT from every login/signup endpoint
 * and reads it ONLY from the `Authorization: Bearer <token>` header — it does
 * not set or read cookies. So we keep the token in localStorage and attach it
 * to every request.
 *
 * (This file previously assumed cookie auth. The backend never implemented
 * cookies, so the token was thrown away after login and every protected call —
 * profile photo, phone verification, addresses, orders — failed with 401.)
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

const TOKEN_KEY = 'nc_token';

/**
 * Fired (on window) when a signed-in session ends without the person signing
 * out: the token expired, or the server rejected it. AuthContext listens and
 * shows "Your session timed out".
 */
export const SESSION_EXPIRED_EVENT = 'nc:session-expired';

/** When a JWT expires (ms since epoch), or null if it can't be read. */
function tokenExpiry(token: string): number | null {
    try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
    } catch {
        return null;
    }
}

let expiryTimer: number | undefined;
let expiredNoticeSent = false;

function sessionExpired(): void {
    setAuthToken(null);
    if (expiredNoticeSent) return;
    expiredNoticeSent = true;
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

/** Sign the person out the moment their token runs out, rather than on the next failed request. */
function scheduleExpiry(token: string | null): void {
    if (typeof window === 'undefined') return;
    window.clearTimeout(expiryTimer);
    if (!token) return;
    const exp = tokenExpiry(token);
    if (!exp) return;
    const ms = exp - Date.now();
    // setTimeout can't wait longer than ~24.8 days; re-check later if needed.
    if (ms > 2 ** 31 - 1) {
        expiryTimer = window.setTimeout(() => scheduleExpiry(getAuthToken()), 2 ** 31 - 1);
        return;
    }
    expiryTimer = window.setTimeout(() => {
        if (getAuthToken() === token) sessionExpired();
    }, Math.max(0, ms));
}

/**
 * Save (or clear, with null) the session token returned by a login endpoint.
 *   remember = true  → localStorage: stays signed in after the browser closes
 *                      (the server makes the token last 30 days)
 *   remember = false → sessionStorage: signed out when the browser closes
 *                      (and the server makes the token last 1 day)
 */
export function setAuthToken(token: string | null | undefined, remember = true): void {
    try {
        localStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
        if (token) (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
    } catch {
        // Storage blocked (private mode) — the session just won't survive a refresh.
    }
    if (token) expiredNoticeSent = false; // a fresh session can time out again later
    scheduleExpiry(token ?? null);
}

export function getAuthToken(): string | null {
    try {
        return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}

// A session saved from an earlier visit: time it out on schedule too. If it
// already ran out while they were away, tell them once the app has loaded.
if (typeof window !== 'undefined') {
    const saved = getAuthToken();
    const exp = saved ? tokenExpiry(saved) : null;
    if (saved && exp && exp <= Date.now()) window.setTimeout(sessionExpired, 800);
    else scheduleExpiry(saved);
}

export class ApiError extends Error {
    status: number;
    body: unknown;

    constructor(message: string, status: number, body?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.body = body;
    }

    get isUnauthorized(): boolean {
        return this.status === 401 || this.status === 403;
    }

    get isNetworkError(): boolean {
        return this.status === 0;
    }
}

type RequestOptions = {
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    body?: unknown;
    params?: Record<string, string | number | boolean | null | undefined>;
    signal?: AbortSignal;
};

function buildUrl(path: string, params?: RequestOptions['params']): string {
    const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
    if (!params) return url;

    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value === null || value === undefined || value === '') continue;
        search.append(key, String(value));
    }

    const qs = search.toString();
    return qs ? `${url}?${qs}` : url;
}

function buildHeaders(hasBody: boolean): Record<string, string> {
    const headers: Record<string, string> = {};
    if (hasBody) headers['Content-Type'] = 'application/json';
    const token = getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
}

const wait = (ms: number, signal?: AbortSignal) =>
    new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, ms);
        signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new DOMException('Aborted', 'AbortError'));
        }, { once: true });
    });

// Statuses that mean "the server is restarting or overloaded — try again".
const TRANSIENT = new Set([502, 503, 504]);

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, params, signal } = options;

    // Reading data (GET) is safe to repeat, so a brief blip — a deploy, the
    // phone switching networks — is retried quietly (after ~0.8s, then ~2s)
    // before the customer sees an error. Anything that changes data (placing
    // an order, paying) is never retried automatically.
    const attempts = method === 'GET' ? 3 : 1;

    let response!: Response;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            response = await fetch(buildUrl(path, params), {
                method,
                headers: buildHeaders(body !== undefined),
                body: body === undefined ? undefined : JSON.stringify(body),
                signal,
            });
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') throw error;
            if (attempt < attempts && !(typeof navigator !== 'undefined' && navigator.onLine === false)) {
                await wait(attempt === 1 ? 800 : 2000, signal);
                continue;
            }
            const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
            throw new ApiError(
                offline
                    ? "You're offline. Check your internet connection and try again."
                    : 'Could not reach the server. Check your connection and try again.',
                0,
                error,
            );
        }
        if (TRANSIENT.has(response.status) && attempt < attempts) {
            await wait(attempt === 1 ? 800 : 2000, signal);
            continue;
        }
        break;
    }

    if (response.status === 204) return undefined as T;

    const raw = await response.text();
    let parsed: unknown = null;
    if (raw) {
        try {
            parsed = JSON.parse(raw);
        } catch {
            parsed = raw;
        }
    }

    // An expired/invalid token is useless — drop it so the app treats the
    // user as signed out instead of retrying with it forever. If they WERE
    // signed in (and this isn't a sign-in attempt), tell them it timed out.
    if (response.status === 401) {
        const hadSession = Boolean(getAuthToken());
        const isSignInAttempt = /\/(login|verify|verify-login|signup)$/.test(path.split('?')[0]);
        if (hadSession && !isSignInAttempt) sessionExpired();
        else setAuthToken(null);
    }

    if (!response.ok) {
        const message =
            (parsed && typeof parsed === 'object' && 'message' in parsed
                ? String((parsed as { message: unknown }).message)
                : null) ||
            (typeof parsed === 'string' && parsed) ||
            `Request failed (${response.status})`;
        // In development, make "route doesn't exist" obvious — it almost always
        // means the backend you're pointed at is running older code.
        const devHint =
            import.meta.env.DEV && response.status === 404 && message === 'Not found'
                ? ` — ${method} ${path} doesn't exist on ${BASE_URL || 'the dev proxy target'}. Is that backend up to date?`
                : '';
        throw new ApiError(message + devHint, response.status, parsed);
    }

    return parsed as T;
}

export async function apiFetchOrNull<T>(
    path: string,
    options: RequestOptions = {},
): Promise<T | null> {
    try {
        return await apiFetch<T>(path, options);
    } catch (error) {
        if (error instanceof ApiError && (error.isUnauthorized || error.status === 404)) {
            return null;
        }
        throw error;
    }
}

export function toErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
    if (error instanceof ApiError) return error.message;
    if (error instanceof Error) return error.message;
    return fallback;
}