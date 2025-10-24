import { UserProfile } from "@/lib/auth";

export default function UserInformation({ user }: { user: UserProfile }) {
  return (
    <div>
      <section className="flex flex-col ">
        <span>{user.full_name}</span>
        <span>{user.email}</span>
        <span>{user.role}</span>
      </section>
    </div>
  );
}
