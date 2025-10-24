import { UserProfile } from "@/lib/auth";

function formatUpcharge(value: number, unit: "dollars" | "percent") {
  return unit === "dollars"
    ? Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value)
    : `${value.toFixed(2)}%`;
}

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
