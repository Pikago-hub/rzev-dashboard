"use client";

import { DashboardLayout } from "@/components/dashboard/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Filter } from "lucide-react";

export default function ClientsPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Manage your client database and information
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Client List</CardTitle>
                <CardDescription>
                  View and manage all your clients
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search clients..."
                    className="pl-8 w-full md:w-[300px]"
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Client
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[500px] flex items-center justify-center">
              <p className="text-muted-foreground">Client management coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
