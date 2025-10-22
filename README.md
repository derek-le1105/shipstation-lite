## ShipStation Lite upgrades

This project has been extended to let authenticated users build ShipStation shipping labels and to give administrators visibility across the entire workspace.

### Environment variables

Add the following entries to your `.env` file (or your deployment environment):

```env
SHIPSTATION_API_KEY=your-shipstation-api-key
SHIPSTATION_API_SECRET=your-shipstation-api-secret
# Optional: override the default https://ssapi.shipstation.com base URL
# SHIPSTATION_API_BASE=https://ssapi.shipstation.com
```

### Database schema

Run the SQL in `supabase/migrations/20251016_shipstation_setup.sql` inside your Supabase project. It creates:

- `profiles` with `role` values of `user` or `admin`
- `addresses` for saved ship-from and ship-to locations
- `shipping_labels` to store shipping quote and label details
- Helper function `is_admin()` plus row-level security policies that respect user roles

Promote an administrator by updating the `profiles.role` column to `admin` for the desired user.

### Application flows

- Authenticated users visit `/dashboard` to:
  - Create ShipStation labels using saved or ad-hoc addresses
  - Optionally save new addresses for future shipments
  - Review their recent label history and download labels
- Administrators visit `/admin` for an aggregate view of all labels across every user, including cost totals.
