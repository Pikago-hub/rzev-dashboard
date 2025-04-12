"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/lib/workspace-context";
import { useRouter } from "@/i18n/navigation";
import { useEffect } from "react";
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
  CalendarDays,
  CreditCard,
  DollarSign,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// Role-based action panel component
function RoleBasedActionPanel() {
  const { userRole } = useWorkspace();
  const router = useRouter();
  
  // Only show admin actions for owner or admin roles
  const isAdmin = userRole === 'owner' || userRole === 'admin';
  
  if (!isAdmin) return null;
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Admin Actions</CardTitle>
        <CardDescription>Special actions available to {userRole}s</CardDescription>
      </CardHeader>
      <CardContent className="flex gap-4">
        <Button 
          variant="secondary" 
          onClick={() => router.push('/dashboard/team')}
          className="flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Manage Team
        </Button>
        <Button 
          variant="outline" 
          onClick={() => router.push('/dashboard/settings')}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Workspace Settings
        </Button>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const t = useTranslations("home");
  const { user, isLoading } = useAuth();
  const { workspaceProfile } = useWorkspace();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in the useEffect
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("welcome")}, {user.user_metadata?.full_name || user.email}
            {workspaceProfile ? ` to ${workspaceProfile.name}` : ''}
          </p>
        </div>

        {/* Admin action panel - only shown to admin/owner roles */}
        <RoleBasedActionPanel />

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
                  <div className="text-2xl font-bold">+2,350</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-500 inline-flex items-center">
                      <ArrowUpRight className="mr-1 h-3 w-3" />
                      +180.1%
                    </span>{" "}
                    from last month
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Appointments
                  </CardTitle>
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+12,234</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-red-500 inline-flex items-center">
                      <ArrowDownRight className="mr-1 h-3 w-3" />
                      -19%
                    </span>{" "}
                    from last month
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Active Clients
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+573</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-500 inline-flex items-center">
                      <ArrowUpRight className="mr-1 h-3 w-3" />
                      +201
                    </span>{" "}
                    from last month
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Revenue Overview</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                  <div className="h-[200px] flex items-center justify-center">
                    <p className="text-muted-foreground">
                      Revenue chart coming soon
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Recent Appointments</CardTitle>
                  <CardDescription>
                    You have 12 appointments today
                  </CardDescription>
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
                      <Button variant="outline" size="sm">
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
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </div>
                    <Separator />
                    <div className="flex items-center">
                      <div className="space-y-1 flex-1">
                        <p className="text-sm font-medium leading-none">
                          Mike Johnson
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Massage - 2:00 PM
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </div>
                    <Button variant="outline" className="w-full">
                      View All
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent
            value="analytics"
            className="h-[400px] flex items-center justify-center"
          >
            <p className="text-muted-foreground">Analytics coming soon</p>
          </TabsContent>
          <TabsContent
            value="reports"
            className="h-[400px] flex items-center justify-center"
          >
            <p className="text-muted-foreground">Reports coming soon</p>
          </TabsContent>
          <TabsContent
            value="notifications"
            className="h-[400px] flex items-center justify-center"
          >
            <p className="text-muted-foreground">Notifications coming soon</p>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
