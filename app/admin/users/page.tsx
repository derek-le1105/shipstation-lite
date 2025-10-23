import CreateUserButton from "@/components/admin/users/create-user-button";
import { UsersTable } from "@/components/admin/users/users-table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { requireAdminProfile } from "@/lib/auth";
import { listProfiles } from "@/lib/supabase/profiles";
import { redirect } from "next/navigation";

export default async function AdminUsersPage() {
  try {
    await requireAdminProfile();
  } catch {
    redirect("/dashboard");
  }

  const profiles = await listProfiles();

  /**
   * 
      <section>
        <CreateUserForm />
      </section>

      create users with dialog
   */
  return (
    <section>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Users</CardTitle>
          <CreateUserButton />
        </CardHeader>
        <CardContent>
          <UsersTable profiles={profiles} />
        </CardContent>
      </Card>
    </section>
  );
}
