import { SidebarTrigger } from "./ui/sidebar";
import { ThemeSwitcher } from "./theme-switcher";
import { AuthButton } from "./auth-button";
import { Separator } from "./ui/separator";

export default function AppHeader() {
  return (
    <header className="bg-background sticky top-0 z-50 flex w-full items-center border-b">
      <div className="flex h-16 w-full justify-center">
        <div className="flex w-full items-center justify-between px-6 text-sm">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" />
          </div>
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <AuthButton />
          </div>
        </div>
      </div>
    </header>
  );
}
