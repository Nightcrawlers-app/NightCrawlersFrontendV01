/**
 * Night Crawlers — API Service Layer
 *
 * Every function here is a real HTTP call to the backend. They are all async
 * and return Promises — callers must `await` them and handle failures.
 *
 * Requests go through `lib/apiClient.ts`, which owns the base URL, sends
 * cookies for authentication, and converts failures into `ApiError`.
 *
 * Endpoint paths below are the contract described in BACKEND_API_GUIDE.md.
 * If the backend uses a different path or shape, change it HERE — never in a
 * page component.
 */

import { apiFetch, apiFetchOrNull } from '../lib/apiClient';
import type {
    BusinessType,
    BusinessTypeMeta,
    VendorAccount,
    VendorStore,
    CreateVendorInput,
    CreateStoreInput,
    UpdateStoreInput,
    MenuItem,
    CreateMenuItemInput,
    RiderAccount,
    CreateRiderInput,
    Order,
    OrderStatus,
    CreateOrderInput,
    AdminAccount,
    PlatformStats,
    ActivityItem,
    PendingItem,
    EarningsPeriod,
    StoreEarnings,
    EntityEarnings,
    CustomerProfile,
    CreateCustomerInput,
    UpdateCustomerInput,
    UserAddress,
    Transaction,
    Coordinates,
    PaymentMethod,
    ContactMessageInput,
} from '../types/models';

// Re-export types so existing imports keep working
export type {
    BusinessType,
    BusinessTypeMeta,
    VendorAccount,
    VendorStore,
    CreateVendorInput,
    CreateStoreInput,
    UpdateStoreInput,
    MenuItem,
    CreateMenuItemInput,
    RiderAccount,
    CreateRiderInput,
    Order,
    OrderStatus,
    CreateOrderInput,
    AdminAccount,
    PlatformStats,
    ActivityItem,
    PendingItem,
    EarningsPeriod,
    StoreEarnings,
    EntityEarnings,
    CustomerProfile,
    CreateCustomerInput,
    UpdateCustomerInput,
    UserAddress,
    Transaction,
    Coordinates,
    PaymentMethod,
    ContactMessageInput,
};

// Re-export the constants
export { BUSINESS_TYPES } from '../types/models';
export { PAYMENT_METHOD_LABELS, formatPaymentMethod } from '../types/models';

// Re-export error helpers so pages can render failures without importing the client
export { ApiError, toErrorMessage } from '../lib/apiClient';

/** Shape returned by `GET /api/admin/orders/stats`. */
export type OrderStats = {
    totalOrders: number;
    todayOrders: number;
    pendingOrders: number;
    activeOrders: number;
    completedOrders: number;
    totalRevenue: number;
    todayRevenue: number;
    onlineRiders: number;
    totalRiders: number;
};

// ─── Business Type Helpers ───────────────────────────────────────────────────
// These are pure frontend display helpers — no API involved, so they stay sync.

const BUSINESS_TYPE_META: Record<BusinessType, BusinessTypeMeta> = {
    Food: {
        type: 'Food',
        singular: 'Restaurant',
        plural: 'Restaurants',
        categoryLabel: 'Food Categories',
        itemSingular: 'Menu Item',
        itemPlural: 'Menu Items',
    },
    Groceries: {
        type: 'Groceries',
        singular: 'Grocery Store',
        plural: 'Grocery Stores',
        categoryLabel: 'Store Categories',
        itemSingular: 'Product',
        itemPlural: 'Products',
    },
    Pharmacy: {
        type: 'Pharmacy',
        singular: 'Pharmacy',
        plural: 'Pharmacies',
        categoryLabel: 'Product Categories',
        itemSingular: 'Product',
        itemPlural: 'Products',
    },
    Drinks: {
        type: 'Drinks',
        singular: 'Drink Store',
        plural: 'Drink Stores',
        categoryLabel: 'Drink Categories',
        itemSingular: 'Drink',
        itemPlural: 'Drinks',
    },
    'Clubs/Lounges': {
        type: 'Clubs/Lounges',
        singular: 'Lounge',
        plural: 'Lounges',
        categoryLabel: 'Service Categories',
        itemSingular: 'Menu Item',
        itemPlural: 'Menu Items',
    },
};

/** Get display metadata for a business type (pure frontend helper, no API needed). */
export const getBusinessTypeMeta = (type: BusinessType): BusinessTypeMeta =>
    BUSINESS_TYPE_META[type] ?? BUSINESS_TYPE_META.Food;

