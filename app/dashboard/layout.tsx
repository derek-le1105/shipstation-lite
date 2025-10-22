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
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16 bg-card/30 backdrop-blur">
          <div className="w-full max-w-6xl flex justify-between items-center p-3 px-6 text-sm">
            <div className="flex gap-6 items-center font-semibold">
              <Link href="/" className="text-base font-bold tracking-tight">
                ShipStation Lite
              </Link>
              {profile ? (
                <div className="flex items-center gap-4 text-muted-foreground">
                  <Link href="/dashboard" className="hover:text-foreground transition-colors">
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
        <div className="flex-1 flex flex-col gap-10 w-full max-w-6xl p-6">{children}</div>
        <footer className="w-full flex items-center justify-center border-t border-t-foreground/10 text-center text-xs gap-8 py-10 text-muted-foreground">
          <p>Manage your orders faster with ShipStation Lite.</p>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}
