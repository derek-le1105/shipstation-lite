"use client";

import { useRouter } from "next/navigation";
import { ChevronsUpDown, CircleUser, LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useCallback } from "react";
import { UserProfile } from "@/lib/auth";

type BaseUser = {
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
};

type InternalDropdownProps = {
  user: BaseUser;
  showDetailsInTrigger: boolean;
  variant: "sidebar" | "header";
};

function UserDropdownInternal({
  user,
  showDetailsInTrigger,
  variant,
}: InternalDropdownProps) {
  const { isMobile } = useSidebar();
  const router = useRouter();

  const goToAccount = useCallback(() => {
    router.push("/account");
  }, [router]);

  const logout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }, [router]);

  const triggerChildren = (
    <div className="flex min-w-0 items-center gap-2">
      <UserAvatar user={user} />
      {showDetailsInTrigger ? (
        <>
          <UserDetails user={user} />
          <ChevronsUpDown
            className={cn(
              "ml-auto size-4 shrink-0 text-muted-foreground",
              !showDetailsInTrigger && "ml-2"
            )}
          />
        </>
      ) : null}
    </div>
  );

  const contentProps =
    variant === "sidebar"
      ? {
          className:
            "w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg",
          side: isMobile ? ("bottom" as const) : ("right" as const),
          align: "end" as const,
          sideOffset: 4,
        }
      : {
          className: "min-w-48",
          align: "end" as const,
          sideOffset: 8,
        };

  const menu = (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        {variant === "sidebar" ? (
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            {triggerChildren}
          </SidebarMenuButton>
        ) : (
          <Button variant="ghost" size="icon">
            {triggerChildren}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent {...contentProps}>
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex min-w-0 items-center gap-2 px-1 py-1.5 text-left text-sm">
            <UserAvatar user={user} />
            <UserDetails user={user} />
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onSelect={() => {
              goToAccount();
            }}
          >
            <CircleUser className="mr-2 h-4 w-4" />
            Account
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void logout();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (variant === "sidebar") {
    return (
      <SidebarMenu>
        <SidebarMenuItem>{menu}</SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return menu;
}

const UserAvatar = ({ user }: { user: BaseUser }) => (
  <Avatar className="h-8 w-8 rounded-lg">
    <AvatarImage
      src={user.avatar ?? undefined}
      alt={user.name ?? "User avatar"}
    />
    <AvatarFallback className="rounded-lg">
      {user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "U"}
    </AvatarFallback>
  </Avatar>
);

const UserDetails = ({ user }: { user: BaseUser }) => (
  <div className="grid min-w-0 flex-1 basis-0 overflow-hidden text-left text-sm leading-tight">
    <span className="block w-full truncate font-medium" title={user.name ?? ""}>
      {user.name ?? "Unnamed User"}
    </span>
    <span className="block w-full truncate text-xs" title={user.email ?? ""}>
      {user.email ?? ""}
    </span>
  </div>
);

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}) {
  return (
    <UserDropdownInternal user={user} showDetailsInTrigger variant="sidebar" />
  );
}

export default function UserMenu({ user }: { user: UserProfile }) {
  const normalizedUser: BaseUser = {
    name: (typeof user?.full_name === "string" && user.full_name) || null,
    email: (typeof user?.email === "string" && user.email) || null,
    avatar: null,
  };

  return (
    <UserDropdownInternal
      user={normalizedUser}
      showDetailsInTrigger={false}
      variant="header"
    />
  );
}