/** Resolve a user-provided string into a BusinessType (pure frontend helper). */
export const resolveBusinessType = (input: string): BusinessType => {
    const normalized = input.toLowerCase().trim();
    if (!normalized) return 'Food';
    const keywords: Array<{ type: BusinessType; keywords: string[] }> = [
        { type: 'Food', keywords: ['food', 'restaurant', 'resto', 'cafe', 'kitchen', 'diner', 'meal'] },
        { type: 'Groceries', keywords: ['grocery', 'supermarket', 'market', 'mart', 'grocer'] },
        { type: 'Pharmacy', keywords: ['pharmacy', 'chemist', 'drug', 'medicine', 'med'] },
        { type: 'Drinks', keywords: ['drink', 'drinks', 'beverage', 'liquor', 'wine'] },
        { type: 'Clubs/Lounges', keywords: ['club', 'lounge', 'nightlife', 'bar'] },
    ];
    for (const entry of keywords) {
        if (entry.keywords.some((kw) => normalized.includes(kw))) return entry.type;
    }
    return 'Food';
};

// ─── Vendor Actions ──────────────────────────────────────────────────────────

/** POST /api/vendors — Create a new vendor account */
export const createVendorAccount = (input: CreateVendorInput): Promise<VendorAccount> =>
    apiFetch<VendorAccount>('/api/vendors', { method: 'POST', body: input });

/** POST /api/vendors/login — Sign in a vendor. Resolves to null on bad credentials. */
export const signInVendor = (email: string, password: string): Promise<VendorAccount | null> =>
    apiFetchOrNull<VendorAccount>('/api/vendors/login', {
        method: 'POST',
        body: { email, password },
    });

/** GET /api/vendors/me — Get the currently authenticated vendor */
export const getCurrentVendor = (): Promise<VendorAccount | null> =>
    apiFetchOrNull<VendorAccount>('/api/vendors/me');

/** POST /api/vendors/logout — Clear the current vendor session */
export const clearCurrentVendor = (): Promise<void> =>
    apiFetch<void>('/api/vendors/logout', { method: 'POST' });

// ─── Store Actions ───────────────────────────────────────────────────────────

/** POST /api/stores — Create a new store for the current vendor */
export const createStore = (input: CreateStoreInput): Promise<VendorStore> =>
    apiFetch<VendorStore>('/api/stores', { method: 'POST', body: input });

/** PATCH /api/stores/:id — Update store details */
export const updateStore = (storeId: string, updates: UpdateStoreInput): Promise<VendorStore> =>
    apiFetch<VendorStore>(`/api/stores/${storeId}`, { method: 'PATCH', body: updates });

/** GET /api/vendors/:vendorId/stores — Get all stores for a vendor */
export const getStoresForVendor = (vendorId: string): Promise<VendorStore[]> =>
    apiFetch<VendorStore[]>(`/api/vendors/${vendorId}/stores`);

/** GET /api/stores/:id — Get a single store by ID */
export const getStoreById = (storeId: string): Promise<VendorStore | null> =>
    apiFetchOrNull<VendorStore>(`/api/stores/${storeId}`);

/**
 * GET /api/stores?address=...&category=...&lat=...&lng=... — Explore page.
 *
 * When `coords` is supplied (the customer used "current location", or picked a
 * saved address that has coordinates), the backend should do a proximity search
 * and may return a `distance` on each store. Otherwise it falls back to
 * matching on the address string.
 */
export const getStoresForExplore = (
    address: string | null | undefined,
    category?: BusinessType | 'All',
    coords?: Coordinates | null,
): Promise<VendorStore[]> =>
    apiFetch<VendorStore[]>('/api/stores', {
        params: {
            address: address ?? undefined,
            category: !category || category === 'All' ? undefined : category,
            lat: coords?.latitude ?? undefined,
            lng: coords?.longitude ?? undefined,
        },
    });

// ─── Menu Item Actions ───────────────────────────────────────────────────────

/** POST /api/menu-items — Create a new menu item */
export const createMenuItem = (input: CreateMenuItemInput): Promise<MenuItem> =>
    apiFetch<MenuItem>('/api/menu-items', { method: 'POST', body: input });

/** PATCH /api/menu-items/:id — Update a menu item */
export const updateMenuItem = (itemId: string, updates: Partial<MenuItem>): Promise<MenuItem | null> =>
    apiFetchOrNull<MenuItem>(`/api/menu-items/${itemId}`, { method: 'PATCH', body: updates });

