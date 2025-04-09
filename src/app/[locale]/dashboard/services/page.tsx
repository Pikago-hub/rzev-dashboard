"use client";

import { DashboardLayout } from "@/components/dashboard/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ServicesPage() {
  // Mock services data
  const services = [
    { id: "1", name: "Haircut", duration: 30, price: 35, category: "Hair" },
    { id: "2", name: "Hair Coloring", duration: 90, price: 120, category: "Hair" },
    { id: "3", name: "Manicure", duration: 45, price: 40, category: "Nails" },
    { id: "4", name: "Pedicure", duration: 60, price: 50, category: "Nails" },
    { id: "5", name: "Massage", duration: 60, price: 80, category: "Body" },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Services</h1>
          <p className="text-muted-foreground">
            Manage your service offerings and pricing
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Service List</CardTitle>
                <CardDescription>
                  View and manage all your services
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search services..."
                    className="pl-8 w-full md:w-[300px]"
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Service
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <div className="grid grid-cols-5 p-4 font-medium border-b">
                <div>Name</div>
                <div>Category</div>
                <div>Duration</div>
                <div>Price</div>
                <div className="text-right">Actions</div>
              </div>
              {services.map((service) => (
                <div key={service.id} className="grid grid-cols-5 p-4 border-b last:border-b-0 items-center">
                  <div className="font-medium">{service.name}</div>
                  <div>
                    <Badge variant="outline">{service.category}</Badge>
                  </div>
                  <div>{service.duration} min</div>
                  <div>${service.price}</div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm">Edit</Button>
                    <Button variant="outline" size="sm" className="text-destructive">Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
