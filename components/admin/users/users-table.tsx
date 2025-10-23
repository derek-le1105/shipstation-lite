import { UserProfile } from "@/lib/auth";

export function UsersTable({ profiles }: { profiles: UserProfile[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">Created At</th>
            <th className="px-4 py-3 text-left">Email</th>
            <th className="px-4 py-3 text-left">Full Name</th>
            <th className="px-4 py-3 text-left">Role</th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
