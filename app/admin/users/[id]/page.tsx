import UserForm from "@/components/admin/users/user-form";
import UserInformation from "@/components/admin/users/user/user-information";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageCrumbs from "@/components/ui/page-crumbs";
import { updateProfileAction } from "@/lib/actions/profiles";
import { getUserUpcharge } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getShippingLabel } from "@/lib/supabase/shipping-labels";
import { User, UserPen } from "lucide-react";

export const metadata = {
  title: "UNS Shipping Manager - Admin | Users",
};

export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser(id);
  const userUpcharge = await getUserUpcharge(user.id);
  const mostRecentLabel = await getShippingLabel(id);
  return (
    <div className="space-y-6">
      <PageCrumbs
        title={user?.full_name ?? user.email}
        icon={<User />}
        href="/admin/users"
      />
      <section className="grid md:grid-cols-[2fr_1fr] gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Last Label Created</CardTitle>
          </CardHeader>
          <CardContent>{mostRecentLabel?.created_at}</CardContent>
        </Card>
        <Card className="md:col-span-1">
          <CardHeader className="py-4">
            <CardTitle className="flex justify-between items-center">
              User
              <UserForm
                action={updateProfileAction}
                user={user}
                icon={<UserPen />}
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UserInformation user={user} upcharge={userUpcharge} />
          </CardContent>
        </Card>
      </section>
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
