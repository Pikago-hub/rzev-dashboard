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
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useMerchantProfile } from "@/hooks/useMerchantProfile";

type DashboardSidebarProps = React.HTMLAttributes<HTMLDivElement>;

export function DashboardSidebar({ className }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const t = useTranslations("dashboard.sidebar");
  const { merchantProfile } = useMerchantProfile();

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

  const routes: RouteType[] = [
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

  return (
    <div
      className={cn(
        "flex flex-col border-r h-full min-h-screen w-72",
        className
      )}
    >
      <div className="px-4 py-6">
        <Link href="/dashboard" className="flex items-center gap-2">
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
      <ScrollArea className="flex-1 px-4 py-6">
        <nav className="flex flex-col gap-2">
          {routes.map((route) => (
            <Link key={route.href} href={route.href}>
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
      <div className="p-4">
        <div className="flex items-center gap-4 mb-4">
          <Avatar>
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback>
              {merchantProfile?.business_name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <p className="text-sm font-medium">
              {merchantProfile?.business_name ||
                user?.user_metadata?.full_name ||
                user?.email}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("merchantAccount")}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          {t("signOut")}
        </Button>
      </div>
    </div>
  );
}
