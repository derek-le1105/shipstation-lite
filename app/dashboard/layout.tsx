import { getCurrentProfile } from "@/lib/auth";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/login");
  const cookieStore = await cookies();
  const sidebarCookie = cookieStore.get("sidebar_state");
  const defaultOpen = sidebarCookie ? sidebarCookie.value === "true" : true;

  return (
    <div className="[--header-height:4rem]">
      <SidebarProvider defaultOpen={defaultOpen} className="flex flex-col">
        <div className="flex flex-1">
          <AppSidebar profile={profile} />
          <SidebarInset>
            <div className="flex flex-1 w-full justify-center bg-muted/50">
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
