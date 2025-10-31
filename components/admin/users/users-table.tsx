import { UserProfile } from "@/lib/auth";
import { formatDollarPercent } from "@/lib/utils";

export function UsersTable({
  profiles,
}: {
  profiles: (UserProfile & {
    upcharge: { value: number; unit: "dollars" | "percent" } | null;
  })[];
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">Created At</th>
            <th className="px-4 py-3 text-left">Email</th>
            <th className="px-4 py-3 text-left">Full Name</th>
            <th className="px-4 py-3 text-left">Role</th>
            <th className="px-4 py-3 text-center">Upcharge Value</th>
            <th className="px-4 py-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((profile) => (
            <tr key={profile.id} className="border-t border-border/60">
              <td className="px-4 py-3 whitespace-nowrap">
                {new Date(profile.created_at).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <span className="font-medium">
                  {profile.email ?? "Unknown"}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="font-medium">
                  {profile.full_name ?? "Unknown"}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="font-medium">{profile.role}</span>
              </td>
              <td className="px-4 py-3 text-center">
                {profile?.upcharge ? (
                  <span className="font-medium">
                    {formatDollarPercent(
                      profile?.upcharge?.value,
                      profile?.upcharge?.unit
                    )}
                  </span>
                ) : (
                  "N/A"
                )}
              </td>
              <td className="px-4 py-3">
                <a
                  href={`/admin/users/${profile.id}`}
                  className="font-medium text-primary hover:underline cursor-pointer"
                >
                  View
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