/** GET /api/stores/:storeId/menu-items — Get all menu items for a store */
export const getMenuItemsForStore = (storeId: string): Promise<MenuItem[]> =>
    apiFetch<MenuItem[]>(`/api/stores/${storeId}/menu-items`);

/** DELETE /api/menu-items/:id — Delete a menu item */
export const deleteMenuItem = (menuItemId: string): Promise<void> =>
    apiFetch<void>(`/api/menu-items/${menuItemId}`, { method: 'DELETE' });

// ─── Rider Actions ───────────────────────────────────────────────────────────

/** POST /api/riders — Create a new rider account */
export const createRiderAccount = (input: CreateRiderInput): Promise<RiderAccount> =>
    apiFetch<RiderAccount>('/api/riders', { method: 'POST', body: input });

/** POST /api/riders/login — Sign in a rider. Resolves to null on bad credentials. */
export const signInRider = (email: string, password: string): Promise<RiderAccount | null> =>
    apiFetchOrNull<RiderAccount>('/api/riders/login', {
        method: 'POST',
        body: { email, password },
    });

/** GET /api/riders/me — Get the currently authenticated rider */
export const getCurrentRider = (): Promise<RiderAccount | null> =>
    apiFetchOrNull<RiderAccount>('/api/riders/me');

/** POST /api/riders/logout — Log out the current rider */
export const logoutRider = (): Promise<void> =>
    apiFetch<void>('/api/riders/logout', { method: 'POST' });

/** PATCH /api/riders/:id/status — Set rider online/offline status */
export const setRiderOnlineStatus = (riderId: string, isOnline: boolean): Promise<void> =>
    apiFetch<void>(`/api/riders/${riderId}/status`, { method: 'PATCH', body: { isOnline } });

/**
 * PATCH /api/riders/:id/location — Report the rider's current position.
 *
 * Sent while a rider is online so dispatch can match them to nearby orders and
 * the admin fleet view can show where they are.
 */
export const updateRiderLocation = (riderId: string, coords: Coordinates): Promise<void> =>
    apiFetch<void>(`/api/riders/${riderId}/location`, { method: 'PATCH', body: coords });

/** GET /api/riders/online — Get all online riders */
export const getOnlineRiders = (): Promise<RiderAccount[]> =>
    apiFetch<RiderAccount[]>('/api/riders/online');

/** GET /api/riders/:id — Get a rider by ID */
export const getRiderById = (riderId: string): Promise<RiderAccount | null> =>
    apiFetchOrNull<RiderAccount>(`/api/riders/${riderId}`);

// ─── Customer Actions ────────────────────────────────────────────────────────

/** POST /api/customers — Register a new customer */
export const createCustomerAccount = (input: CreateCustomerInput): Promise<CustomerProfile> =>
    apiFetch<CustomerProfile>('/api/customers', { method: 'POST', body: input });

/** POST /api/customers/login — Sign in a customer. Resolves to null on bad credentials. */
export const signInCustomer = (email: string, password: string): Promise<CustomerProfile | null> =>
    apiFetchOrNull<CustomerProfile>('/api/customers/login', {
        method: 'POST',
        body: { email, password },
    });

/** GET /api/customers/me — Get the currently authenticated customer */
export const getCurrentCustomer = (): Promise<CustomerProfile | null> =>
    apiFetchOrNull<CustomerProfile>('/api/customers/me');

/** POST /api/customers/logout — Clear the current customer session */
export const logoutCustomer = (): Promise<void> =>
    apiFetch<void>('/api/customers/logout', { method: 'POST' });

/** PATCH /api/customers/me — Update the current customer's profile */
export const updateCustomerProfile = (updates: UpdateCustomerInput): Promise<CustomerProfile> =>
    apiFetch<CustomerProfile>('/api/customers/me', { method: 'PATCH', body: updates });

/** POST /api/customers/me/password — Change the current customer's password */
export const changeCustomerPassword = (
    currentPassword: string,
    newPassword: string,
): Promise<void> =>
    apiFetch<void>('/api/customers/me/password', {
        method: 'POST',
        body: { currentPassword, newPassword },
    });

/** DELETE /api/customers/me — Permanently delete the current customer's account */
export const deleteCustomerAccount = (): Promise<void> =>
    apiFetch<void>('/api/customers/me', { method: 'DELETE' });

