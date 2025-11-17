import { AddressTable } from "@/components/admin/addresses/addresses-table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { requireAdminProfile } from "@/lib/auth";
import { listAllAddresses } from "@/lib/supabase/addresses";
import { redirect } from "next/navigation";

export const metadata = {
  title: "UNS Shipping Manager - Admin | Addresses",
};

export default async function AdminAddressesPage() {
  try {
    await requireAdminProfile();
  } catch {
    redirect("/dashboard");
  }

  const addresses = await listAllAddresses();

  return (
    <section>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Addresses</CardTitle>
        </CardHeader>
        <CardContent>
          <AddressTable addresses={addresses} />
        </CardContent>
      </Card>
    </section>
  );
}
