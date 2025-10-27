import Link from "next/link";

import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { getCurrentProfile } from "@/lib/auth";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/login");

  return (
    <div className="[--header-height:4rem]">
      <SidebarProvider className="flex flex-col">
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
        <div className="flex flex-1">
          <AppSidebar profile={profile} />
          <SidebarInset>
            <div className="flex flex-1 w-full justify-center">
              <div className="flex w-full max-w-6xl flex-1 flex-col gap-10 p-6">
                {children}
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
}
