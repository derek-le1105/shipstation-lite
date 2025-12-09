import UserForm from "@/components/admin/users/user-form";
import { UsersTable } from "@/components/admin/users/users-table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { createUserInviteAction } from "@/lib/actions/admin-users";
import { requireAdminProfile } from "@/lib/auth";
import { listWarehouses } from "@/lib/shipstation/client";
import { listUpcharges } from "@/lib/supabase/admin";
import { listProfiles } from "@/lib/supabase/profiles";
import { UserPlus } from "lucide-react";
import { redirect } from "next/navigation";

export const metadata = {
  title: "UNS Shipping Manager - Admin | Users",
};

export default async function AdminUsersPage() {
  try {
    await requireAdminProfile();
  } catch {
    redirect("/dashboard");
  }

  const profiles = await listProfiles();
  const upcharges = await listUpcharges();
  const warehouses = await listWarehouses();
  const profilesWithUpcharges: ((typeof profiles)[0] & {
    upcharge: { value: number; unit: "dollars" | "percent" } | null;
  })[] = profiles.map((profile) => {
    const upcharge = upcharges.find((u) => u.user_id === profile.id);
    return {
      ...profile,
      upcharge: upcharge
        ? { value: upcharge.value, unit: upcharge.unit }
        : null,
    };
  });

  return (
    <section>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Users</CardTitle>
          <UserForm
            action={createUserInviteAction}
            icon={<UserPlus />}
            warehouses={warehouses}
          />
        </CardHeader>
        <CardContent>
          <UsersTable profiles={profilesWithUpcharges} />
        </CardContent>
      </Card>
    </section>
  );
}
