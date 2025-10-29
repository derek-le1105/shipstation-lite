import { UserProfile } from "@/lib/auth";
import { SidebarTrigger } from "./ui/sidebar";
import Link from "next/link";
import { ThemeSwitcher } from "./theme-switcher";
import { AuthButton } from "./auth-button";

interface AppHeaderProps {
  profile: UserProfile;
}

export default function AppHeader({ profile }: AppHeaderProps) {
  return (
    <header className="bg-background sticky top-0 z-50 flex w-full items-center border-b">
      <div className="flex h-16 w-full justify-center">
        <div className="flex w-full max-w-6xl items-center justify-between px-6 text-sm">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="-ml-1" />
            {profile ? (
              <nav className="flex items-center gap-6 font-semibold text-muted-foreground">
                <Link
                  href="/dashboard"
                  className="hover:text-foreground transition-colors"
                >
                  Dashboard
                </Link>
                {profile.role === "admin" ? (
                  <Link
                    href="/admin"
                    className="hover:text-foreground transition-colors"
                  >
                    Admin
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </div>
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <AuthButton />
          </div>
        </div>
      </div>
    </header>
  );
}
