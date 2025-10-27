"use client";

import { Home, Send, Shield } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { UserProfile } from "@/lib/auth";
import { useMemo } from "react";

const NAV_MAIN = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    isActive: true,
    items: [
      {
        title: "Labels",
        url: "/dashboard/labels",
      },
      { title: "Address", url: "/dashboard/address" },
    ],
  },
  {
    title: "Admin",
    url: "/admin",
    icon: Shield,
    isActive: false,
    items: [{ title: "Users", url: "/admin/users" }],
  },
];

const NAV_SECONDARY = [
  {
    title: "Feedback",
    url: "#",
    icon: Send,
  },
];

export function AppSidebar({ profile }: { profile: UserProfile }) {
  const navMain = useMemo(() => {
    return NAV_MAIN.map((item) => {
      if (item.title === "Admin")
        return { ...item, isActive: profile.role === "admin" };

      return item;
    });
  }, [profile]);

  const user = useMemo(
    () => ({
      name: profile.full_name || "Unnamed User",
      email: profile.email || "",
      avatar: "",
    }),
    [profile]
  );
  return (
    <Sidebar className="top-[var(--header-height)] !h-[calc(100svh-var(--header-height))]">
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
