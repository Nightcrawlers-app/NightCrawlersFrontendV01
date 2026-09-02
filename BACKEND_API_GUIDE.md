# Backend API Guide

This is what the Night Crawlers frontend needs from the API.

A note on how to read it. The URL paths below are what I've currently wired up on the frontend side. They're a proposal, not a spec you have to follow. If your framework or your own conventions suggest something different, tell me and I'll change them, they all live in one file (`frontend/src/services/api.ts`) and it's a few minutes of work.

What I do need to stay stable is the shape of the data coming back. The types in `frontend/src/types/models.ts` are what the screens render directly, so those are the real contract.

Four sections are worth reading before you write any code: the MongoDB notes, Security, Payments, and CORS. The Mongo one matters most, because `_id` vs `id` will break every screen if it's missed. Payments is short and mostly tells you what we're *not* doing, which is the kind of thing that's much cheaper to hear now than to discover in week three.

Fair warning: I got things wrong in earlier versions of this document, and following those literally would have shipped real problems — password hashes in response bodies, for one. Where I've corrected myself I've said so instead of quietly editing, so you can see which way the thinking went. If something here contradicts the code, the code is right and I'd like to know.

## Where things live

| File | What it is |
|------|-----------|
| `frontend/src/types/models.ts` | Every type the API deals in. This is the contract. |
| `frontend/src/services/api.ts` | Every call the frontend makes, one function per endpoint. Already written, nothing for you to edit. |
| `frontend/src/lib/apiClient.ts` | Base URL, cookies, error handling. The only file that knows about HTTP. |
| `frontend/.env.example` | How to point the frontend at your server. |

## Getting connected

The frontend is already talking to these endpoints. You don't need to touch any frontend code, you just need to tell me your port.

In development, the Vite dev server proxies `/api` through to whatever `VITE_DEV_API_PROXY` is set to, defaulting to `http://localhost:5000`. That means requests are same-origin while we're working locally, so CORS doesn't come into it at all.

In production the frontend uses `VITE_API_BASE_URL`, the full origin of your server. CORS does apply there, see below.

### Error responses

When something fails, return JSON with a `message` field:

```json
{ "message": "That email address is already registered." }
```

The frontend shows that string to the user as-is, so write it for a human. If there's no `message` the user just sees `Request failed (409)`, which isn't much help to anyone.

Status codes I rely on:

- `401` or `403` on the `/me` endpoints means "not signed in". The frontend turns that into a null user and redirects to the sign-in page, it doesn't treat it as an error.
- `404` on a single-resource GET means "doesn't exist", also handled as null rather than an error.
- Anything else non-2xx surfaces to the user as an error message.

## Notes for MongoDB / Express / Node

Confirmed stack, so a few things specific to it. The first one will break every
endpoint if it's missed, so it's worth doing before anything else.

### Send `id`, not `_id`

Every type in `models.ts` expects a string field called `id`. Mongo gives you
`_id`, and it's an ObjectId rather than a string. Twelve response types and nine
foreign-key fields depend on this, so if documents go out untransformed, nothing
on the frontend will render.

Foreign keys are affected too: `vendorId`, `storeId`, `customerId` and `riderId`
all need to be plain strings, not ObjectIds or populated documents.

With Mongoose, setting it once on each schema is enough:

```js
schema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.password;   // belt and braces, see Security below
    return ret;
  },
});
```

Dropping `password` in the same transform is a cheap way to make sure a hash can
never leak, even if someone forgets a `.select('-password')` somewhere.

### Where the JWT lives

"JWT" doesn't by itself say how the token reaches the browser, and the two
options need different frontend code.

**An httpOnly cookie is what the frontend is currently built for.** It already
sends `credentials: 'include'` on every request, so if you set the cookie on
login there is nothing to change on my side. It's also the safer option: a token
in an httpOnly cookie can't be read by JavaScript, so an XSS bug can't steal it.

