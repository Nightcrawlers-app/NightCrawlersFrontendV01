# 🦇 Night Crawlers

A multi-vendor delivery platform connecting customers with local vendors (restaurants, grocery stores, pharmacies, drink stores, and clubs/lounges) and riders for last-mile delivery.

---

## 📁 Project Structure

```
Night_Crawlers/
├── README.md                 ← You are here
├── frontend/                 ← React + TypeScript frontend (Vite)
│   ├── src/
│   │   ├── App.tsx           ← Root component with all routes
│   │   ├── main.tsx          ← Entry point
│   │   ├── index.css         ← Global styles
│   │   │
│   │   ├── pages/            ← All page components, organized by domain
│   │   │   ├── auth/         ← SignIn, SignUp (customer authentication)
│   │   │   ├── vendor/       ← Vendor sign-in/up, dashboard, store management
│   │   │   ├── admin/        ← Admin login & dashboard
│   │   │   ├── rider/        ← Rider dashboard (accept/deliver orders)
│   │   │   ├── customer/     ← Explore, order summary, user profile
│   │   │   ├── marketing/    ← Home, About, Features, FAQ, Contact, Overview
│   │   │   ├── legal/        ← Terms of Service, Privacy Policy
│   │   │   └── NotFound.tsx  ← 404 fallback route
│   │   │
│   │   ├── components/       ← Reusable UI components (Header, Footer, modals)
│   │   ├── hooks/            ← Custom React hooks (useTheme, etc.)
│   │   ├── assets/           ← Images, SVGs, and static assets
│   │   │
│   │   ├── context/          ← React context providers
│   │   │   ├── AuthContext.tsx            ← Customer session, profile, addresses
│   │   │   ├── CartContext.tsx            ← Cart contents (persisted locally)
│   │   │   ├── DeliveryLocationContext.tsx← Chosen delivery address + coords
│   │   │   └── GlobalLoaderContext.tsx    ← Full-screen loading state
│   │   │
│   │   ├── services/         ← ⭐ API service layer (backend integration point)
│   │   │   └── api.ts        ← Every API call, one function per endpoint
│   │   │
│   │   ├── types/            ← TypeScript type definitions
│   │   │   ├── models.ts     ← ⭐ All domain models (the data contract)
│   │   │   └── index.ts      ← Additional UI-related types
│   │   │
│   │   ├── lib/              ← Utility libraries
│   │   │   ├── apiClient.ts        ← ⭐ Base URL, cookies, error handling (all HTTP)
│   │   │   ├── geolocation.ts      ← Browser geolocation wrapper
│   │   │   ├── selectedAddress.ts  ← Remembers the chosen delivery address
│   │   │   ├── imageUtils.ts       ← Image URL resolution helpers
│   │   │   └── utils.ts            ← General utilities
│   │   │
│   │   └── utils/            ← Additional utilities
│   │
│   ├── .env.example          ← Copy to .env.local to point at a backend
│   ├── public/               ← Static public assets
│   ├── package.json          ← Dependencies and scripts
│   ├── vite.config.ts        ← Vite build configuration
│   ├── tsconfig.json         ← TypeScript configuration
│   ├── tailwind.config.js    ← Tailwind CSS configuration
│   └── eslint.config.js      ← ESLint configuration
│
└── backend/                  ← 🔜 Backend API (to be implemented)
```

---

## 🚀 Getting Started (Frontend)

### Prerequisites
- Node.js 18+ and npm

### Installation & Dev Server

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173` (or the next available port).

### Build for Production

```bash
cd frontend
npm run build
```

Output will be in `frontend/dist/`.

---

## 🔌 Backend Integration

The frontend is **fully built and wired up** — every API function makes a real HTTP request, and every page handles loading and error states. It just needs a server to talk to.

👉 **[`BACKEND_API_GUIDE.md`](./BACKEND_API_GUIDE.md)**

### Quick Overview

| File | What it does |
|------|-------------|
| `frontend/src/types/models.ts` | All TypeScript types/interfaces — the **data contract** |
| `frontend/src/services/api.ts` | Every API call, one function per endpoint |
| `frontend/src/lib/apiClient.ts` | Base URL, cookie credentials, error handling — the only file that knows about HTTP |
| `frontend/.env.example` | How to point the app at a backend |

The backend engineer should:
1. Read `BACKEND_API_GUIDE.md` — especially **Security Rules** and **CORS**
2. Implement the REST API endpoints listed there
3. Tell us the dev port; nothing in the frontend needs changing beyond an env var

> **Note on the endpoint paths:** they're a proposal from the frontend side, not a fixed spec. They all live in `services/api.ts` and are cheap to change. The **data shapes** in `models.ts` are the part that matters.

### Pointing the frontend at a backend

```bash
cd frontend
cp .env.example .env.local
```

Set `VITE_DEV_API_PROXY` to wherever the backend runs locally (default `http://localhost:5000`). The dev server proxies `/api` there, so there's no CORS setup needed while developing.

---

## 🚀 Deploying

**Read this before the first deploy.** Two settings are easy to miss, and both cause the same symptom: the site builds and loads fine, then every request fails.

### 1. Set the root directory to `frontend`

The app lives in `frontend/`, not the repo root. Vercel and Netlify both default to the root and will fail to find `package.json`.

| Setting | Value |
|---------|-------|
| Root directory | `frontend` |
| Build command | `npm run build` |
| Output directory | `dist` |

`frontend/vercel.json` and `frontend/netlify.toml` handle SPA routing, so any URL falls through to `index.html` instead of 404ing.

### 2. Set `VITE_API_BASE_URL`

This is the one that catches people out.

In development the dev server proxies `/api` to the backend, so no configuration is needed. **That proxy does not exist in production.** Without this variable the built site requests `/api/...` from its own domain, finds nothing, and every screen shows an error.

Set it in the hosting dashboard's environment variables — not in a file — to the backend's full origin:

```
VITE_API_BASE_URL=https://api.nightcrawlers.com
```

Vite bakes environment variables in at build time, so **you must redeploy after changing it.** Editing it without rebuilding does nothing.

### 3. Send the site's URL to the backend developer

Once deployed you'll have an address like `night-crawlers.vercel.app`.

The backend has to explicitly allow requests from that address, or the browser blocks them. Send it to whoever is building the API and ask them to add it to their CORS whitelist. Include preview URLs too if you use branch deploys.

This is the last step and it's easy to forget, because everything works locally right up until it doesn't. See the CORS section of [`BACKEND_API_GUIDE.md`](./BACKEND_API_GUIDE.md).

---

## 👥 User Roles

| Role | Description |
|------|-------------|
| **Customer** | Browses vendors, places orders, tracks delivery |
| **Vendor** | Manages stores, menu items, incoming orders |
| **Rider** | Goes online, accepts ready orders, delivers them |
| **Admin** | Manages the platform — approves vendors/riders, views stats |

---

## 🎨 Brand

- **Primary Red:** `#C62222`
- **Dark variant:** `#991B1B` / `#A01B1B`
- **Font:** Poppins (Google Fonts)
- **Style:** Clean, modern, mobile-first

---

## 📦 Tech Stack (Frontend)

- **React 18** with TypeScript
- **Vite** for build tooling
- **React Router v6** for client-side routing
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Lazy loading** on all page components for code splitting

---

## 📄 License

Proprietary — Night Crawlers © 2026
