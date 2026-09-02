/**
 * Night Crawlers — HTTP client
 *
 * Single place where the backend URL, credentials and error handling live.
 * Every function in `services/api.ts` goes through here, so if the backend
 * moves or the auth scheme changes, this is the only file to touch.
 */

/**
 * Base URL of the backend API.
 *
 * - In development, leave `VITE_API_BASE_URL` unset and Vite proxies `/api`
 *   to the backend (see `server.proxy` in vite.config.ts).
 * - In production (Vercel / Netlify) set `VITE_API_BASE_URL` to the full
 *   backend origin, e.g. `https://api.nightcrawlers.com`.
 */
const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

/** Error thrown by every failed request, carrying the HTTP status. */
export class ApiError extends Error {
    status: number;
    body: unknown;

    constructor(message: string, status: number, body?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.body = body;
    }

    /** True when the user is not signed in (or their session expired). */
    get isUnauthorized(): boolean {
        return this.status === 401 || this.status === 403;
    }

    /** True when the request never reached the server (backend down, no network). */
    get isNetworkError(): boolean {
        return this.status === 0;
    }
}

type RequestOptions = {
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    body?: unknown;
    /** Query string parameters. `null`/`undefined` values are dropped. */
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

/**
 * Make a request to the backend.
 *
 * Sends cookies (`credentials: 'include'`) so httpOnly session/JWT cookies work
 * without the frontend ever touching the token. Throws `ApiError` on failure.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, params, signal } = options;

    let response: Response;
    try {
        response = await fetch(buildUrl(path, params), {
            method,
            credentials: 'include',
            headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
            body: body === undefined ? undefined : JSON.stringify(body),
            signal,
        });
    } catch (error) {
        // fetch only rejects on network-level failures (server unreachable, CORS,
        // DNS). An aborted request is expected, so let it through untouched.
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

/**
 * Like `apiFetch`, but returns `null` instead of throwing when the user is not
 * authenticated or the resource does not exist.
 *
 * Used by the `getCurrent*` / `getById` functions, which the UI expects to
 * return `null` rather than blow up when nobody is signed in.
 */
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

/** Human-readable message for any thrown value — safe to show in the UI. */
export function toErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
    if (error instanceof ApiError) return error.message;
    if (error instanceof Error) return error.message;
    return fallback;
}
