"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { UserRoleBadge } from "@/components/dashboard/UserRoleBadge";
import { NotificationsDropdown } from "@/components/dashboard/notifications";

interface DashboardHeaderProps {
  children?: React.ReactNode;
}

export function DashboardHeader({ children }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      {children}

      <div className="hidden md:flex-1 md:flex md:gap-4 lg:gap-8">
        <form className="flex-1 md:max-w-sm lg:max-w-md">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-full bg-background pl-8 md:w-[300px] lg:w-[400px]"
            />
          </div>
        </form>
      </div>

      <div className="flex items-center gap-4">
        <UserRoleBadge />
        <LanguageSwitcher />
        <NotificationsDropdown />
      </div>
    </header>
  );
}
