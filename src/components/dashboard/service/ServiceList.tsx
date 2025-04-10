"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { createBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Search, Filter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddServiceDialog } from "./AddServiceDialog";
import { DeleteServiceDialog } from "./DeleteServiceDialog";
import { EditServiceDialog } from "./EditServiceDialog";

export type Service = {
  id: string;
  merchant_id: string;
  name: string;
  description: string | null;
  category: string;
  duration: number;
  price: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export function ServiceList() {
  const t = useTranslations("dashboard.services");
  const { user } = useAuth();
  const supabase = createBrowserClient();
  const { toast } = useToast();
  
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);

  const fetchServices = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("merchant_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setServices(data as Service[]);
    } catch (error) {
      console.error("Error fetching services:", error);
      toast({
        title: "Error",
        description: "Failed to load services",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase, toast]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const filteredServices = services.filter(service => 
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddService = async (newService: Omit<Service, 'id' | 'merchant_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("services")
        .insert({
          ...newService,
          merchant_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      
      setServices(prev => [data as Service, ...prev]);
      toast({
        title: "Success",
        description: "Service added successfully",
      });
    } catch (error) {
      console.error("Error adding service:", error);
      toast({
        title: "Error",
        description: "Failed to add service",
        variant: "destructive",
      });
    }
  };

  const handleUpdateService = async (updatedService: Partial<Service> & { id: string }) => {
    try {
      const { error } = await supabase
        .from("services")
        .update({
          name: updatedService.name,
          description: updatedService.description,
          category: updatedService.category,
          duration: updatedService.duration,
          price: updatedService.price,
          active: updatedService.active,
          updated_at: new Date().toISOString()
        })
        .eq("id", updatedService.id);

      if (error) throw error;
      
      setServices(prev => prev.map(service => 
        service.id === updatedService.id 
          ? { ...service, ...updatedService, updated_at: new Date().toISOString() } 
          : service
      ));
      
      toast({
        title: "Success",
        description: "Service updated successfully",
      });
    } catch (error) {
      console.error("Error updating service:", error);
      toast({
        title: "Error",
        description: "Failed to update service",
        variant: "destructive",
      });
    }
  };

  const handleDeleteService = async (id: string) => {
    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setServices(prev => prev.filter(service => service.id !== id));
      toast({
        title: "Success",
        description: "Service deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting service:", error);
      toast({
        title: "Error",
        description: "Failed to delete service",
        variant: "destructive",
      });
    }
  };

  return (
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <Button onClick={() => setIsAddServiceOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("addService")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading services...</div>
        ) : filteredServices.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {searchQuery 
              ? "No services match your search criteria"
              : "You haven't added any services yet. Click 'Add Service' to get started."}
          </div>
        ) : (
          <div className="rounded-md border">
            <div className="grid grid-cols-5 p-4 font-medium border-b">
              <div>{t("name")}</div>
              <div>{t("category")}</div>
              <div>{t("duration", { duration: "" })}</div>
              <div>{t("price")}</div>
              <div className="text-right">{t("actions")}</div>
            </div>
            {filteredServices.map((service) => (
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
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditingService(service)}
                  >
                    {t("edit")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setDeletingService(service)}
                  >
                    {t("delete")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Dialogs */}
      <AddServiceDialog 
        open={isAddServiceOpen} 
        onOpenChange={setIsAddServiceOpen} 
        onAddService={handleAddService} 
      />
      
      {editingService && (
        <EditServiceDialog 
          open={!!editingService} 
          onOpenChange={(open) => !open && setEditingService(null)}
          service={editingService}
          onUpdateService={handleUpdateService}
        />
      )}

      {deletingService && (
        <DeleteServiceDialog 
          open={!!deletingService}
          onOpenChange={(open) => !open && setDeletingService(null)}
          service={deletingService}
          onDeleteService={() => {
            handleDeleteService(deletingService.id);
            setDeletingService(null);
          }}
        />
      )}
    </Card>
  );
} 