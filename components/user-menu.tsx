"use client";
import { useRouter } from "next/navigation";
import { User, LogOut, CircleUser } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { JwtPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export default function UserMenu({ user }: { user: JwtPayload }) {
  const router = useRouter();

  const goToAccount = () => {
    router.push("/account");
  };

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="rounded-full border">
          <User />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="text-muted-foreground text-xs">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <span onClick={goToAccount} className="flex items-center">
            <CircleUser className="mr-2 h-4 w-4" />
            Account
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <span onClick={logout} className="flex items-center">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
