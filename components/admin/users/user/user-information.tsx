import { UserProfile } from "@/lib/auth";
import { formatUpcharge } from "@/lib/utils";

export default function UserInformation({ user }: { user: UserProfile }) {
  return (
    <div>
      <section className="flex flex-col ">
        <span>{user.full_name}</span>
        <span>{user.email}</span>
        <span>{user.role}</span>
        <span>Joined: {new Date(user.created_at).toLocaleDateString()}</span>
        <span>
          Upcharge: {formatUpcharge(user.upcharge_value, user.upcharge_unit)}
        </span>
      </section>
    </div>
  );
}
