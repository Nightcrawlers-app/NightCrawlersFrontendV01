/**
 * Night Crawlers — Domain Models & Types
 *
 * These types define the data contract between the frontend and backend.
 * The backend engineer should implement API endpoints that return data
 * matching these types.
 */

// ─── Business Types ──────────────────────────────────────────────────────────

export type BusinessType = 'Food' | 'Groceries' | 'Pharmacy' | 'Drinks' | 'Clubs/Lounges';

export const BUSINESS_TYPES: BusinessType[] = [
    'Food',
    'Groceries',
    'Pharmacy',
    'Drinks',
    'Clubs/Lounges',
];

// ─── Location ────────────────────────────────────────────────────────────────

/**
 * A point on the map. Optional everywhere for now: addresses typed by hand have
 * no coordinates until someone geocodes them, and the app still works without.
 *
 * The browser's geolocation API gives us these directly when a customer taps
 * "use my current location". Turning a typed address into coordinates needs a
 * paid geocoding service and isn't wired up yet.
 */
export type Coordinates = {
    latitude: number;
    longitude: number;
};

export type BusinessTypeMeta = {
    type: BusinessType;
    singular: string;
    plural: string;
    categoryLabel: string;
    itemSingular: string;
    itemPlural: string;
};

// ─── Vendor ──────────────────────────────────────────────────────────────────

export type VendorAccount = {
    id: string;
    firstName: string;
    lastName: string;
    businessType: BusinessType;
    businessTypeRaw: string;
    phoneNumber: string;
    email: string;
    location: string;
    createdAt: string;
    verified: boolean;
    phoneVerified?: boolean;
    kycStatus?: KycStatus;
};

export type KycStatus = 'pending' | 'in_progress' | 'passed' | 'failed';

export type VendorStore = {
    id: string;
    vendorId: string;
    name: string;
    businessType: BusinessType;
    categories: string[];
    address: string;
    description: string;
    imageUrl: string;
    /** Null until the store's address has been geocoded. */
    latitude?: number | null;
    longitude?: number | null;
    /** Kilometres from the search point. Only present on proximity searches. */
    distance?: number | null;
    /** On search results: up to 3 dishes on this store's menu that matched. */
    matchedItems?: string[];
    /** Live promos covering this store, for "50% OFF" badges on cards. */
    promotions?: { id: string; badge: string; title: string }[];
    openingTime: string;
    closingTime?: string;
    createdAt: string;
};

export type CreateVendorInput = {
    firstName: string;
    lastName: string;
    businessType: string;
    phoneNumber: string;
    email: string;
    location: string;
    password: string;
    /** Map pin for `location`, when the user confirmed it on the map. */
    latitude?: number | null;
    longitude?: number | null;
};

export type CreateStoreInput = {
    name: string;
    categories?: string[];
    address: string;
    description: string;
    imageUrl: string;
    openingTime?: string;
    closingTime?: string;
};

export type UpdateStoreInput = {
    name?: string;
    categories?: string[];
    address?: string;
    description?: string;
    imageUrl?: string;
    openingTime?: string;
    closingTime?: string;
};

// ─── Menu Items ──────────────────────────────────────────────────────────────

export type MenuItem = {
    id: string;
    storeId: string;
    name: string;
    categories: string[];
    price: number;
    description: string;
    imageUrl: string;
    createdAt: string;
};

export type CreateMenuItemInput = {
    storeId: string;
    name: string;
    categories: string[];
    price: number;
    description: string;
    imageUrl: string;
};

// ─── Rider ───────────────────────────────────────────────────────────────────

export type RiderAccount = {
    id: string;
    firstName: string;
    lastName: string;
    vehicleType: string;
    phoneNumber: string;
    email: string;
    location: string;
    /** Last reported position, for dispatch and the admin fleet view. */
    latitude?: number | null;
    longitude?: number | null;
    createdAt: string;
    isOnline?: boolean;
    lastSeen?: string;
    verified: boolean;
    phoneVerified?: boolean;
    kycStatus?: KycStatus;
};

export type CreateRiderInput = {
    firstName: string;
    lastName: string;
    vehicleType: string;
    phoneNumber: string;
    email: string;
    location: string;
    password: string;
    /** Map pin for `location`, when the user confirmed it on the map. */
    latitude?: number | null;
    longitude?: number | null;
};

// ─── Payments ────────────────────────────────────────────────────────────────

/**
 * How the customer pays.
 *
 * There is no payment gateway in this version — nothing is charged online. The
 * customer settles with the rider at the door, either in cash or on a POS
 * terminal, so this records an intent rather than a completed transaction.
 * See the Payments section of BACKEND_API_GUIDE.md before adding a gateway.
 */
export type PaymentMethod = 'cash_on_delivery' | 'card_on_delivery';

/** Display text for each payment method. The stored value stays machine-readable. */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
    cash_on_delivery: 'Cash on Delivery',
    card_on_delivery: 'Card on Delivery',
};

/** Human-readable label for a payment method, safe on unrecognised values. */
export const formatPaymentMethod = (method: PaymentMethod | string): string =>
    PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? String(method);

// ─── Orders ──────────────────────────────────────────────────────────────────

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';

export type Order = {
    id: string;
    storeId: string;
    storeName: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerLocation: string;
    customerAddress: string;
    /** Where to deliver, when the customer shared a real point. */
    customerLatitude?: number | null;
    customerLongitude?: number | null;
    riderId: string | null;
    items: { name: string; quantity: number; price: number }[];
    totalAmount: number;
    deliveryFee: number;
    serviceFee?: number;
    /** Everything the customer pays (food + delivery + service − discount). */
    totalPaid?: number | null;
    /** How the customer intends to pay. Nothing is charged online — see PaymentMethod. */
    paymentMethod: PaymentMethod;
    promotionId?: string | null;
    promotionTitle?: string | null;
    discountAmount?: number;
    status: OrderStatus;
    createdAt: string;
    acceptedAt?: string;
    pickedUpAt?: string;
    deliveredAt?: string;
};

