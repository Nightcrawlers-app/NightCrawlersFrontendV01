/// <reference types="vite/client" />

interface ImportMetaEnv {
    /**
     * Full origin of the backend API, e.g. `https://api.nightcrawlers.com`.
     * Leave unset in development — Vite proxies `/api` instead (vite.config.ts).
     */
    readonly VITE_API_BASE_URL?: string;
    /** Public site address for canonical links, e.g. https://nightcrawlers.app */
    readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