```js
res.cookie('token', jwt.sign(payload, secret, { expiresIn: '7d' }), {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

**If you'd rather return the token in the response body** for the frontend to
store and send as `Authorization: Bearer ...`, that's workable, but tell me
first: I'd need to change `lib/apiClient.ts`, and we should talk about where the
token gets stored, because `localStorage` is readable by any XSS on the page.

Either way, please use the same mechanism for all four roles.

### Proximity search

If you want the coordinate work to pay off later, store points as GeoJSON rather
than two loose numbers, and index them:

```js
location: {
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: { type: [Number] },   // [longitude, latitude] — note the order
},
// schema.index({ location: '2dsphere' })
```

Then `$near` or `$geoNear` does the distance work for you. Mongo's coordinate
order is **longitude first**, which catches people out. Keep sending `latitude`
and `longitude` as separate named fields in responses, as the types define, and
convert at the boundary.

You can add this later without a migration, unlike a SQL database. But adding
the index and shape now costs nothing.

### Accepting an order atomically

Two riders can tap Accept on the same order within the same second. In Mongo,
one query does it safely:

```js
const order = await Order.findOneAndUpdate(
  { _id: orderId, status: 'ready', riderId: null },   // only if still unclaimed
  { $set: { status: 'accepted', riderId, acceptedAt: new Date() } },
  { new: true },
);
if (!order) return res.status(409).json({ message: 'That order was already taken.' });
```

Read-then-write in two steps has a race between them; this doesn't.

### CORS with credentials

`cors({ origin: '*' })` will not work, because the frontend sends cookies. You
need an explicit origin and `credentials: true`:

```js
app.use(cors({
  origin: ['http://localhost:5173', /* deployed domains, to follow */],
  credentials: true,
}));
```

---

## Security

### Don't send passwords back

The first version of this document listed `password: string` as a required field on `VendorAccount`, `RiderAccount` and `AdminAccount`. Those are response types, so building to that spec would have meant sending password hashes to the browser on every `/me` call and on `GET /api/admin/vendors`, which returns every vendor on the platform.

That was my mistake, inherited from the frontend's old fake localStorage backend. I've removed it from all three types.

No response body should ever contain a password or a hash. `password` only appears on the input types now: `CreateVendorInput`, `CreateRiderInput` and `CreateCustomerInput`. There's no admin equivalent, because there's no endpoint that creates an admin — see the `AdminAccount` type below.

### Take identity from the session, not the request

`CreateOrderInput` deliberately has no `customerId` field. Read it from the session instead. If the frontend could name the customer, anyone could place an order as anyone else.

Same for `POST /api/stores`, the owning vendor comes from the session, not the body.

### Check ownership, not just login

Being signed in isn't enough on its own:

- A vendor should only be able to touch their own stores, menu items, orders and earnings.
- A rider should only be able to update orders assigned to them.
- Everything under `/api/admin/` needs to reject non-admins, those endpoints expose platform-wide data.

Note that `GET /api/vendors/:id/orders` takes an ID in the path. Please verify it belongs to whoever is calling.

### Accepting an order needs to be atomic

Riders poll for pending orders every 5 seconds, so two of them can hit Accept on the same order at nearly the same moment. `POST /api/orders/:id/accept` has to be race-safe so only the first one wins.

Return `409` or `404` to whoever loses. The frontend already handles it, it shows "That order was already taken by another rider" and refreshes the list.

## CORS

The frontend sends cookies on every request, which makes CORS fussier than usual:

- You need `Access-Control-Allow-Credentials: true`.
- `Access-Control-Allow-Origin` can't be `*` when credentials are allowed. You have to echo back a specific origin from a whitelist.
- If the API and the site end up on different domains in production, cookies need `SameSite=None; Secure`.
- Handle `OPTIONS` preflight, we use `PATCH` and `DELETE` in a few places.

Origins to allow:

| Where | Origin |
|-------|--------|
| Local dev | Nothing needed, the dev server proxies so it's same-origin |
| Preview | Vercel/Netlify preview URLs, I'll send these |
| Production | Production domain, I'll send this |

## Authentication

Four roles, all authenticating the same way against your API.

**Vendors and riders** share one sign-in page at `/vendor-signin`. The user enters email and password, the frontend tries `POST /api/vendors/login` first, and if that comes back empty it tries `POST /api/riders/login`. Whichever succeeds decides where they land.

**Admins** sign in separately at `/admin-login` via `POST /api/admins/login`.

**Customers** sign in at `/signin` via `POST /api/customers/login`. An earlier version of this document claimed customers used Firebase Auth. That was wrong, there's no Firebase anywhere in this project and never has been. Customers work like everyone else.

On page load the frontend calls the relevant `/me` endpoint to see if there's already a session. Return `401` when there isn't.

For the mechanism itself I'd suggest a JWT in an httpOnly cookie, or a plain session cookie, whichever you prefer. The frontend already sends `credentials: 'include'` on every request so either works without changes on my side. The only thing I'd ask is that it's consistent across all four roles.

Please don't return a token in the response body for the frontend to store. Tokens in localStorage are readable by any XSS on the page, and httpOnly cookies avoid that entirely.

## Data types

All defined in `frontend/src/types/models.ts`.

### BusinessType

```typescript
type BusinessType = 'Food' | 'Groceries' | 'Pharmacy' | 'Drinks' | 'Clubs/Lounges';
```

### VendorAccount

```typescript
{
  id: string;
  firstName: string;
  lastName: string;
  businessType: BusinessType;    // resolved category
  businessTypeRaw: string;       // what the vendor actually typed
  phoneNumber: string;
  email: string;
  location: string;
  createdAt: string;             // ISO 8601
  verified: boolean;             // admin approves before dashboard access
}
```

No password field. See Security above.

### VendorStore

```typescript
{
  id: string;
  vendorId: string;              // FK to VendorAccount.id
  name: string;
  businessType: BusinessType;
  categories: string[];          // e.g. ["Nigerian", "Chinese", "Desserts"]
  address: string;
  description: string;
  imageUrl: string;
  latitude?: number | null;      // null until the address is geocoded
  longitude?: number | null;
  distance?: number | null;      // metres from the search point, proximity searches only
  openingTime: string;           // e.g. "8:00 am - 8:00 pm"
  closingTime?: string;
  createdAt: string;
}
```

### MenuItem

```typescript
{
  id: string;
  storeId: string;               // FK to VendorStore.id
  name: string;
  categories: string[];
  price: number;                 // Naira
  description: string;
  imageUrl: string;
  createdAt: string;
}
```

### RiderAccount

```typescript
{
  id: string;
  firstName: string;
  lastName: string;
  vehicleType: string;           // e.g. "Motorcycle", "Bicycle", "Car"
  phoneNumber: string;
  email: string;
  location: string;
  latitude?: number | null;      // last reported position
  longitude?: number | null;
  createdAt: string;
  isOnline?: boolean;
  lastSeen?: string;
  verified: boolean;
}
```

No password field.

### CustomerProfile

```typescript
{
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string | null;
  location: string;              // tracks the default address's city
  joinedDate: string;
  addresses: UserAddress[];
  favoriteVendors: string[];
  notifications: {
    orderUpdates: boolean;
    promotions: boolean;
    newsletter: boolean;
  };
}
```

No password field.

### UserAddress

```typescript
{
  id: string;
  label: string;                 // e.g. "Home", "Office"
  address: string;
  city: string;
  latitude?: number | null;      // set if picked via "use my current location"
  longitude?: number | null;
  isDefault: boolean;
}
```

### PaymentMethod

```typescript
type PaymentMethod = 'cash_on_delivery' | 'card_on_delivery';
```

Store the raw value, not the label. The frontend does its own display text, so
`cash_on_delivery` reaches the screen as "Cash on Delivery". See Payments below
for why the list is this short.

### Order

```typescript
{
  id: string;
  storeId: string;               // FK to VendorStore.id
  storeName: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerLocation: string;
  customerAddress: string;
  customerLatitude?: number | null;   // where to deliver, if the customer shared a point
  customerLongitude?: number | null;
  riderId: string | null;        // FK to RiderAccount.id, null until accepted
  items: { name: string; quantity: number; price: number }[];
  totalAmount: number;           // sum of price × quantity
  deliveryFee: number;
  paymentMethod: PaymentMethod;  // see Payments below — nothing is charged online
  status: OrderStatus;
  createdAt: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
}
```

### CreateOrderInput

What `POST /api/orders` receives. Note what's missing: no `id`, no `customerId`,
no `status`, no `totalAmount`. Those are all yours to derive — the customer from
the session, the total from the items, the status from the lifecycle.

```typescript
{
  storeId: string;
  storeName: string;
  customerName: string;
  customerPhone: string;
  customerLocation: string;
  customerAddress: string;
  customerLatitude?: number | null;
  customerLongitude?: number | null;
  items: { name: string; quantity: number; price: number }[];
  deliveryFee: number;
  paymentMethod: PaymentMethod;
}
```

Don't trust the prices in `items`. They come from a browser and a customer with
devtools can send whatever they like, so look each item up by store and recompute
`totalAmount` server-side.

### Transaction

Customer-facing order history, shown on the profile page.

```typescript
{
  id: string;
  orderId: string;
  date: string;
  status: 'delivered' | 'in-transit' | 'preparing' | 'cancelled' | 'refunded';
  items: { name: string; quantity: number; price: number; image: string }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  vendorName: string;
  vendorImage?: string;
  paymentMethod: PaymentMethod;
  deliveryAddress: string;
}
```

### AdminAccount

```typescript
{
  id: string;
  username: string;
  email: string;
  createdAt: string;
}
```

There's no endpoint for creating one, and that's deliberate. An earlier version
of `api.ts` had a `POST /api/admins` function that nothing ever called, which
would have left you building a public endpoint for minting platform
administrators. I've deleted it. Seed the first admin yourself with a script or
straight into the database, and if the platform ever needs admins to invite
other admins we can design that properly rather than by accident.

### ContactMessageInput

What the contact form on the marketing site sends.

```typescript
{
  firstName: string;
  lastName: string;
  email: string;
  message: string;
}
```

No password field.

### EarningsPeriod

```typescript
{
  today: number;
  thisMonth: number;
  thisYear: number;
  todayOrders: number;
  monthOrders: number;
  yearOrders: number;
}
```

### StoreEarnings

```typescript
{
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
}
```

## Endpoints

### Vendors

| Method | Endpoint | What it does | Body | Returns |
|--------|----------|--------------|------|---------|
| `POST` | `/api/vendors` | Create vendor account | `CreateVendorInput` | `VendorAccount` |
| `POST` | `/api/vendors/login` | Sign in | `{ email, password }` | `VendorAccount`, or 401 |
| `GET` | `/api/vendors/me` | Current vendor from session | | `VendorAccount`, or 401 |
| `POST` | `/api/vendors/logout` | Clear session | | 204 |
| `GET` | `/api/admin/vendors` | All vendors, admin only | | `VendorAccount[]` |

`CreateVendorInput` looks like this:

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "businessType": "Food",
  "phoneNumber": "+2348012345678",
  "email": "john@example.com",
  "location": "Lagos, Nigeria",
  "password": "securePassword123"
}
```

