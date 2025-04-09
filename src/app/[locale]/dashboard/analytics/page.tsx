"use client";

import { DashboardLayout } from "@/components/dashboard/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AnalyticsPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground">
              Track your business performance and growth
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select defaultValue="30days">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="90days">Last 90 days</SelectItem>
                <SelectItem value="year">This year</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$45,231.89</div>
                  <p className="text-xs text-muted-foreground">
                    +20.1% from last period
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Appointments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1,234</div>
                  <p className="text-xs text-muted-foreground">
                    +12.5% from last period
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    New Clients
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">145</div>
                  <p className="text-xs text-muted-foreground">
                    +32.1% from last period
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Conversion Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">24.8%</div>
                  <p className="text-xs text-muted-foreground">
                    +3.2% from last period
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                  <CardDescription>
                    Monthly revenue for the last 12 months
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                  <p className="text-muted-foreground">Revenue chart coming soon</p>
                </CardContent>
              </Card>
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Appointment Distribution</CardTitle>
                  <CardDescription>
                    Breakdown by service type
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                  <p className="text-muted-foreground">Distribution chart coming soon</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="revenue" className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">Detailed revenue analytics coming soon</p>
          </TabsContent>
          
          <TabsContent value="appointments" className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">Appointment analytics coming soon</p>
          </TabsContent>
          
          <TabsContent value="clients" className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">Client analytics coming soon</p>
          </TabsContent>
          
          <TabsContent value="team" className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">Team performance analytics coming soon</p>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
