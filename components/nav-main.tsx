"use client";

import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Navigation } from "./app-sidebar";

interface NavMainProps {
  items: Navigation[];
}

export function NavMain({ items }: NavMainProps) {
  const pathname = usePathname();

  const isTopActive = (url: string) => {
    if (!pathname) return false;
    return pathname === url || pathname.startsWith(`${url}/`);
  };

  const isSubActive = (url: string) => pathname === url;

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items
          .filter((item) => item.isEnabled)
          .map((item) => (
            <Collapsible key={item.title} asChild defaultOpen={true}>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={isTopActive(item.url)}
                >
                  <a
                    href={item.url}
                    aria-current={isTopActive(item.url) ? "page" : undefined}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
                {item.items?.length ? (
                  <>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuAction className="data-[state=open]:rotate-90">
                        <ChevronRight />
                        <span className="sr-only">Toggle</span>
                      </SidebarMenuAction>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isSubActive(subItem.url)}
                            >
                              <a
                                href={subItem.url}
                                aria-current={
                                  isSubActive(subItem.url) ? "page" : undefined
                                }
                              >
                                <span>{subItem.title}</span>
                              </a>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </>
                ) : null}
              </SidebarMenuItem>
            </Collapsible>
          ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
