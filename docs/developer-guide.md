# UNS Shipping Manager — Developer Guide

Technical reference for engineers setting up, extending, or maintaining the application.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Local Development Setup](#local-development-setup)
4. [Environment Variables](#environment-variables)
5. [Database Schema](#database-schema)
6. [Authentication & Authorization](#authentication--authorization)
7. [API Reference](#api-reference)
8. [Server Actions](#server-actions)
9. [Key Components](#key-components)
10. [External Integrations](#external-integrations)
11. [State Management & Data Fetching](#state-management--data-fetching)
12. [Testing](#testing)
13. [Deployment](#deployment)
14. [Code Conventions](#code-conventions)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 (strict mode) |
| Runtime | React 19 |
| Database | Supabase (PostgreSQL + Auth) |
| Styling | Tailwind CSS v4 |
| UI primitives | Radix UI |
| Data tables | TanStack React Table 8 |
| Server-state cache | TanStack React Query 5 |
| Validation | Zod |
| Icons | Lucide React |
| Toasts | Sonner |
| Analytics | PostHog, Vercel Analytics |
| Unit tests | Vitest 4 |
| E2E tests | Playwright 1.57 |

---

## Project Structure

```
shipstation-lite/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout (providers, fonts)
│   ├── page.tsx                # Root redirect (→ /dashboard or /auth/login)
│   ├── globals.css             # Global styles
│   ├── api/
│   │   ├── auth/confirm/       # Supabase email confirmation callback
│   │   └── shipstation/
│   │       ├── rates/          # POST – fetch shipping rates
│   │       └── metadata/       # GET  – carriers + services list
│   ├── auth/                   # Login, forgot-password, callback, update-password
│   ├── dashboard/              # Authenticated user area
│   │   ├── page.tsx            # Label creation wizard
│   │   ├── addresses/          # Address manager
│   │   ├── packages/           # Package template manager
│   │   └── labels/             # Label history
│   ├── admin/                  # Admin-only area
│   │   ├── page.tsx            # Aggregate metrics
│   │   ├── users/              # User management
│   │   ├── labels/             # All labels across users
│   │   └── addresses/          # All addresses across users
│   ├── account/                # Profile + password settings
│   └── feedback/               # Feedback form
│
├── components/
│   ├── ui/                     # Radix-based design system primitives
│   ├── shipping/               # Label creation wizard components
│   ├── dashboard/              # AddressManager, PackageManager, StatusBadge
│   ├── admin/                  # AdminTable, user management components
│   ├── labels/                 # LabelsTable, filters, date picker
│   ├── account/                # Account settings forms
│   ├── providers/              # ReactQueryProvider, CreateLabelProvider
│   └── [root]                  # App shell: sidebar, header, nav, auth forms
│
├── lib/
│   ├── actions/                # Next.js Server Actions (data mutations)
│   │   ├── shipping.ts         # createShippingLabelAction, void, delete
│   │   ├── addresses.ts        # CRUD for addresses
│   │   ├── packages.ts         # CRUD for package templates
│   │   ├── labels.ts           # Label reads + void
│   │   ├── admin-users.ts      # Role management, upcharge config, invites
│   │   ├── profiles.ts         # Profile name update
│   │   └── feedback.ts         # Feedback submission
│   ├── queries/                # Read-only Supabase query helpers
│   ├── shipstation/            # ShipStation API client + types
│   ├── fedex/                  # FedEx OAuth client
│   └── supabase/               # Supabase client factories + generated types
│
├── types/                      # Shared TypeScript types
├── supabase/
│   └── migrations/             # SQL migration files
└── __tests__/
    ├── unit/                   # Vitest unit tests
    └── e2e/                    # Playwright end-to-end tests
```

---

## Local Development Setup

### Prerequisites

- Node.js LTS (20+)
- A Supabase project
- ShipStation account with API credentials
- (Optional) FedEx developer account for address validation

### Steps

```bash
# 1. Clone and install
git clone <repo-url>
cd shipstation-lite
npm install

# 2. Configure environment
cp .env.example .env   # edit with your values (see Environment Variables)

# 3. Apply database schema
# In your Supabase dashboard → SQL Editor, run:
# supabase/migrations/20251016_shipstation_setup.sql

# 4. Regenerate Supabase types if schema changes (optional)
npm run supabase-gen

# 5. Start dev server
npm run dev            # http://localhost:3000
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key for admin server actions |
| `SHIPSTATION_API_KEY` | Yes | ShipStation API key |
| `SHIPSTATION_API_SECRET` | Yes | ShipStation API secret |
| `SHIPSTATION_API_BASE` | No | Override ShipStation base URL (default: `https://ssapi.shipstation.com`) |
| `FEDEX_API_KEY` | No | FedEx client ID — enables address validation |
| `FEDEX_SECRET_KEY` | No | FedEx client secret |
| `NEXT_PUBLIC_SITE_URL` | No | Canonical site URL for invite redirect links |
| `E2E_EMAIL` / `E2E_PASSWORD` | No | Credentials for Playwright auth setup |

> `NEXT_PUBLIC_*` variables are exposed to the browser. Never put secrets in them.

---

## Database Schema

All tables live in the public schema unless noted. Row-Level Security (RLS) is enabled on every table.

### `profiles`

Extends Supabase Auth users. Created automatically via a trigger on `auth.users`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | FK → `auth.users.id` |
| `email` | `text` | |
| `full_name` | `text` | nullable |
| `role` | `text` | `'user'` or `'admin'` (default `'user'`) |
| `warehouse_id` | `int` | nullable, FK to `warehouses` |
| `created_at` / `updated_at` | `timestamptz` | |

**RLS:** Users can read and update their own row. Admins (`is_admin()`) can read all rows.

---

### `addresses`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `profiles.id` |
| `label` | `text` | User-visible nickname |
| `contact_name`, `company`, `phone`, `email` | `text` | |
| `address_line1`, `address_line2` | `text` | |
| `city`, `state`, `postal_code`, `country` | `text` | |
| `is_residential` | `bool` | |
| `is_validated` | `bool` | FedEx validation result |
| `created_at` | `timestamptz` | |

**RLS:** Users can CRUD their own addresses. Admins can read all.

---

### `shipping_labels`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `profiles.id` |
| `to_address_id` / `ship_from_id` | `uuid` | FK → `addresses` (nullable if ad-hoc) |
| `ship_to_snapshot` | `jsonb` | Point-in-time address snapshot |
| `carrier_code`, `service_code`, `package_code` | `text` | ShipStation identifiers |
| `weight_value`, `weight_unit` | numeric / text | |
| `length`, `width`, `height`, `units` | numeric / text | |
| `confirmation` | `text` | Delivery confirmation type |
| `shipment_cost`, `insurance_cost` | `numeric` | Per-package costs |
| `total_shipment_cost`, `total_insurance_cost` | `numeric` | Order totals |
| `tracking_number` | `text` | |
| `label_data_base64` | `text` | Base64-encoded PDF |
| `shipment_id`, `order_number`, `order_id` | `text` / `int` | ShipStation references |
| `voided_at` | `timestamptz` | null = active |
| `paid_at` | `timestamptz` | |
| `is_address_validated` | `bool` | |
| `insurance_options` | `jsonb` | |
| `advanced_options` | `jsonb` | ShipStation advanced options |
| `created_at` | `timestamptz` | |

**RLS:** Users see own labels. Admins see all.

---

### `packages`

Saved package templates per user.

| Column | Type |
|--------|------|
| `id` | `uuid` |
| `user_id` | `uuid` |
| `nickname` | `text` |
| `length`, `width`, `height` | `numeric` |
| `dimension_unit` | `text` |
| `weight`, `weight_unit` | `numeric` / `text` |
| `created_at` / `updated_at` | `timestamptz` |

---

### `warehouses`

Maps ShipStation warehouse IDs to names.

| Column | Type |
|--------|------|
| `id` | `uuid` |
| `warehouse_id` | `int` |
| `warehouse_name` | `text` |

---

### `app_feedback`

| Column | Type |
|--------|------|
| `id` | `uuid` |
| `user_id` | `uuid` |
| `subject`, `details` | `text` |
| `issue_type`, `issue_section` | `text` |
| `status` | `text` |
| `created_at` / `resolved_at` | `timestamptz` |

---

### `private.user_upcharges`

Stored in the `private` schema — not accessible via the anon key.

| Column | Type |
|--------|------|
| `user_id` | `uuid` |
| `unit` | `text` (`'dollars'` or `'percent'`) |
| `value` | `numeric` |
| `created_at` / `updated_at` | `timestamptz` |

---

### Helper Function

```sql
CREATE FUNCTION is_admin() RETURNS bool AS $$
  SELECT role = 'admin' FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;
```

Used in RLS policies. To promote a user to admin:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'user@example.com';
```

---

## Authentication & Authorization

### Auth Flow

1. User submits credentials at `/auth/login`.
2. Supabase Auth issues a session (JWT stored in cookies via `@supabase/ssr`).
3. Email confirmation is handled by `/api/auth/confirm` (Supabase callback).
4. Password reset: `/auth/forgot-password` → email → `/auth/update-password`.

### Supabase Client Factories (`lib/supabase/`)

| File | Client type | Used in |
|------|-------------|---------|
| `server.ts` | Server (cookie-based) | Server Components, Server Actions |
| `client.ts` | Browser | Client Components |
| `admin.ts` | Service role | Admin Server Actions only |

### Route Guards

Server-side helpers in `lib/queries/`:

```ts
requireUserProfile()   // Redirects to /auth/login if unauthenticated
requireAdminProfile()  // Redirects if not admin
```

These are called at the top of protected page components.

---

## API Reference

### `POST /api/shipstation/rates`

Fetches available shipping rates for a shipment and applies any user upcharge.

**Request body:**
```json
{
  "carrierCode": "fedex",
  "serviceCode": null,
  "packageCode": "package",
  "fromPostalCode": "90210",
  "toState": "CA",
  "toCountry": "US",
  "toPostalCode": "10001",
  "toCity": "New York",
  "weight": { "value": 5, "units": "pounds" },
  "dimensions": { "units": "inches", "length": 12, "width": 8, "height": 6 },
  "confirmation": "none",
  "residential": false
}
```

**Response:** Array of rate objects from ShipStation with `shipmentCost`, `otherCost`, `serviceName`, `serviceCode`, `carrierCode`.

Upcharge is read from `private.user_upcharges` for the authenticated user and applied server-side.

---

### `GET /api/shipstation/metadata`

Returns available carriers and services from ShipStation. Used to populate dropdowns.

**Response:**
```json
{
  "carriers": [...],
  "services": [...]
}
```

---

### `GET /api/auth/confirm`

Supabase Auth email confirmation callback. Exchanges the `token_hash` in the URL for a session. Redirects to `/dashboard` on success.

---

## Server Actions

All mutations use Next.js Server Actions (`"use server"`). They parse `FormData`, validate with Zod, interact with Supabase, and return a state object consumed by `useActionState`.

### Shipping (`lib/actions/shipping.ts`)

```ts
createShippingLabelAction(prevState, formData)
// Creates a ShipStation order + label. Handles multi-package shipments.
// Saves label record(s) to shipping_labels.
// Returns { success, trackingNumber, labelDataBase64, error }.

voidShippingLabelAction(prevState, formData)
// Voids a label in ShipStation and sets voided_at in the DB.

deleteShippingLabel(labelId: string)
// Hard-deletes a label record (admin only).
```

### Addresses (`lib/actions/addresses.ts`)

```ts
createAddress(prevState, formData)
updateAddress(prevState, formData)
deleteAddress(addressId: string)
```

### Packages (`lib/actions/packages.ts`)

```ts
createPackage(prevState, formData)
updatePackage(prevState, formData)
deletePackage(packageId: string)
```

### Admin Users (`lib/actions/admin-users.ts`)

```ts
updateUserRole(userId, role)          // 'user' | 'admin'
upsertUserUpcharge(userId, unit, value)
deleteUserUpcharge(userId)
inviteUser(email)                     // Sends Supabase invite email
```

### Profiles (`lib/actions/profiles.ts`)

```ts
updateProfileName(prevState, formData)
```

---

## Key Components

### `CreateLabelWizard` (`components/shipping/create-label-wizard.tsx`)

Four-step wizard orchestrating the label creation flow. Manages step state and passes data to child section components.

Steps:
1. `AddressSection` — Ship-from / ship-to selection
2. `PackageSection` — Package dimensions and weights (supports multi-package)
3. `ShipmentDetailsSection` — Rate selection (calls `/api/shipstation/rates`)
4. `ReviewSection` — Summary + calls `createShippingLabelAction`

State is managed via `CreateLabelContext` (`components/providers/create-label-provider.tsx`) so child components can read/write wizard data without prop drilling.

---

### `AdminTable` (`components/admin/admin-table.tsx`)

Generic TanStack React Table wrapper used across all admin list views. Accepts a column definition and data array. Supports sorting, pagination, and action menus.

---

### `LabelsTable` (`components/labels/`)

User-facing label history table with:
- Date range filtering (date-fns)
- Status filtering (active / voided)
- Download action (base64 → PDF blob)
- Void action (calls `voidShippingLabelAction`)

---

### `AddressManager` / `PackageManager` (`components/dashboard/`)

CRUD interfaces for saved addresses and package templates. Use dialog sheets for create/edit forms backed by the respective Server Actions.

---

## External Integrations

### ShipStation (`lib/shipstation/`)

REST client using HTTP Basic Auth (`API_KEY:API_SECRET`).

Key functions:

```ts
createOrder(orderPayload)             // Creates a ShipStation order
createLabelForOrder(orderId, payload) // Generates a label for an order
getRates(ratePayload)                 // Fetches rate quotes
listCarriers()                        // Lists enabled carriers
listServices(carrierCode)             // Lists services for a carrier
listPackages(carrierCode)             // Lists package types
listWarehouses()                      // Lists warehouses
voidLabel(shipmentId)                 // Voids a shipment
cancelOrder(orderId)                  // Cancels an order
```

Supported FedEx service codes: `fedex_ground`, `fedex_home_delivery`, `fedex_2day`, `fedex_standard_overnight`, `fedex_priority_overnight`, `fedex_first_overnight`.

---

### FedEx (`lib/fedex/`)

Used only for optional address validation. Implements OAuth 2.0 client credentials flow — tokens are fetched and reused server-side. The client is never instantiated in browser code.

```ts
const fedex = new FedExClient()
await fedex.post('/address/v1/addresses/resolve', payload)
```

---

## State Management & Data Fetching

- **Server Components** perform initial data loads (Supabase queries) — no client JS needed for first paint.
- **TanStack React Query** handles client-side refetching where needed (e.g., after mutations).
- **CreateLabelContext** (`components/providers/create-label-provider.tsx`) stores wizard form state across steps.
- **Server Actions + `useActionState`** handle all form submissions with progressive enhancement.

---

## Testing

### Unit Tests (Vitest)

```bash
npm run test:run      # Run once
npm run test          # Watch mode
```

Located in `__tests__/unit/`. Cover:
- `lib/actions/shipping.ts` — label creation and void logic
- `lib/actions/addresses.ts`, `packages.ts`, `labels.ts`
- `lib/shipstation/client.ts` — API client methods
- `lib/fedex/client.ts` — OAuth token flow

Mocks: Supabase client and ShipStation/FedEx HTTP calls are mocked per-test.

---

### E2E Tests (Playwright)

```bash
npm run test:e2e         # UI mode (headed)
npm run test:e2e:run     # Headless CI mode
```

Located in `__tests__/e2e/`. Cover:
- Auth setup (`auth.setup.ts`) — logs in and saves session state
- Dashboard flows — address/package management
- Label creation wizard — full happy path

Browsers: Chromium, Firefox, WebKit (configured in `playwright.config.ts`).

Set `E2E_EMAIL` and `E2E_PASSWORD` in `.env` for the auth setup step.

---

## Deployment

The application is designed for Vercel deployment.

- **Build:** `npm run build`
- **PostHog analytics** are proxied via Next.js rewrites in `next.config.ts` to avoid ad blockers.
- **Vercel Analytics** is wired in the root layout.
- Ensure all required environment variables are set in the Vercel project settings.
- The Supabase `redirect_urls` list must include your production domain for auth callbacks.

### CI/CD

| Workflow | Trigger | What it runs |
|----------|---------|-------------|
| `.github/workflows/vitest.yml` | Push / PR | `npm run test:run` |
| `.github/workflows/playwright.yml` | Push / PR | `npm run test:e2e:run` |

---

## Code Conventions

### File Naming
- Pages: `app/**/page.tsx`
- Server Actions: `lib/actions/<domain>.ts`
- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`

### Server vs. Client Components
- Default to Server Components.
- Add `"use client"` only when browser APIs, event handlers, or React hooks are required.
- Never import server-only modules (Supabase admin client, FedEx client) from client files.

### Type Safety
- Supabase types are auto-generated in `lib/supabase/supabase.types.ts`. Run `npm run supabase-gen` after schema changes.
- All Server Action inputs are validated with Zod before touching the database.

### Error Handling
- Server Actions return `{ error: string }` on failure — never throw to the client.
- API routes return appropriate HTTP status codes with `{ error }` JSON bodies.

### Path Aliases
`@/*` maps to the project root (configured in `tsconfig.json`). Use absolute imports from `@/` rather than relative `../../`.
