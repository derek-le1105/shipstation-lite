"use client";

import { Home, Shield, type LucideIcon, Send } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/user-dropdown";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { UserProfile } from "@/lib/auth";
import { useEffect, useMemo, useState } from "react";
import { NavSecondary } from "./nav-secondary";

import WHITELOGO from "@/public/assets/WHITE LOGO.png";
import BLACKLOGO from "@/public/assets/UNS-LOGO.png";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";

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

export type SecondaryNavigation = {
  title: string;
  url: string;
  icon: LucideIcon;
};

const NAV_MAIN: Navigation[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    isActive: true,
    isEnabled: true,
    items: [
      { title: "Addresses", url: "/dashboard/addresses", enabled: true },
      {
        title: "Labels",
        url: "/dashboard/labels",
        enabled: true,
      },
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
      { title: "Addresses", url: "/admin/addresses", enabled: true },
      { title: "Labels", url: "/admin/labels", enabled: true },
      { title: "Users", url: "/admin/users", enabled: true },
    ],
  },
];

const NAV_SECONDARY: SecondaryNavigation[] = [
  { title: "Feedback", url: "/feedback", icon: Send },
];

export function AppSidebar({ profile }: { profile: UserProfile }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { state, toggleSidebar } = useSidebar();
  useEffect(() => {
    setMounted(true);
  }, []);
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
  const logoSrc = mounted && resolvedTheme === "light" ? BLACKLOGO : WHITELOGO;
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {state === "collapsed" ? (
              <SidebarMenuButton
                tooltip={"Open sidebar"}
                onClick={toggleSidebar}
                className="justify-center"
              >
                {mounted && (
                  <Image src={logoSrc} alt="white-logo" height={30} />
                )}
              </SidebarMenuButton>
            ) : (
              <div className="flex items-center justify-between gap-2 px-2">
                <Link href="/dashboard" className="flex items-center">
                  {mounted && (
                    <Image src={logoSrc} alt="white-logo" height={30} />
                  )}
                </Link>
                <SidebarTrigger />
              </div>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={NAV_SECONDARY} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
