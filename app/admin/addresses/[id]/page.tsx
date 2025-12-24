import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageCrumbs from "@/components/ui/page-crumbs";
import { requireAdminProfile } from "@/lib/auth";
import { getAddress } from "@/lib/supabase/addresses";
import { getOwner } from "@/lib/supabase/profiles";

export const metadata = {
  title: "UNS Shipping Manager - Admin | Address",
};

export default async function AdminAddressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    await requireAdminProfile();
  } catch {
    redirect("/dashboard");
  }

  const { id } = await params;
  const address = await getAddress(id);

  if (!address) {
    redirect("/admin/addresses");
  }
  const owner = await getOwner(address.user_id);

  const displayName =
    address.contact_name || address.company || address.label || "Untitled";

  const status = `${address.is_residential ? "Residential" : "Business"} / ${
    address.is_validated ? "Validated" : "Unvalidated"
  }`;

  return (
    <div className="space-y-6">
      <PageCrumbs
        title={displayName}
        icon={<MapPin />}
        href="/admin/addresses"
      />

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Address details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                Owner
              </span>
              <a
                href={`/admin/users/${address.user_id}`}
                className="font-medium text-primary hover:underline"
              >
                {owner?.full_name || owner?.email || address.user_id}
              </a>
            </div>

            <div className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                Name / label
              </span>
              <span className="font-medium">{displayName}</span>
            </div>

            <div className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                Address
              </span>
              <div className="space-y-0.5">
                <div>{address.address_line1}</div>
                {address.address_line2 ? (
                  <div>{address.address_line2}</div>
                ) : null}
                <div>
                  {address.city}, {address.state} {address.postal_code}
                </div>
                <div>{address.country}</div>
              </div>
            </div>

            <div className="grid gap-1 md:grid-cols-2">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Contact
                </span>
                <div className="space-y-0.5">
                  {address.contact_name ? (
                    <div>{address.contact_name}</div>
                  ) : null}
                  {address.company ? <div>{address.company}</div> : null}
                  {address.phone ? <div>{address.phone}</div> : null}
                  {address.email ? <div>{address.email}</div> : null}
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    Status
                  </span>
                  <span className="font-medium">{status}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                Created at
              </span>
              <span className="font-medium">
                {new Date(address.created_at).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
