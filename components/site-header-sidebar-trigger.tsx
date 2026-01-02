"use client";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Separator } from "./ui/separator";

export function SiteHeaderSidebarTrigger() {
  const isMobile = useIsMobile();

  if (isMobile)
    return (
      <>
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-full" />
      </>
    );

  return null;
}
