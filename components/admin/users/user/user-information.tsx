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
  return (
    <div>
      <section className="flex flex-col ">
        <span>{user.full_name}</span>
        <span>{user.email}</span>
        <span>{user.role}</span>
        <span>Joined: {new Date(user.created_at).toLocaleDateString()}</span>
        <span>
          Upcharge: {formatDollarPercent(upcharge.value, upcharge.unit)}
        </span>
      </section>
    </div>
  );
}
