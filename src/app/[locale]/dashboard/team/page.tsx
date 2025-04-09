"use client";

import { DashboardLayout } from "@/components/dashboard/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";

export default function TeamPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground">
            Manage your team members and their schedules
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  View and manage your team
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search team..."
                    className="pl-8 w-full md:w-[300px]"
                  />
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Team Member
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[500px] flex items-center justify-center">
              <p className="text-muted-foreground">Team management coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