### Stores

| Method | Endpoint | What it does | Body | Returns |
|--------|----------|--------------|------|---------|
| `POST` | `/api/stores` | Create store for current vendor | `CreateStoreInput` | `VendorStore` |
| `PATCH` | `/api/stores/:id` | Update store | `UpdateStoreInput` | `VendorStore` |
| `GET` | `/api/stores/:id` | One store | | `VendorStore`, or 404 |
| `GET` | `/api/vendors/:vendorId/stores` | A vendor's stores | | `VendorStore[]` |
| `GET` | `/api/stores?address=...&category=...&lat=...&lng=...` | Search, for the explore page | | `VendorStore[]` |
| `GET` | `/api/stores/:id/location` | Address, for rider navigation | | `{ address: string }` |
| `GET` | `/api/admin/stores` | All stores, admin only | | `VendorStore[]` |

Both query params on the search endpoint are optional. `category` is one of the `BusinessType` values, and the frontend leaves it off entirely rather than sending `"All"`.

### Menu items

| Method | Endpoint | What it does | Body | Returns |
|--------|----------|--------------|------|---------|
| `POST` | `/api/menu-items` | Create item | `CreateMenuItemInput` | `MenuItem` |
| `PATCH` | `/api/menu-items/:id` | Update item | `Partial<MenuItem>` | `MenuItem` |
| `DELETE` | `/api/menu-items/:id` | Delete item | | 204 |
| `GET` | `/api/stores/:storeId/menu-items` | All items for a store | | `MenuItem[]` |

