import { AddressRecord } from "@/lib/supabase/addresses";

function formatAddress(a: AddressRecord) {
  const parts = [
    a.address_line1,
    a.address_line2 ?? undefined,
    [a.city, a.state].filter(Boolean).join(", "),
    [a.postal_code, a.country].filter(Boolean).join(" "),
  ].filter(Boolean);
  return parts.join(", ");
}

export function AddressTable({ addresses }: { addresses: AddressRecord[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">Created At</th>
            {/* <th className="px-4 py-3 text-left">User ID</th> */}
            <th className="px-4 py-3 text-left">Name/Label</th>
            <th className="px-4 py-3 text-left">Address</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {addresses.map((address) => {
            const displayName =
              address.contact_name || address.company || address.label || "N/A";
            const status = `${
              address.is_residential ? "Residential" : "Business"
            } / ${address.is_validated ? "Validated" : "Unvalidated"}`;

            return (
              <tr key={address.id} className="border-t border-border/60">
                <td className="px-4 py-3 whitespace-nowrap">
                  {new Date(address.created_at).toLocaleString()}
                </td>
                {/* <td className="px-4 py-3">
                  <a
                    href={`/admin/users/${address.user_id}`}
                    className="font-medium"
                  >
                    {address.user_id}
                  </a>
                </td> */}
                <td className="px-4 py-3">
                  <span className="font-medium">{displayName}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium">{formatAddress(address)}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium">{status}</span>
                </td>
                <td className="px-4 py-3">
                  <a
                    href={`/admin/addresses/${address.id}`}
                    className="font-medium text-primary hover:underline cursor-pointer"
                  >
                    View
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
