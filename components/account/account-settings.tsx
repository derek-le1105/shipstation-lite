import type { UserProfile } from "@/lib/auth";
import NameChange from "./name-change";
import EmailChange from "./email-change";
import PasswordChange from "./password-change";
import ShipFromRecord from "./ship-from-record";

type AccountSettingsProps = {
  profile: UserProfile;
};

export function AccountSettings({ profile }: AccountSettingsProps) {
  return (
    <div className="w-full max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground">
          Update your personal information, email, and password.
        </p>
      </header>

      <ShipFromRecord warehouse={profile.warehouses} />

      <NameChange profile={profile} />

      <EmailChange profile={profile} />

      <PasswordChange />
    </div>
  );
}