### Riders

| Method | Endpoint | What it does | Body | Returns |
|--------|----------|--------------|------|---------|
| `POST` | `/api/riders` | Create rider account | `CreateRiderInput` | `RiderAccount` |
| `POST` | `/api/riders/login` | Sign in | `{ email, password }` | `RiderAccount`, or 401 |
| `GET` | `/api/riders/me` | Current rider from session | | `RiderAccount`, or 401 |
| `POST` | `/api/riders/logout` | Log out | | 204 |
| `PATCH` | `/api/riders/:id/status` | Go online or offline | `{ isOnline: boolean }` | 204 |
| `PATCH` | `/api/riders/:id/location` | Report current position | `{ latitude, longitude }` | 204 |
| `GET` | `/api/riders/:id` | One rider | | `RiderAccount`, or 404 |
| `GET` | `/api/riders/online` | Everyone currently online | | `RiderAccount[]` |
| `GET` | `/api/admin/riders` | All riders, admin only | | `RiderAccount[]` |

When a rider logs out, set `isOnline` to false and update `lastSeen`.

### Customers

This whole section was missing from the first version of the document. The customer-facing half of the app had no endpoints specced at all.

| Method | Endpoint | What it does | Body | Returns |
|--------|----------|--------------|------|---------|
| `POST` | `/api/customers` | Register | `{ username, email, password }` | `CustomerProfile` |
| `POST` | `/api/customers/login` | Sign in | `{ email, password }` | `CustomerProfile`, or 401 |
| `GET` | `/api/customers/me` | Current customer | | `CustomerProfile`, or 401 |
| `POST` | `/api/customers/logout` | Clear session | | 204 |
| `PATCH` | `/api/customers/me` | Update profile | partial `CustomerProfile` | `CustomerProfile` |
| `POST` | `/api/customers/me/password` | Change password | `{ currentPassword, newPassword }` | 204 |
| `DELETE` | `/api/customers/me` | Delete account | | 204 |
| `GET` | `/api/customers/me/transactions` | Order history | | `Transaction[]` |

