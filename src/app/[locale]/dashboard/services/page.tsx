"use client";

import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/dashboard/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ServicesPage() {
  const t = useTranslations("dashboard.services");

  // Mock services data
  const services = [
    { id: "1", name: "Haircut", duration: 30, price: 35, category: "Hair" },
    {
      id: "2",
      name: "Hair Coloring",
      duration: 90,
      price: 120,
      category: "Hair",
    },
    { id: "3", name: "Manicure", duration: 45, price: 40, category: "Nails" },
    { id: "4", name: "Pedicure", duration: 60, price: 50, category: "Nails" },
    { id: "5", name: "Massage", duration: 60, price: 80, category: "Body" },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>{t("serviceList")}</CardTitle>
                <CardDescription>{t("serviceListDescription")}</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder={t("searchPlaceholder")}
                    className="pl-8 w-full md:w-[300px]"
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("addService")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <div className="grid grid-cols-5 p-4 font-medium border-b">
                <div>{t("name")}</div>
                <div>{t("category")}</div>
                <div>{t("duration", { duration: "" })}</div>
                <div>{t("price")}</div>
                <div className="text-right">{t("actions")}</div>
              </div>
              {services.map((service) => (
                <div
                  key={service.id}
                  className="grid grid-cols-5 p-4 border-b last:border-b-0 items-center"
                >
                  <div className="font-medium">{service.name}</div>
                  <div>
                    <Badge variant="outline">{service.category}</Badge>
                  </div>
                  <div>{t("duration", { duration: service.duration })}</div>
                  <div>${service.price}</div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm">
                      {t("edit")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                    >
                      {t("delete")}
                    </Button>
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
