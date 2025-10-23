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

  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Users</CardTitle>
        </CardHeader>
        <CardContent>
          <UsersTable profiles={profiles} />
        </CardContent>
      </Card>
    </section>
  );
}
