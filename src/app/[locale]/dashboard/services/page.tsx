"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/dashboard/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/lib/workspace-context";
import { useToast } from "@/components/ui/use-toast";
import { ServiceForm } from "@/components/dashboard/services/ServiceForm";
import { ServiceCard } from "@/components/dashboard/services/ServiceCard";
import { Service, ServiceWithVariants } from "@/types/service";

export default function ServicesPage() {
  const t = useTranslations("dashboard.services");
  const { session } = useAuth();
  const { workspaceProfile } = useWorkspace();
  const { toast } = useToast();

  const [services, setServices] = useState<ServiceWithVariants[]>([]);
  const [filteredServices, setFilteredServices] = useState<
    ServiceWithVariants[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isStaff, setIsStaff] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Fetch services data
  const fetchServicesData = useCallback(async () => {
    if (!workspaceProfile?.id || !session) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Make a request with the auth token for services
      const response = await fetch(
        `/api/services?workspaceId=${workspaceProfile.id}&includeVariants=true`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch services");
      }

      const { services: data, isStaff: userIsStaff } = await response.json();

      // Set the staff status from API response
      setIsStaff(userIsStaff === true);

      if (data && data.length > 0) {
        setServices(data);
        setFilteredServices(data);
      } else {
        setServices([]);
        setFilteredServices([]);
      }
    } catch (error) {
      console.error("Error fetching services data:", error);
      toast({
        title: t("error"),
        description: t("fetchError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [workspaceProfile, session, toast, t]);

  useEffect(() => {
    fetchServicesData();
  }, [fetchServicesData]);

  // Filter services when search query changes
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredServices(services);
    } else {
      const lowercasedQuery = searchQuery.toLowerCase();
      const filtered = services.filter(
        (service) =>
          service.name.toLowerCase().includes(lowercasedQuery) ||
          (service.description &&
            service.description.toLowerCase().includes(lowercasedQuery))
      );
      setFilteredServices(filtered);
    }
  }, [searchQuery, services]);

  const handleAddService = () => {
    setSelectedService(null);
    setIsFormOpen(true);
  };

  const handleEditService = (service: Service) => {
    setSelectedService(service);
    setIsFormOpen(true);
  };

  const handleDeleteService = async (id: string) => {
    if (!session) {
      toast({
        title: t("common.error"),
        description: t("common.sessionExpired"),
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/services/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete service");
      }

      toast({
        title: t("common.success"),
        description: t("deleteSuccess"),
      });

      fetchServicesData();
    } catch (error) {
      console.error("Error deleting service:", error);
      toast({
        title: t("common.error"),
        description: t("deleteError"),
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t("searchPlaceholder")}
              className="w-full pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {!isStaff && (
            <Button onClick={handleAddService}>
              <Plus className="mr-2 h-4 w-4" />
              {t("addService")}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.length > 0 ? (
              filteredServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  variants={service.variants || []}
                  onEdit={handleEditService}
                  onDelete={handleDeleteService}
                  onRefresh={fetchServicesData}
                  translationFunc={t}
                  readOnly={isStaff}
                />
              ))
            ) : (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="mb-4 text-muted-foreground">
                    {searchQuery ? t("noSearchResults") : t("noServices")}
                  </p>
                  {!searchQuery && !isStaff && (
                    <Button onClick={handleAddService}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t("addService")}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Service Form Dialog */}
      <ServiceForm
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsFormOpen(false);
            setTimeout(() => setSelectedService(null), 100);
          } else {
            setIsFormOpen(true);
          }
        }}
        onSuccess={fetchServicesData}
        service={selectedService || undefined}
        workspaceId={workspaceProfile?.id || ""}
        translationFunc={t}
      />
    </DashboardLayout>
  );
}
