/// <reference types="vite/client" />

interface ImportMetaEnv {
    /**
     * Full origin of the backend API, e.g. `https://api.nightcrawlers.com`.
     * Leave unset in development — Vite proxies `/api` instead (vite.config.ts).
     */
    readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
