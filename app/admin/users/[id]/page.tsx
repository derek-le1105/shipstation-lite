import type { ReactNode } from "react";

import UserForm from "@/components/admin/users/user-form";
import UserInformation from "@/components/admin/users/user/user-information";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageCrumbs from "@/components/ui/page-crumbs";
import { updateProfileAction } from "@/lib/actions/profiles";
import { getUserUpcharge } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { FEDEX_SERVICES } from "@/lib/shipstation/fedex";
import {
  getShippingLabel,
  getUserLabelStats,
} from "@/lib/supabase/shipping-labels";
import { User, UserPen } from "lucide-react";

export const metadata = {
  title: "UNS Shipping Manager - Admin | Users",
};

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser(id);
  const userUpcharge = await getUserUpcharge(user.id);
  const mostRecentLabel = await getShippingLabel(id);
  const labelStats = await getUserLabelStats(id);
  const lastLabelDate = mostRecentLabel?.created_at
    ? new Date(mostRecentLabel.created_at).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;
  const serviceName =
    mostRecentLabel &&
    (FEDEX_SERVICES.find(
      (service) => service.code === mostRecentLabel.service_code
    )?.name ??
      mostRecentLabel.service_code);
  const lastLabelTotal =
    (Number(mostRecentLabel?.total_shipment_cost) || 0) +
    (Number(mostRecentLabel?.total_insurance_cost) || 0);
  const trackingNumber = mostRecentLabel?.tracking_number ?? null;
  const trackingLink = trackingNumber
    ? `https://www.fedex.com/wtrk/track/?action=track&trackingnumber=${encodeURIComponent(
        trackingNumber
      )}`
    : null;
  return (
    <div className="space-y-6">
      <PageCrumbs
        title={user?.full_name ?? user.email}
        icon={<User />}
        href="/admin/users"
      />
      <section className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat
                label="Total Spent"
                value={formatCurrency(labelStats.totalSpent)}
              />
              <Stat
                label="Total Paid"
                value={formatCurrency(labelStats.totalPaid)}
              />
              <Stat
                label="Labels Created"
                value={labelStats.labelCount.toLocaleString("en-US")}
              />
            </div>
          </CardContent>
        </Card>
        <div className="grid md:grid-cols-[2fr_1fr] gap-6">
          <Card className="md:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle>Last Label Created</CardTitle>
              {lastLabelDate && (
                <p className="text-sm text-muted-foreground">
                  Created {lastLabelDate}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {!mostRecentLabel ? (
                <p className="text-muted-foreground">No labels yet</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Service</p>
                      <p className="font-medium">{serviceName}</p>
                      <p className="text-xs text-muted-foreground">
                        {mostRecentLabel.carrier_code}
                      </p>
                    </div>
                    <Badge
                      variant={
                        mostRecentLabel.voided ? "destructive" : "secondary"
                      }
                    >
                      {mostRecentLabel.voided ? "Voided" : "Active"}
                    </Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailTile label="Total" value={formatCurrency(lastLabelTotal)} />
                    <DetailTile
                      label="Shipment ID"
                      value={String(mostRecentLabel.shipment_id)}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailTile
                      label="Tracking"
                      value={
                        trackingLink ? (
                          <a
                            className="text-primary underline underline-offset-4"
                            href={trackingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {trackingNumber}
                          </a>
                        ) : (
                          "Not assigned"
                        )
                      }
                    />
                    <DetailTile
                      label="Paid"
                      value={
                        <Badge variant="outline">
                          {mostRecentLabel.paid ? "Paid" : "Unpaid"}
                        </Badge>
                      }
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="md:col-span-1">
            <CardHeader className="py-4">
              <CardTitle className="flex justify-between items-center">
                User
                <UserForm
                  action={updateProfileAction}
                  user={user}
                  upcharge={userUpcharge}
                  icon={<UserPen />}
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UserInformation user={user} upcharge={userUpcharge} />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/50 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function formatCurrency(value: number) {
  return USD_FORMATTER.format(value ?? 0);
}

function DetailTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium leading-tight">{value}</div>
    </div>
  );
}

async function getUser(id: string) {
  // Fetch user data based on the provided id
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;

  return data;
}
