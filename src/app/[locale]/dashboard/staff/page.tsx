"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/lib/workspace-context";
import { useRouter } from "@/i18n/navigation";
import { DashboardLayout } from "@/components/dashboard/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CalendarDays, ArrowUpRight, Store, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import RouteGuard from "@/lib/route-guard";

export default function StaffDashboardPage() {
  const t = useTranslations("home");
  const { user, isLoading } = useAuth();
  const { workspaceProfile, isLoading: isWorkspaceLoading } = useWorkspace();
  const router = useRouter();

  // Define valid route paths
  type ValidRoutePath =
    | "/dashboard"
    | "/dashboard/staff"
    | "/dashboard/admin"
    | "/dashboard/calendar"
    | "/dashboard/clients"
    | "/dashboard/team"
    | "/dashboard/subscriptions"
    | "/dashboard/analytics"
    | "/dashboard/messages"
    | "/dashboard/services"
    | "/dashboard/settings";

  const navigateTo = (path: ValidRoutePath) => {
    router.push({
      pathname: path,
    });
  };

  if (isLoading || isWorkspaceLoading) {
    // Return a full-screen loader for consistency
    return (
      <DashboardLayout>
        <div className="flex flex-1 h-full min-h-[80vh] w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null; // Will redirect in RouteGuard
  }

  return (
    <RouteGuard requiredRole="staff">
      <DashboardLayout>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground">
              {t("welcome")}, {user.user_metadata?.full_name || user.email}
              {workspaceProfile ? ` to ${workspaceProfile.name}` : ""}
            </p>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Upcoming Appointments</CardTitle>
                <CardDescription>Your schedule for today</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-medium leading-none">
                        John Doe
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Haircut - 10:00 AM
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateTo("/dashboard/calendar")}
                    >
                      View
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex items-center">
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-medium leading-none">
                        Jane Smith
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Manicure - 11:30 AM
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateTo("/dashboard/calendar")}
                    >
                      View
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-center mt-4">
                    <Button
                      variant="default"
                      onClick={() => navigateTo("/dashboard/calendar")}
                      className="flex items-center gap-2"
                    >
                      <CalendarDays className="h-4 w-4" />
                      View Full Calendar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Your Appointments Today
                  </CardTitle>
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">5</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-500 inline-flex items-center">
                      <ArrowUpRight className="mr-1 h-3 w-3" />
                      +2
                    </span>{" "}
                    from yesterday
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Your Services
                  </CardTitle>
                  <Store className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3</div>
                  <Button
                    variant="link"
                    className="text-xs p-0 h-auto"
                    onClick={() => navigateTo("/dashboard/services")}
                  >
                    Manage your services
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </RouteGuard>
  );
}
