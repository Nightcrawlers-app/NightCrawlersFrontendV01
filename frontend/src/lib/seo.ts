import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Per-page title, description, canonical URL and link-preview tags.
 *
 * The site is a single-page app: index.html carries sensible defaults, and
 * each page calls usePageMeta() to replace them while it's open. Google runs
 * JavaScript and picks these up; WhatsApp/Facebook previews only read
 * index.html, so the defaults there matter most for sharing.
 */
export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://nightcrawlers.app').replace(/\/$/, '');
export const SITE_NAME = 'Nightcrawlers';
export const DEFAULT_TITLE = 'Nightcrawlers — Late-night delivery of food, groceries, pharmaceuticals & drinks in Abuja';
export const DEFAULT_DESCRIPTION =
    'Order food, groceries, medicine and drinks from trusted stores in Abuja, delivered to your door any hour of the night.';
export const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

type PageMeta = {
    /** Shown in the browser tab and search results. "| Nightcrawlers" is added unless it already mentions it. */
    title?: string;
    description?: string;
    image?: string;
    /** Private pages (profile, checkout, dashboards) should not be indexed. */
    noindex?: boolean;
};

const setMeta = (attr: 'name' | 'property', key: string, value: string) => {
    let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
    }
    el.setAttribute('content', value);
};

const setCanonical = (href: string) => {
    let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!el) {
        el = document.createElement('link');
        el.rel = 'canonical';
        document.head.appendChild(el);
    }
    el.href = href;
};

/** Pass null to leave the tags alone (the page sets its own). */
export function usePageMeta(meta: PageMeta | null = {}): void {
    const { pathname, search } = useLocation();
    const skip = meta === null;
    const { title, description, image, noindex } = meta ?? {};

    useEffect(() => {
        if (skip) return;
        const fullTitle = !title ? DEFAULT_TITLE : /nightcrawlers/i.test(title) ? title : `${title} | ${SITE_NAME}`;
        const desc = description || DEFAULT_DESCRIPTION;
        // Keep only the query string that identifies content (the store page).
        const store = new URLSearchParams(search).get('store');
        const url = `${SITE_URL}${pathname}${store ? `?store=${encodeURIComponent(store)}` : ''}`;

        document.title = fullTitle;
        setMeta('name', 'description', desc);
        setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
        setMeta('property', 'og:title', fullTitle);
        setMeta('property', 'og:description', desc);
        setMeta('property', 'og:url', url);
        setMeta('property', 'og:image', image || DEFAULT_IMAGE);
        setMeta('name', 'twitter:title', fullTitle);
        setMeta('name', 'twitter:description', desc);
        setMeta('name', 'twitter:image', image || DEFAULT_IMAGE);
        setCanonical(url);
    }, [skip, title, description, image, noindex, pathname, search]);
}

/**
 * Titles for pages that don't set their own. Used once by <RouteMeta /> in
 * App.tsx, so every route gets a sensible title and private pages get noindex.
 */
export const ROUTE_META: Record<string, PageMeta> = {
    '/': {},
    '/explore': { title: 'Explore stores open now in Abuja', description: 'Restaurants, supermarkets, pharmacies, drinks and lounges delivering tonight in Abuja. Order in minutes on Nightcrawlers.' },
    '/vendors': { title: 'Partner with Nightcrawlers', description: 'Sell to Abuja’s night-time customers. List your restaurant, pharmacy, supermarket or lounge on Nightcrawlers.' },
    '/partner-signup': { title: 'Become a partner', description: 'List your store on Nightcrawlers and reach customers ordering late at night in Abuja.' },
    '/rider-signup': { title: 'Ride with Nightcrawlers', description: 'Earn delivering at night in Abuja. Sign up as a Nightcrawlers rider.' },
    '/about': { title: 'About us', description: 'Nightcrawlers delivers food, groceries, medicine and drinks across Abuja when everything else is closed.' },
    '/features': { title: 'Features', description: 'Live order tracking, saved addresses, favourites and rewards — everything Nightcrawlers does for late-night delivery.' },
    '/overview': { title: 'How it works' },
    '/faq': { title: 'Frequently asked questions', description: 'Delivery hours, fees, payment and more — answers to common questions about Nightcrawlers.' },
    '/contact': { title: 'Contact us', description: 'Get in touch with the Nightcrawlers team in Abuja.' },
    '/terms': { title: 'Terms of service' },
    '/privacy': { title: 'Privacy policy' },
    '/signin': { title: 'Sign in', noindex: true },
    '/signup': { title: 'Create your account', description: 'Join Nightcrawlers for late-night delivery in Abuja.' },
    '/verify-email': { title: 'Verify your email', noindex: true },
    '/forgot-password': { title: 'Reset your password', noindex: true },
    '/reset-password': { title: 'Reset your password', noindex: true },
    '/vendor-signin': { title: 'Partner & rider sign in', noindex: true },
    '/user-profile': { title: 'Your account', noindex: true },
    '/order-summary': { title: 'Checkout', noindex: true },
    '/payment/callback': { title: 'Payment', noindex: true },
    '/admin-login': { title: 'Admin', noindex: true },
    '/admin-dashboard': { title: 'Admin', noindex: true },
    '/vendor-dashboard': { title: 'Partner dashboard', noindex: true },
    '/rider-dashboard': { title: 'Rider dashboard', noindex: true },
    '/vendor-kyc': { title: 'Partner verification', noindex: true },
    '/rider-kyc': { title: 'Rider verification', noindex: true },
};

/** Meta for the current route (prefix match for nested paths like /orders/:id). */
export function metaForPath(pathname: string): PageMeta | null {
    if (ROUTE_META[pathname]) return ROUTE_META[pathname];
    if (pathname.startsWith('/orders/')) return { title: 'Track your order', noindex: true };
    if (pathname.startsWith('/vendor-dashboard')) return { title: 'Partner dashboard', noindex: true };
    if (pathname === '/vendor-details') return null; // sets its own from the store
    return { title: 'Page not found', noindex: true };
}
