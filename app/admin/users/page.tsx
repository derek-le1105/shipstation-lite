import UserForm from "@/components/admin/users/user-form";
import { UsersTable } from "@/components/admin/users/users-table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { createUserInviteAction } from "@/lib/actions/admin-users";
import { requireAdminProfile } from "@/lib/auth";
import { listProfiles } from "@/lib/supabase/profiles";
import { UserPlus } from "lucide-react";
import { redirect } from "next/navigation";

export default async function AdminUsersPage() {
  try {
    await requireAdminProfile();
  } catch {
    redirect("/dashboard");
  }

  const profiles = await listProfiles();
  return (
    <section>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Users</CardTitle>
          <UserForm action={createUserInviteAction} icon={<UserPlus />} />
        </CardHeader>
        <CardContent>
          <UsersTable profiles={profiles} />
        </CardContent>
      </Card>
    </section>
  );
}
