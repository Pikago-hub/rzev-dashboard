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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CreditCard,
  DollarSign,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  Settings,
  Store,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import RouteGuard from "@/lib/route-guard";

// Admin action panel component
function AdminActionPanel() {
  const { userRole } = useWorkspace();
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

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Admin Actions</CardTitle>
        <CardDescription>
          Special actions available to {userRole}s
        </CardDescription>
      </CardHeader>
      <CardContent className="flex gap-4">
        <Button
          variant="secondary"
          onClick={() => navigateTo("/dashboard/team")}
          className="flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Manage Team
        </Button>
        <Button
          variant="outline"
          onClick={() => navigateTo("/dashboard/settings")}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Workspace Settings
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const t = useTranslations("home");
  const { user, isLoading } = useAuth();
  const { workspaceProfile, isLoading: isWorkspaceLoading } = useWorkspace();

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
    return null; // Will redirect in the RouteGuard
  }

  return (
    <RouteGuard requiredRole="owner">
      <DashboardLayout>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground">
              {t("welcome")}, {user.user_metadata?.full_name || user.email}
              {workspaceProfile ? ` to ${workspaceProfile.name}` : ""}
            </p>
          </div>

          <AdminActionPanel />

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Revenue
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">$45,231.89</div>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-green-500 inline-flex items-center">
                        <ArrowUpRight className="mr-1 h-3 w-3" />
                        +20.1%
                      </span>{" "}
                      from last month
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Subscriptions
                    </CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">+12,234</div>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-green-500 inline-flex items-center">
                        <ArrowUpRight className="mr-1 h-3 w-3" />
                        +19%
                      </span>{" "}
                      from last month
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Sales</CardTitle>
                    <Store className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">+573</div>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-red-500 inline-flex items-center">
                        <ArrowDownRight className="mr-1 h-3 w-3" />
                        -2%
                      </span>{" "}
                      from last month
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Active Users
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">+2350</div>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-green-500 inline-flex items-center">
                        <ArrowUpRight className="mr-1 h-3 w-3" />
                        +180.1%
                      </span>{" "}
                      from last month
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Analytics Content</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>This is where your analytics content would go.</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="reports" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Reports Content</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>This is where your reports content would go.</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="notifications" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Notifications Content</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>This is where your notifications content would go.</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </RouteGuard>
  );
}
