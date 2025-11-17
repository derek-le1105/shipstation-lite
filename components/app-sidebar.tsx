"use client";

import { Home, Shield, type LucideIcon } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/user-dropdown";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { UserProfile } from "@/lib/auth";
import { useMemo } from "react";

export interface Navigation {
  /**
   * The title of the navigation item.
   */
  title: string;

  /**
   * The URL of the navigation item.
   */
  url: string;

  /**
   * The icon of the navigation item.
   */
  icon: LucideIcon;

  /**
   * Whether the navigation container is collapsed or expanded.
   */
  isActive: boolean;

  /**
   * Whether the navigation item is enabled or disabled.
   */
  isEnabled: boolean;

  /**
   * Restricts the item to users with the given role.
   */
  requiredRole?: UserProfile["role"];

  /**
   * The sub-items of the navigation item.
   */
  items: {
    title: string;
    url: string;
    enabled?: boolean;
  }[];
}

const NAV_MAIN: Navigation[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    isActive: true,
    isEnabled: true,
    items: [
      {
        title: "Labels",
        url: "/dashboard/labels",
        enabled: true,
      },
      { title: "Addresses", url: "/dashboard/addresses", enabled: true },
      { title: "Packages", url: "/dashboard/packages", enabled: true },
    ],
  },
  {
    title: "Admin",
    url: "/admin",
    icon: Shield,
    isActive: true,
    isEnabled: true,
    requiredRole: "admin",
    items: [
      { title: "Users", url: "/admin/users", enabled: true },
      { title: "Addresses", url: "/admin/addresses", enabled: true },
    ],
  },
];

export function AppSidebar({ profile }: { profile: UserProfile }) {
  const navMain = useMemo(() => {
    return NAV_MAIN.filter((item) => {
      if (!item.requiredRole) return true;
      return item.requiredRole === profile.role;
    });
  }, [profile.role]);

  const user = useMemo(
    () => ({
      name: profile.full_name || "Unnamed User",
      email: profile.email || "",
      avatar: "",
    }),
    [profile]
  );
  return (
    <Sidebar className="top-(--header-height) h-[calc(100svh-var(--header-height))]!">
      <SidebarContent>
        <NavMain items={navMain} />
        {/* <NavSecondary items={NAV_SECONDARY} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