On the password change, you verify `currentPassword`. The frontend has no copy of it to check against, which is deliberate.

### Customer addresses

| Method | Endpoint | Returns |
|--------|----------|---------|
| `POST` | `/api/customers/me/addresses` | `CustomerProfile` |
| `PATCH` | `/api/customers/me/addresses/:id` | `CustomerProfile` |
| `DELETE` | `/api/customers/me/addresses/:id` | `CustomerProfile` |
| `POST` | `/api/customers/me/addresses/:id/default` | `CustomerProfile` |

These all return the whole updated `CustomerProfile` rather than just the address. The frontend replaces its entire user object with whatever comes back, so the two can't drift apart.

That does mean the default-address rules live on your side. The frontend used to enforce these and no longer does:

- Setting one address as default unsets the others.
- The first address a customer adds becomes the default automatically.
- Deleting the default promotes another address, if any are left.
- `CustomerProfile.location` should follow the default address's city.

### Orders

| Method | Endpoint | What it does | Body | Returns |
|--------|----------|--------------|------|---------|
| `POST` | `/api/orders` | Place an order | `CreateOrderInput` | `Order` |
| `GET` | `/api/orders/:id` | One order | | `Order`, or 404 |
| `GET` | `/api/orders/pending?location=...&lat=...&lng=...` | Ready orders near a rider | | `Order[]` |
| `GET` | `/api/riders/:id/orders` | A rider's orders | | `Order[]` |
| `GET` | `/api/vendors/:id/orders` | Orders across a vendor's stores | | `Order[]` |
| `POST` | `/api/orders/:id/accept` | Rider accepts | `{ riderId }` | `Order`, or 409 |
| `PATCH` | `/api/orders/:id/status` | Update status | `{ status }` | `Order` |
| `GET` | `/api/admin/orders` | All orders, admin only | | `Order[]` |
| `GET` | `/api/admin/orders/stats` | Order statistics | | see below |

One more thing about `POST /api/orders`, because it isn't obvious from the type.
**An order belongs to exactly one store.** `storeId` is a single field, the
vendor dashboard queries orders by store, and the whole prepare/ready/pickup
flow assumes one kitchen. The frontend now blocks checkout if someone has
managed to get items from two stores into their cart, but please reject it
server-side too. A basket that spans two stores is nobody's order.

Order stats response:

```json
{
  "totalOrders": 150,
  "todayOrders": 12,
  "pendingOrders": 3,
  "activeOrders": 5,
  "completedOrders": 130,
  "totalRevenue": 2500000,
  "todayRevenue": 185000,
  "onlineRiders": 8,
  "totalRiders": 25
}
```

### Admin

