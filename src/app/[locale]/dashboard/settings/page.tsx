"use client";

import { DashboardLayout } from "@/components/dashboard/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth-context";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and application preferences
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" defaultValue={user?.user_metadata?.full_name || ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue={user?.email || ""} disabled />
                    <p className="text-xs text-muted-foreground">Your email cannot be changed</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" type="tel" defaultValue={user?.user_metadata?.phone || ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input id="role" defaultValue="Business Owner" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button>Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="business" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>
                  Update your business details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="business-name">Business Name</Label>
                    <Input id="business-name" defaultValue="Rzev Salon" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-email">Business Email</Label>
                    <Input id="business-email" type="email" defaultValue="contact@rzevsalon.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-phone">Business Phone</Label>
                    <Input id="business-phone" type="tel" defaultValue="+1 (555) 123-4567" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-website">Website</Label>
                    <Input id="business-website" type="url" defaultValue="https://rzevsalon.com" />
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <Label htmlFor="business-address">Address</Label>
                  <Input id="business-address" defaultValue="123 Main Street" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="business-city">City</Label>
                    <Input id="business-city" defaultValue="San Francisco" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-state">State</Label>
                    <Input id="business-state" defaultValue="CA" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-zip">ZIP Code</Label>
                    <Input id="business-zip" defaultValue="94105" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button>Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Manage how you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Email Notifications</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="email-appointments">Appointment Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive emails about new, updated, or canceled appointments</p>
                      </div>
                      <Switch id="email-appointments" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="email-reminders">Appointment Reminders</Label>
                        <p className="text-sm text-muted-foreground">Receive reminder emails before upcoming appointments</p>
                      </div>
                      <Switch id="email-reminders" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="email-marketing">Marketing & Promotions</Label>
                        <p className="text-sm text-muted-foreground">Receive emails about special offers and promotions</p>
                      </div>
                      <Switch id="email-marketing" />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">SMS Notifications</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="sms-appointments">Appointment Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive SMS about new, updated, or canceled appointments</p>
                      </div>
                      <Switch id="sms-appointments" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="sms-reminders">Appointment Reminders</Label>
                        <p className="text-sm text-muted-foreground">Receive reminder SMS before upcoming appointments</p>
                      </div>
                      <Switch id="sms-reminders" defaultChecked />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button>Save Preferences</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="appearance" className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">Appearance settings coming soon</p>
          </TabsContent>
          
          <TabsContent value="security" className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">Security settings coming soon</p>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
