"use client";

import { cn } from "@/lib/utils";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Settings,
  Users,
  BarChart3,
  MessageSquare,
  Store,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/lib/workspace-context";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type DashboardSidebarProps = React.HTMLAttributes<HTMLDivElement>;

export function DashboardSidebar({ className }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { userRole } = useWorkspace();
  const router = useRouter();
  const t = useTranslations("dashboard.sidebar");

  // Check if user is staff (not owner or admin)
  const isStaff = userRole === 'staff';

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/auth");
    } catch (error) {
      console.error("Error during sign out:", error);
      router.push("/auth");
    }
  };

  type RouteType = {
    label: string;
    icon: React.ElementType;
    href:
      | "/dashboard"
      | "/dashboard/calendar"
      | "/dashboard/clients"
      | "/dashboard/team"
      | "/dashboard/subscriptions"
      | "/dashboard/analytics"
      | "/dashboard/messages"
      | "/dashboard/services"
      | "/dashboard/settings";
    active: boolean;
  };

  const allRoutes: RouteType[] = [
    {
      label: t("navigation.dashboard"),
      icon: LayoutDashboard,
      href: "/dashboard",
      active: pathname === "/dashboard",
    },
    {
      label: t("navigation.calendar"),
      icon: CalendarDays,
      href: "/dashboard/calendar",
      active: pathname?.includes("/dashboard/calendar"),
    },
    {
      label: t("navigation.clients"),
      icon: Users,
      href: "/dashboard/clients",
      active: pathname?.includes("/dashboard/clients"),
    },
    {
      label: t("navigation.team"),
      icon: Users,
      href: "/dashboard/team",
      active: pathname?.includes("/dashboard/team"),
    },
    {
      label: t("navigation.subscriptions"),
      icon: CreditCard,
      href: "/dashboard/subscriptions",
      active: pathname?.includes("/dashboard/subscriptions"),
    },
    {
      label: t("navigation.analytics"),
      icon: BarChart3,
      href: "/dashboard/analytics",
      active: pathname?.includes("/dashboard/analytics"),
    },
    {
      label: t("navigation.messages"),
      icon: MessageSquare,
      href: "/dashboard/messages",
      active: pathname?.includes("/dashboard/messages"),
    },
    {
      label: t("navigation.services"),
      icon: Store,
      href: "/dashboard/services",
      active: pathname?.includes("/dashboard/services"),
    },
    {
      label: t("navigation.settings"),
      icon: Settings,
      href: "/dashboard/settings",
      active: pathname?.includes("/dashboard/settings"),
    },
  ];

  // Filter routes based on user role
  // Staff cannot see: dashboard, clients, subscriptions, analytics, messages
  const routes = isStaff
    ? allRoutes.filter(route => 
        !["/dashboard", 
          "/dashboard/clients", 
          "/dashboard/subscriptions", 
          "/dashboard/analytics", 
          "/dashboard/messages"].includes(route.href)
      )
    : allRoutes;

  return (
    <div
      className={cn(
        "flex flex-col border-r h-full min-h-screen w-72 overflow-hidden",
        className
      )}
    >
      <div className="px-4 py-6">
        <Link href={isStaff ? "/dashboard/calendar" : "/dashboard"} className="flex items-center gap-2">
          <Image
            src="/rzev-logo-black-bgwhite.png"
            alt="Rzev Logo"
            width={32}
            height={32}
            className="h-8 w-8"
          />
          <h1 className="text-xl font-semibold">{t("title")}</h1>
        </Link>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-2 px-4 py-6">
          {routes.map((route) => (
            <Link 
              key={route.href} 
              href={route.href}
              prefetch={false} 
              shallow={true}
            >
              <Button
                variant={route.active ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2",
                  route.active ? "bg-primary text-primary-foreground" : ""
                )}
              >
                <route.icon className="h-5 w-5" />
                {route.label}
              </Button>
            </Link>
          ))}
        </nav>
      </ScrollArea>
      <Separator />
      <div className="p-4 pt-2 pb-24 sm:pb-20 md:pb-6 lg:pb-4 lg:pt-4 safe-bottom">
        <div className="flex items-center gap-4 mb-4">
          <Avatar>
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback>
              {user?.user_metadata?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <p className="text-sm font-medium">
              {user?.user_metadata?.full_name || user?.email}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("professionalAccount")}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 relative z-10"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          {t("signOut")}
        </Button>
      </div>
    </div>
  );
}