| Method | Endpoint | What it does | Body | Returns |
|--------|----------|--------------|------|---------|
| `POST` | `/api/admins/login` | Sign in | `{ email, password }` | `AdminAccount`, or 401 |
| `GET` | `/api/admins/me` | Current admin | | `AdminAccount`, or 401 |
| `POST` | `/api/admins/logout` | Clear session | | 204 |
| `GET` | `/api/admin/stats` | Platform statistics | | `PlatformStats` |
| `GET` | `/api/admin/activity` | Recent activity feed | | `ActivityItem[]` |
| `GET` | `/api/admin/pending` | Awaiting verification | | `PendingItem[]` |
| `POST` | `/api/admin/verify` | Approve or reject | `{ id, type, action }` | 204 |

Platform stats response:

```json
{
  "totalVendors": 45,
  "totalStores": 62,
  "totalRiders": 25,
  "totalMenuItems": 340,
  "totalOrders": 1500,
  "totalRevenue": 25000000
}
```

Verify request body, where `type` is `"vendor"` or `"rider"` and `action` is `"approve"` or `"reject"`:

```json
{
  "id": "vendor-123",
  "type": "vendor",
  "action": "approve"
}
```

### Marketing site

Two forms on the public pages, both of which used to be theatre and now post for real.

| Method | Endpoint | What it does | Body | Returns |
|--------|----------|--------------|------|---------|
| `POST` | `/api/newsletter` | Subscribe an email | `{ email }` | 204 |
| `POST` | `/api/contact` | Message from the contact form | `ContactMessageInput` | 204 |

For the newsletter, return `409` with a message if the address is already subscribed. The frontend shows your `message` text directly.

The contact form is new. It sat there for months doing `console.log` and dropping every message on the floor, which is worse than not having a form at all — someone types out a real problem, sees the button work, and hears nothing back. It now calls the endpoint above.

What happens to a message after you store it is your call. Emailing it to the support address and keeping a row in the database is the obvious version. Both endpoints are unauthenticated and sit on a public page, so they're the two most likely things on this API to get hit by a bot: rate limit them by IP, and consider a honeypot field if it becomes a problem.

### Earnings

| Method | Endpoint | Returns |
|--------|----------|---------|
| `GET` | `/api/vendors/:id/earnings` | `EarningsPeriod` |
| `GET` | `/api/vendors/:id/stores/earnings` | `StoreEarnings[]` |
| `GET` | `/api/stores/:id/earnings` | `StoreEarnings` |
| `GET` | `/api/riders/:id/earnings` | `EarningsPeriod` |
| `GET` | `/api/admin/stores/earnings` | `StoreEarnings[]` |
| `GET` | `/api/admin/earnings` | `EntityEarnings[]` |

Vendor earnings are the sum of `totalAmount` across delivered orders for that vendor's stores. Rider earnings are the sum of `deliveryFee` across delivered orders assigned to that rider.

## How the app actually works

### Order lifecycle

```
Customer places order    ->  pending
Vendor starts preparing  ->  preparing
Vendor marks ready       ->  ready
Rider accepts            ->  accepted      (riderId gets set)
Rider picks up           ->  picked_up     (pickedUpAt set)
Rider on the way         ->  in_transit
Rider delivers           ->  delivered     (deliveredAt set)
                         or  cancelled     (any point before delivery)
```

### Polling

Four screens poll every 5 seconds: the vendor dashboard, the vendor orders page, the rider dashboard and the admin dashboard. Worth knowing when you size rate limits, since an admin dashboard left open in a tab fires eight concurrent requests every five seconds.

This is a placeholder. If you'd rather do WebSockets I'm happy to switch, it's contained to a few `useEffect` blocks.

### Verification

New vendors and riders both register with `verified: false` and see a "pending verification" screen until an admin approves them. There's a Check Status button that re-fetches `/me`, so approval shows up without them signing out and back in.

### Business type

Vendors type their business type as free text at signup, something like "Restaurant" or "chemist". The frontend maps that onto one of the five `BusinessType` categories by keyword. The original text goes in `businessTypeRaw`, the mapped category in `businessType`. That's all frontend-side, you just store both.

### Explore page and location

Customers search stores by address. `GET /api/stores?address=...` sends a plain text string, and matching on that text is the baseline behaviour.

If an address returns nothing, the frontend falls back to requesting stores with no address filter, so the page isn't empty.

