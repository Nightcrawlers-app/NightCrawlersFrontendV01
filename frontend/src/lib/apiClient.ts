/**
 * Night Crawlers — HTTP client
 *
 * Authentication: httpOnly cookies set by the backend on login/signup.
 * `credentials: 'include'` sends these cookies automatically on every request —
 * the frontend never touches a raw token. This protects against XSS.
 *
 * CORS: the backend must set `Access-Control-Allow-Origin` to this exact origin
 * and `Access-Control-Allow-Credentials: true`. Wildcard origins block cookies.
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

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

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, params, signal } = options;

    let response: Response;
    try {
        response = await fetch(buildUrl(path, params), {
            method,
            credentials: 'include', // sends httpOnly cookies automatically
            headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
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

    if (!response.ok) {
        const message =
            (parsed && typeof parsed === 'object' && 'message' in parsed
                ? String((parsed as { message: unknown }).message)
                : null) ||
            (typeof parsed === 'string' && parsed) ||
            `Request failed (${response.status})`;
        throw new ApiError(message, response.status, parsed);
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