/** GET /api/customers/me/transactions — Order history for the current customer */
export const getCustomerTransactions = (): Promise<Transaction[]> =>
    apiFetch<Transaction[]>('/api/customers/me/transactions');

// ─── Customer Addresses ──────────────────────────────────────────────────────

/** POST /api/customers/me/addresses — Add a delivery address */
export const addCustomerAddress = (address: Omit<UserAddress, 'id'>): Promise<CustomerProfile> =>
    apiFetch<CustomerProfile>('/api/customers/me/addresses', { method: 'POST', body: address });

/** PATCH /api/customers/me/addresses/:id — Update a delivery address */
export const updateCustomerAddress = (
    addressId: string,
    updates: Partial<Omit<UserAddress, 'id'>>,
): Promise<CustomerProfile> =>
    apiFetch<CustomerProfile>(`/api/customers/me/addresses/${addressId}`, {
        method: 'PATCH',
        body: updates,
    });

/** DELETE /api/customers/me/addresses/:id — Remove a delivery address */
export const deleteCustomerAddress = (addressId: string): Promise<CustomerProfile> =>
    apiFetch<CustomerProfile>(`/api/customers/me/addresses/${addressId}`, { method: 'DELETE' });

/** POST /api/customers/me/addresses/:id/default — Mark an address as the default */
export const setDefaultCustomerAddress = (addressId: string): Promise<CustomerProfile> =>
    apiFetch<CustomerProfile>(`/api/customers/me/addresses/${addressId}/default`, {
        method: 'POST',
    });

// ─── Marketing site ──────────────────────────────────────────────────────────

/** POST /api/contact — Send a message from the contact form */
export const sendContactMessage = (input: ContactMessageInput): Promise<void> =>
    apiFetch<void>('/api/contact', { method: 'POST', body: input });

/** POST /api/newsletter — Subscribe an email to the marketing newsletter */
export const subscribeToNewsletter = (email: string): Promise<void> =>
    apiFetch<void>('/api/newsletter', { method: 'POST', body: { email } });

// ─── Admin Actions ───────────────────────────────────────────────────────────

/** POST /api/admins/login — Sign in an admin. Resolves to null on bad credentials. */
export const signInAdmin = (email: string, password: string): Promise<AdminAccount | null> =>
    apiFetchOrNull<AdminAccount>('/api/admins/login', {
        method: 'POST',
        body: { email, password },
    });

/** GET /api/admins/me — Get the currently authenticated admin */
export const getCurrentAdmin = (): Promise<AdminAccount | null> =>
    apiFetchOrNull<AdminAccount>('/api/admins/me');

/** POST /api/admins/logout — Clear the current admin session */
export const logoutAdmin = (): Promise<void> =>
    apiFetch<void>('/api/admins/logout', { method: 'POST' });

// ─── Admin Stats & Activity ──────────────────────────────────────────────────

/** GET /api/admin/stats — Get platform-wide statistics */
export const getPlatformStats = (): Promise<PlatformStats> =>
    apiFetch<PlatformStats>('/api/admin/stats');

/** GET /api/admin/activity — Get recent system activity */
export const getSystemActivity = (): Promise<ActivityItem[]> =>
    apiFetch<ActivityItem[]>('/api/admin/activity');

/** GET /api/admin/pending — Get pending verification items */
export const getPendingActions = (): Promise<PendingItem[]> =>
    apiFetch<PendingItem[]>('/api/admin/pending');

/** POST /api/admin/verify — Approve or reject a vendor/rider */
export const verifyUser = (
    id: string,
    type: 'vendor' | 'rider',
    action: 'approve' | 'reject',
): Promise<void> => apiFetch<void>('/api/admin/verify', { method: 'POST', body: { id, type, action } });

// ─── Admin Lists ─────────────────────────────────────────────────────────────

/** GET /api/admin/vendors — Get all vendors */
export const getAllVendors = (): Promise<VendorAccount[]> =>
    apiFetch<VendorAccount[]>('/api/admin/vendors');

/** GET /api/admin/riders — Get all riders */
export const getAllRiders = (): Promise<RiderAccount[]> =>
    apiFetch<RiderAccount[]>('/api/admin/riders');

/** GET /api/admin/stores — Get all stores */
export const getAllStores = (): Promise<VendorStore[]> =>
    apiFetch<VendorStore[]>('/api/admin/stores');