**The frontend now also sends coordinates when it has them.** Two extra query params, `lat` and `lng`, appear on that endpoint. When they're present, please do a real proximity search and sort by distance rather than matching the address text. You can optionally include a `distance` field in metres on each store; the frontend will read it if it's there and ignore it if not.

Coordinates come from the browser's geolocation API when a customer taps "use my current location", or from a saved address that already has them. They're absent when someone typed an address by hand, because turning text into coordinates is geocoding and needs a paid service we haven't set up. So treat `lat`/`lng` as optional on every endpoint that accepts them, and keep the text fallback working.

The same applies to riders. `GET /api/orders/pending` now accepts `lat` and `lng` alongside `location`, and there's a new endpoint for a rider reporting where they are:

| Method | Endpoint | Body | Returns |
|--------|----------|------|---------|
| `PATCH` | `/api/riders/:id/location` | `{ latitude, longitude }` | 204 |

The rider app calls that when someone goes online and shares their position. It's what would drive dispatch and the admin fleet view later.

Which fields are now optional-but-present in the types: `latitude` and `longitude` on `VendorStore`, `UserAddress` and `RiderAccount`, plus `distance` on `VendorStore`. All nullable. Nothing breaks if you always return null, but please do add the columns now while the database is empty. Adding them later means a migration plus geocoding every address you've accumulated, one at a time, through a paid API.

`POST /api/orders` also carries `customerLatitude` and `customerLongitude` when the customer shared a point. Store them on the order so the rider can navigate to the exact spot rather than parsing the address text.

### The geocoding gap, and why it belongs to you

The piece still missing is geocoding: turning "12 Admiralty Way, Lekki" into a point, and the reverse.

This matters more than it sounds. A customer who taps "use my current location" gets accurate coordinates but no readable address, so right now the UI just says "Current location". A vendor typing their store address gets no coordinates at all, which means their store can't appear in a proximity search.

**Please put this on the server rather than in the frontend, when we get to it.** Two reasons. A maps API key in frontend JavaScript is visible to anyone who opens devtools, and they can run up the bill. And the same coordinates always resolve to the same address, so caching on your side turns most lookups into a database hit instead of a paid API call.

Two endpoints would cover it:

| Method | Endpoint | What it does | Returns |
|--------|----------|--------------|---------|
| `GET` | `/api/geocode/reverse?lat=...&lng=...` | Point to address | `{ address, city }` |
| `GET` | `/api/geocode/forward?q=...` | Address text to point, for autocomplete | `{ address, city, latitude, longitude }[]` |

Neither is needed to launch, and neither is built on my side yet. Flagging them so the shape is in your head before you design the stores table.

Whoever pays for the key is a separate conversation. Google Places and Mapbox both have free tiers that would comfortably cover early usage.

### Images

Store and menu item images can be a URL or an upload. Uploads currently get turned into base64 data URLs on the frontend, which is fine for testing but will bloat your database. Worth moving to S3 or Cloudinary and storing the URL, whenever you get to it.

One thing I should flag rather than leave for you to find. When a vendor pastes something that isn't obviously an image — a bare `example.com/menu` with no scheme and no file extension — `lib/imageUtils.ts` fetches that page through **r.jina.ai**, a public text-extraction proxy, and reads its `og:image` tag. It's a third party nobody has signed an agreement with, it sees whatever URL the vendor typed, and there's no SLA behind it.

The path almost never runs, since anything starting with `http://` or `https://` returns before it. But it's an outbound dependency living in the frontend and it should be on the record. When uploads move to S3 or Cloudinary I'd like to delete it outright. If you'd rather own the resolution server-side in the meantime, say so and I'll take it out of the frontend.

### Currency

Everything is Nigerian Naira. Prices are plain numbers, no currency field, formatting happens on the frontend.

## Payments

This section didn't exist before, and its absence was itself the problem. Nothing here said what happens with money, so the honest reading was that payments were somebody else's job — which is exactly how a delivery platform ships without a way to get paid.

So, stated plainly: **there is no payment gateway in this version, and I'm not asking you to build one.** No Paystack, no Flutterwave, no card capture anywhere in the frontend. The customer settles with the rider at the door.

What that means concretely:

