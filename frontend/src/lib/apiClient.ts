/**
 * Night Crawlers — HTTP client
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

/** Save (or clear, with null) the session token returned by a login endpoint. */
export function setAuthToken(token: string | null | undefined): void {
    try {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        else localStorage.removeItem(TOKEN_KEY);
    } catch {
        // Storage blocked (private mode) — the session just won't survive a refresh.
    }
}

export function getAuthToken(): string | null {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
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

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, params, signal } = options;

    let response: Response;
    try {
        response = await fetch(buildUrl(path, params), {
            method,
            headers: buildHeaders(body !== undefined),
            body: body === undefined ? undefined : JSON.stringify(body),
            signal,
        });
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') throw error;
        throw new ApiError(
            'Could not reach the server. Check your connection and try again.',
            0,
            error,
        );
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
    // user as signed out instead of retrying with it forever.
    if (response.status === 401) setAuthToken(null);

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