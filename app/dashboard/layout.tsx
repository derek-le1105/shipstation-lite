import Link from "next/link";

import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { getCurrentProfile } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  return (
    <main className="min-h-screen flex flex-col items-center bg-background text-foreground">
      <div className="flex-1 w-full flex flex-col items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16 bg-card/30 backdrop-blur">
          <div className="w-full max-w-6xl flex justify-between items-center p-3 px-6 text-sm">
            <div className="flex gap-6 items-center font-semibold">
              {profile ? (
                <div className="flex items-center gap-4 text-muted-foreground">
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
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-4">
              <ThemeSwitcher />
              <AuthButton />
            </div>
          </div>
        </nav>
        <div className="flex-1 flex flex-col gap-10 w-full max-w-6xl p-6">
          {children}
        </div>
      </div>
    </main>
  );
}
