"use client";

import { DashboardLayout } from "@/components/dashboard/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

export default function SubscriptionsPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-muted-foreground">
            Manage your subscription plans and billing
          </p>
        </div>

        <Tabs defaultValue="plans" className="space-y-4">
          <TabsList>
            <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
            <TabsTrigger value="billing">Billing History</TabsTrigger>
            <TabsTrigger value="settings">Payment Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="plans" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle>Basic</CardTitle>
                  <CardDescription>
                    For small businesses just getting started
                  </CardDescription>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">$29</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="space-y-2 mb-6 flex-1">
                    <div className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Up to 100 appointments/month</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>2 team members</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Basic analytics</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Email notifications</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    Current Plan
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="flex flex-col border-primary">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Professional</CardTitle>
                    <Badge>Popular</Badge>
                  </div>
                  <CardDescription>
                    For growing businesses with more needs
                  </CardDescription>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">$79</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="space-y-2 mb-6 flex-1">
                    <div className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Unlimited appointments</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Up to 5 team members</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Advanced analytics</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Email & SMS notifications</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Custom branding</span>
                    </div>
                  </div>
                  <Button className="w-full">
                    Upgrade Plan
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle>Enterprise</CardTitle>
                  <CardDescription>
                    For large businesses with advanced requirements
                  </CardDescription>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">$199</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="space-y-2 mb-6 flex-1">
                    <div className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Unlimited everything</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Unlimited team members</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Priority support</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Advanced integrations</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Dedicated account manager</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    Contact Sales
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="billing" className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">Billing history coming soon</p>
          </TabsContent>
          
          <TabsContent value="settings" className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">Payment settings coming soon</p>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
