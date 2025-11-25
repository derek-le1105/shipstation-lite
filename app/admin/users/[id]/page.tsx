import UserForm from "@/components/admin/users/user-form";
import UserInformation from "@/components/admin/users/user/user-information";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageCrumbs from "@/components/ui/page-crumbs";
import { updateProfileAction } from "@/lib/actions/profiles";
import { getUserUpcharge } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
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
            <CardHeader>
              <CardTitle>Last Label Created</CardTitle>
            </CardHeader>
            <CardContent>{lastLabelDate ?? "No labels yet"}</CardContent>
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
