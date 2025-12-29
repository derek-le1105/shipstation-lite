import { getCurrentProfile } from "@/lib/auth";
import { AccountSettings } from "@/components/account/account-settings";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Account Settings",
};

export default async function AccountPage() {
  const profile = await getCurrentProfile(true);

  if (!profile) {
    redirect("/auth/login");
  }

  return (
    <div className="flex w-full justify-center md:py-8">
      <AccountSettings profile={profile} />
    </div>
  );
}
