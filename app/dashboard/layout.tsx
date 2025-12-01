import { getCurrentProfile } from "@/lib/auth";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { redirect } from "next/navigation";
import AppHeader from "@/components/app-header";

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
        <AppHeader />
        <div className="flex flex-1">
          <AppSidebar profile={profile} />
          <SidebarInset>
            <div className="flex flex-1 w-full justify-center">
              <div className="flex w-full max-w-8xl flex-1 flex-col gap-10 p-6">
                {children}
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
}