/** GET /api/admin/orders — Get all orders */
export const getAllOrders = (): Promise<Order[]> => apiFetch<Order[]>('/api/admin/orders');

// ─── Order Management ────────────────────────────────────────────────────────

/**
 * POST /api/orders — Create a new order.
 *
 * `customerId` is NOT sent by the frontend — the backend must read it from the
 * authenticated session so a client can't place an order as somebody else.
 */
export const createOrder = (input: CreateOrderInput): Promise<Order> =>
    apiFetch<Order>('/api/orders', { method: 'POST', body: input });

/**
 * GET /api/orders/pending?location=...&lat=...&lng=... — Pending orders near a rider.
 *
 * Coordinates are sent when the rider's device has shared them, in which case
 * the backend should sort by real distance rather than matching the location
 * string.
 */
export const getPendingOrdersForRider = (
    riderLocation: string,
    coords?: Coordinates | null,
): Promise<Order[]> =>
    apiFetch<Order[]>('/api/orders/pending', {
        params: {
            location: riderLocation,
            lat: coords?.latitude ?? undefined,
            lng: coords?.longitude ?? undefined,
        },
    });

/** GET /api/riders/:id/orders — Get all orders assigned to a rider */
export const getOrdersForRider = (riderId: string): Promise<Order[]> =>
    apiFetch<Order[]>(`/api/riders/${riderId}/orders`);

/** POST /api/orders/:id/accept — Accept an order as a rider */
export const acceptOrder = (orderId: string, riderId: string): Promise<Order | null> =>
    apiFetchOrNull<Order>(`/api/orders/${orderId}/accept`, { method: 'POST', body: { riderId } });

/** PATCH /api/orders/:id/status — Update an order's status */
export const updateOrderStatus = (orderId: string, status: OrderStatus): Promise<Order | null> =>
    apiFetchOrNull<Order>(`/api/orders/${orderId}/status`, { method: 'PATCH', body: { status } });

/** GET /api/orders/:id — Get an order by ID */
export const getOrderById = (orderId: string): Promise<Order | null> =>
    apiFetchOrNull<Order>(`/api/orders/${orderId}`);

/** GET /api/stores/:id/location — Get store address for navigation */
export const getStoreLocation = async (storeId: string): Promise<string | null> => {
    const result = await apiFetchOrNull<{ address: string }>(`/api/stores/${storeId}/location`);
    return result?.address ?? null;
};

/** GET /api/admin/orders/stats — Get order statistics */
export const getOrderStats = (): Promise<OrderStats> =>
    apiFetch<OrderStats>('/api/admin/orders/stats');

// ─── Vendor Orders ───────────────────────────────────────────────────────────

/** GET /api/vendors/:id/orders — Get all orders for a vendor's stores */
export const getOrdersForVendor = (vendorId: string): Promise<Order[]> =>
    apiFetch<Order[]>(`/api/vendors/${vendorId}/orders`);

// ─── Earnings ────────────────────────────────────────────────────────────────

/** GET /api/vendors/:id/earnings — Get earnings for a vendor */
export const getVendorEarnings = (vendorId: string): Promise<EarningsPeriod> =>
    apiFetch<EarningsPeriod>(`/api/vendors/${vendorId}/earnings`);

/** GET /api/stores/:id/earnings — Get earnings for a specific store */
export const getStoreEarnings = (storeId: string): Promise<StoreEarnings> =>
    apiFetch<StoreEarnings>(`/api/stores/${storeId}/earnings`);

/** GET /api/vendors/:id/stores/earnings — Get earnings for all vendor stores */
export const getVendorStoreEarnings = (vendorId: string): Promise<StoreEarnings[]> =>
    apiFetch<StoreEarnings[]>(`/api/vendors/${vendorId}/stores/earnings`);

/** GET /api/admin/stores/earnings — Get all store earnings (admin) */
export const getAllStoreEarningsForAdmin = (): Promise<StoreEarnings[]> =>
    apiFetch<StoreEarnings[]>('/api/admin/stores/earnings');

/** GET /api/riders/:id/earnings — Get earnings for a rider */
export const getRiderEarnings = (riderId: string): Promise<EarningsPeriod> =>
    apiFetch<EarningsPeriod>(`/api/riders/${riderId}/earnings`);

/** GET /api/admin/earnings — Get all entity earnings (admin) */
export const getAllEarningsForAdmin = (): Promise<EntityEarnings[]> =>
    apiFetch<EntityEarnings[]>('/api/admin/earnings');