- `POST /api/orders` now carries a `paymentMethod` field, one of `cash_on_delivery` or `card_on_delivery`. Store it on the order and return it on `Order` and `Transaction`.
- The frontend currently always sends `cash_on_delivery`. The second value exists because riders carrying a POS terminal is common enough here that the type should already allow for it, and adding an enum value later is a migration.
- The checkout button used to say "Pay Securely" and charged nothing. It now says "Place Order" and tells the customer they'll pay the rider, which is at least true.
- **Nothing in your API should treat an order as paid.** There's no payment status, no reconciliation, no refund flow. An order that reaches `delivered` was presumably paid in person, and that's as much as the system knows.

Two things worth deciding as a team rather than letting them drift:

**The marketing copy already promises more than this.** `Features.tsx` advertises "multiple payment options including card, mobile money, and cash on delivery — all secured with industry-standard encryption", and `Terms.tsx` says payment is taken at order time unless cash on delivery is chosen. Neither is true today. Either the copy gets softened before launch or the gateway gets built before launch, but shipping both as they are means promising customers something the product doesn't do.

**When a gateway does land, it's mostly your side.** The frontend would need a real payment-method picker and somewhere to send the customer for authorisation, which is maybe a day. The rest — initialising a transaction, holding the order in an unpaid state until the provider confirms, verifying the webhook signature, handling the customer who closes the tab mid-payment, refunds — is all server-side, and it's the part that has to be right. Keys never come near the frontend. Worth designing the orders table with that in mind now, even while it's cash only.

## Suggested schema

Rough shape, adjust as you like. Written as tables since that's the clearest way
to show the relationships, but they map to collections. In Mongo you'd likely
embed `customer_addresses` inside the customer document rather than keeping it
separate, and `items` on an order is already an embedded array.

Whatever you do, the API responses still need to match the types above, so
`id` as a string on everything.

```
vendors
├── id (PK)
├── first_name, last_name
├── business_type, business_type_raw
├── phone_number, email, location
├── password_hash
├── verified (boolean)
├── created_at

customers
├── id (PK)
├── first_name, last_name
├── email, phone, location
├── password_hash
├── avatar_url
├── favorite_vendors (JSON array)
├── notify_order_updates, notify_promotions, notify_newsletter
├── created_at

customer_addresses
├── id (PK)
├── customer_id (FK -> customers)
├── label, address, city
├── latitude, longitude (nullable, not populated yet, see Explore page above)
├── is_default (boolean)

stores
├── id (PK)
├── vendor_id (FK -> vendors)
├── name, business_type
├── categories (JSON array)
├── address, description, image_url
├── latitude, longitude (nullable, not populated yet, see Explore page above)
├── opening_time, closing_time
├── created_at

menu_items
├── id (PK)
├── store_id (FK -> stores)
├── name, categories (JSON array)
├── price, description, image_url
├── created_at

riders
├── id (PK)
├── first_name, last_name
├── vehicle_type
├── phone_number, email, location
├── latitude, longitude (nullable, not populated yet, see Explore page above)
├── password_hash
├── is_online, last_seen
├── verified (boolean)
├── created_at

orders
├── id (PK)
├── store_id (FK -> stores)
├── store_name
├── customer_id (FK -> customers)
├── customer_name, customer_phone
├── customer_location, customer_address
├── rider_id (FK -> riders, nullable)
├── items (JSON array)
├── total_amount, delivery_fee
├── payment_method (enum: cash_on_delivery | card_on_delivery)
├── status (enum)
├── created_at, accepted_at, picked_up_at, delivered_at

admins
├── id (PK)
├── username, email, password_hash
├── created_at

newsletter_subscribers
├── id (PK)
├── email (unique)
├── created_at

contact_messages
├── id (PK)
├── first_name, last_name
├── email, message
├── created_at
```

## Suggested build order

So I can wire up and test screen by screen instead of waiting for everything:

1. Auth for all four roles
2. Stores, including the explore search
3. Menu items
4. Orders and the status lifecycle
5. Earnings and admin stats

`/api/newsletter` and `/api/contact` sit outside that list. They don't depend on
anything else and they're about twenty minutes each, so they're good ones to do
first if you want something working end to end before the hard parts.

## If something's unclear

- `frontend/src/types/models.ts` has the exact types
- `frontend/src/services/api.ts` has every call the frontend makes, each with a comment naming its endpoint
- `frontend/src/pages/` shows how the data actually gets used on screen

Or just ask me.
