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
  Store,
  LogOut,
  Loader2,
  LineChart,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/lib/workspace-context";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useTeamMemberProfile } from "@/hooks/useTeamMemberProfile";
import { Skeleton } from "@/components/ui/skeleton";

type DashboardSidebarProps = React.HTMLAttributes<HTMLDivElement>;

export function DashboardSidebar({ className }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { userRole, isLoading: workspaceLoading } = useWorkspace();
  const { profile: teamMemberProfile, isLoading: profileLoading } =
    useTeamMemberProfile();
  const router = useRouter();
  const t = useTranslations("dashboard.sidebar");

  // Only determine role after data is loaded
  const isRoleLoading = workspaceLoading || !userRole;

  // Check if user is staff (not owner)
  const isStaff = !isRoleLoading && userRole === "staff";
  // Check if user is owner
  const isOwner = !isRoleLoading && userRole === "owner";

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push({
        pathname: "/auth",
      });
    } catch (error) {
      console.error("Error during sign out:", error);
      router.push({
        pathname: "/auth",
      });
    }
  };

  // Define valid route paths based on the routing.ts configuration
  type ValidRoutePath =
    | "/dashboard"
    | "/dashboard/staff"
    | "/dashboard/admin"
    | "/dashboard/calendar"
    | "/dashboard/clients"
    | "/dashboard/team"
    | "/dashboard/subscriptions"
    | "/dashboard/services"
    | "/dashboard/usage"
    | "/dashboard/settings";

  // Determine appropriate dashboard path based on role
  const dashboardPath = isStaff
    ? ("/dashboard/staff" as ValidRoutePath)
    : isOwner
      ? ("/dashboard/admin" as ValidRoutePath)
      : ("/dashboard" as ValidRoutePath);

  type RouteType = {
    label: string;
    icon: React.ElementType;
    href: ValidRoutePath;
    active: boolean;
  };

  const allRoutes: RouteType[] = [
    {
      label: t("navigation.dashboard"),
      icon: LayoutDashboard,
      href: dashboardPath,
      active:
        pathname === dashboardPath ||
        pathname === "/dashboard" ||
        pathname === "/dashboard/staff" ||
        pathname === "/dashboard/admin",
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
      label: t("navigation.usage"),
      icon: LineChart,
      href: "/dashboard/usage",
      active: pathname?.includes("/dashboard/usage"),
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

  // Only filter routes once role information is loaded
  // Staff cannot see: clients, subscriptions, analytics, usage
  const routes = isRoleLoading
    ? [] // Show no routes while loading to prevent flashing
    : isStaff
      ? allRoutes.filter(
          (route) =>
            ![
              "/dashboard/clients",
              "/dashboard/subscriptions",
              "/dashboard/usage",
            ].includes(route.href)
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
        <Link
          href={{
            pathname: dashboardPath,
          }}
          className="flex items-center gap-2"
        >
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
          {isRoleLoading ? (
            // Skeleton loading state for navigation items
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center space-x-2 py-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-4 w-[100px]" />
                </div>
              ))}
            </>
          ) : (
            // Real navigation items once role is determined
            routes.map((route) => (
              <Link
                key={route.href}
                href={{
                  pathname: route.href,
                }}
                prefetch={false}
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
            ))
          )}
        </nav>
      </ScrollArea>
      <Separator />
      <div className="p-4 pt-2 pb-24 sm:pb-20 md:pb-6 lg:pb-4 lg:pt-4 safe-bottom">
        <div className="flex items-center gap-4 mb-4">
          <Avatar>
            <AvatarImage
              src={
                teamMemberProfile?.avatar_url || user?.user_metadata?.avatar_url
              }
            />
            <AvatarFallback>
              {profileLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                teamMemberProfile?.display_name?.charAt(0).toUpperCase() ||
                user?.user_metadata?.full_name?.charAt(0).toUpperCase() ||
                user?.email?.charAt(0).toUpperCase() ||
                "U"
              )}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            {profileLoading ? (
              <Skeleton className="h-4 w-[120px] mb-2" />
            ) : (
              <>
                <p className="text-sm font-medium">
                  {!profileLoading && teamMemberProfile?.display_name
                    ? teamMemberProfile.display_name
                    : user?.user_metadata?.full_name || user?.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("professionalAccount")}
                </p>
              </>
            )}
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
