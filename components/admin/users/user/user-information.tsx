import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { UserProfile } from "@/lib/auth";
import { UserUpcharge } from "@/lib/supabase/admin";
import { formatDollarPercent } from "@/lib/utils";

export default function UserInformation({
  user,
  upcharge,
}: {
  user: UserProfile;
  upcharge: UserUpcharge;
}) {
  const joined = new Date(user.created_at).toLocaleDateString("en-US", {
    dateStyle: "medium",
  });
  const updated = new Date(user.updated_at).toLocaleDateString("en-US", {
    dateStyle: "medium",
  });
  const displayName = user.full_name || "No name on file";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-lg font-semibold leading-tight">{displayName}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {user.role === "admin" ? "Admin" : "User"}
            </Badge>
            <Badge variant="outline">Joined {joined}</Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        <InfoRow label="Email" value={user.email ?? "Not provided"} />
        <InfoRow
          label="Upcharge"
          value={formatDollarPercent(upcharge.value, upcharge.unit)}
        />
        <InfoRow label="Profile updated" value={updated} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-sm leading-tight text-foreground">{value}</div>
    </div>
  );
}