export type CreateOrderInput = {
    storeId: string;
    storeName: string;
    customerName: string;
    customerPhone: string;
    customerLocation: string;
    customerAddress: string;
    customerLatitude?: number | null;
    customerLongitude?: number | null;
    /** Which menu items and how many. Names and prices are looked up by the server. */
    items: { menuItemId: string; quantity: number }[];
    paymentMethod: PaymentMethod;
    /** Promo to apply. The backend recalculates the discount itself. */
    promotionId?: string | null;
};

// ─── Admin ───────────────────────────────────────────────────────────────────

export type AdminAccount = {
    id: string;
    username: string;
    email: string;
    createdAt: string;
};

// ─── Customer ────────────────────────────────────────────────────────────────

export type UserAddress = {
    id: string;
    label: string;
    address: string;
    city: string;
    /** Set when the customer picked this via "use my current location". */
    latitude?: number | null;
    longitude?: number | null;
    isDefault: boolean;
};

export type NotificationPreferences = {
    orderUpdates: boolean;
    promotions: boolean;
    newsletter: boolean;
};

/**
 * The signed-in customer. Returned by `GET /api/customers/me` and by the
 * signup/login endpoints. Never contains a password or hash.
 */
export type CustomerProfile = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    phoneVerified: boolean; 
    avatar: string | null;
    location: string;
    joinedDate: string;
    addresses: UserAddress[];
    favoriteVendors: string[];
    notifications: NotificationPreferences;
};

export type CreateCustomerInput = {
    username: string;
    email: string;
    password: string;
};

/** Fields a customer is allowed to change on their own profile. */
export type UpdateCustomerInput = Partial<
    Pick<CustomerProfile, 'firstName' | 'lastName' | 'phone' | 'avatar' | 'location' | 'favoriteVendors' | 'notifications'>
>;

export type OrderItemSummary = {
    name: string;
    quantity: number;
    price: number;
    image: string;
};

/**
 * A customer-facing order record — the order history shown in the profile page.
 * Returned by `GET /api/customers/me/transactions`.
 */
export type Transaction = {
    id: string;
    orderId: string;
    date: string;
    status: 'delivered' | 'in-transit' | 'preparing' | 'cancelled' | 'refunded';
    items: OrderItemSummary[];
    subtotal: number;
    deliveryFee: number;
    total: number;
    vendorName: string;
    vendorImage?: string;
    paymentMethod: PaymentMethod;
    deliveryAddress: string;
};

// ─── Platform / Admin Stats ──────────────────────────────────────────────────

export type PlatformStats = {
    totalVendors: number;
    totalStores: number;
    totalRiders: number;
    totalMenuItems: number;
    totalOrders: number;
    totalRevenue: number;
};

export type ActivityItem = {
    id: string;
    type: 'vendor' | 'rider' | 'admin' | 'store';
    message: string;
    timeAgo: string;
    timestamp: number;
};

export type PendingItem = {
    id: string;
    title: string;
    type: 'vendor' | 'rider';
};

// ─── Earnings ────────────────────────────────────────────────────────────────

export type EarningsPeriod = {
    today: number;
    thisMonth: number;
    thisYear: number;
    todayOrders: number;
    monthOrders: number;
    yearOrders: number;
};

export type StoreEarnings = {
    storeId: string;
    storeName: string;
    vendorId: string;
    vendorName: string;
    todayEarnings: number;
    todayOrders: number;
    monthEarnings: number;
    monthOrders: number;
    yearEarnings: number;
    yearOrders: number;
};

export type EntityEarnings = {
    id: string;
    name: string;
    type: 'vendor' | 'rider';
    earnings: EarningsPeriod;
};

// ─── Marketing site ──────────────────────────────────────────────────────────

/** What the "Chat to our friendly team" form on /contact sends. */
export type ContactMessageInput = {
    firstName: string;
    lastName: string;
    email: string;
    message: string;
};

// ─── Promotions ──────────────────────────────────────────────────────────────

export type DiscountType = 'percent' | 'fixed' | 'free_delivery';
export type PromotionScope = 'all' | 'category' | 'stores';

export type Promotion = {
    id: string;
    title: string;
    subtitle: string;
    /** Short label for store cards, e.g. "50% OFF". */
    badge: string;
    imageUrl: string;
    discountType: DiscountType;
    discountValue: number;
    maxDiscount: number | null;
    minOrderAmount: number;
    scope: PromotionScope;
    businessType: BusinessType | null;
    storeIds: string[];
    fundedBy: 'platform' | 'vendor';
    startsAt: string | null;
    endsAt: string | null;
    isActive: boolean;
    isLive: boolean;
    priority: number;
};

export type PromotionInput = Partial<Omit<Promotion, 'id' | 'isLive'>>;

export type PromotionQuote = {
    eligible: boolean;
    discount: number;
    reason: string | null;
    amountNeeded?: number;
};

/** POST /api/orders/quote — the server's exact price breakdown for a cart. */
export type OrderQuote = {
    subtotal: number;
    deliveryFee: number;
    serviceFee: number;
    serviceFeePercent: number;
    discount: number;
    total: number;
    promotion: (PromotionQuote & { id: string; title: string | null }) | null;
};
