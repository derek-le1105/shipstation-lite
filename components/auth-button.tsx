import Link from "next/link";
import { Button } from "./ui/button";
import UserMenu from "./user-dropdown";
import { getCurrentProfile } from "@/lib/auth";
export async function AuthButton() {
  const profile = await getCurrentProfile();

  return profile ? (
    <div className="flex items-center gap-4">
      <UserMenu user={profile} />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
