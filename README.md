## UNS Shipping Manager

Next.js app for creating ShipStation shipping labels (FedEx-focused) with Supabase auth + data storage, plus an admin area for managing users and viewing label activity across the workspace.

### Requirements

- Node.js (LTS recommended)
- A Supabase project with the provided schema applied
- ShipStation API credentials
- (Optional) FedEx API credentials for address validation

### Environment variables

Create a `.env` file (or set these in your deployment environment). Do not commit secrets.

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-or-publishable-key

# Used by server-only admin actions (invites, profile updates, upcharges)
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
# (legacy fallback supported by the codebase)
# SUPABASE_SECRET_KEY=your-supabase-service-role-key

SHIPSTATION_API_KEY=your-shipstation-api-key
SHIPSTATION_API_SECRET=your-shipstation-api-secret
# Optional: override the default https://ssapi.shipstation.com base URL
# SHIPSTATION_API_BASE=https://ssapi.shipstation.com

# Optional: enables FedEx address validation on the label form
FEDEX_API_KEY=your-fedex-client-id
FEDEX_SECRET_KEY=your-fedex-client-secret

# Optional: used to generate correct invite redirect links outside Vercel
# NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional: Playwright auth setup (for E2E tests)
# E2E_EMAIL=someone@example.com
# E2E_PASSWORD=your-password
```

### Database schema

Run the SQL in `supabase/migrations/20251016_shipstation_setup.sql` inside your Supabase project. It creates:

- `profiles` with `role` values of `user` or `admin`
- `addresses` for saved ship-from and ship-to locations
- `shipping_labels` to store shipping quote and label details
- Helper function `is_admin()` plus row-level security policies that respect user roles

Promote an administrator by updating the `profiles.role` column to `admin` for the desired user.

### Application flows

- Authenticated users visit `/dashboard` to create shipping labels using saved or ad-hoc addresses and packages (multi-package supported).
- Users can manage saved data under `/dashboard/addresses`, `/dashboard/packages`, and review labels under `/dashboard/labels`.
- Admins visit `/admin` to see aggregate label activity and manage users/labels/addresses under `/admin/users`, `/admin/labels`, `/admin/addresses`.

### Development

- Start: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`

### Testing

- Unit tests (Vitest): `npm run test:run`
- E2E tests (Playwright): `npm run test:e2e:run` (or UI mode: `npm run test:e2e`)
