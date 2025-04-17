"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Edit, MoreVertical, Plus, Trash } from "lucide-react";
import { Service, ServiceVariant } from "@/types/service";
import { ServiceVariantList } from "./ServiceVariantList";
import { ServiceVariantForm } from "./ServiceVariantForm";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/use-toast";

// Type for translation function
type TranslationFunction = (key: string) => string;

interface ServiceCardProps {
  service: Service;
  variants: ServiceVariant[];
  onEdit: (service: Service) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  translationFunc: TranslationFunction;
  readOnly: boolean;
}

export function ServiceCard({
  service,
  variants,
  onEdit,
  onDelete,
  onRefresh,
  translationFunc: t,
  readOnly,
}: ServiceCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isVariantFormOpen, setIsVariantFormOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ServiceVariant | null>(
    null
  );
  const { session } = useAuth();
  const { toast } = useToast();

  const handleAddVariant = () => {
    setSelectedVariant(null);
    setIsVariantFormOpen(true);
  };

  const handleEditVariant = (variant: ServiceVariant) => {
    setSelectedVariant(variant);
    setIsVariantFormOpen(true);
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!session) {
      toast({
        title: t("common.error"),
        description: t("common.sessionExpired"),
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/services/variants/${variantId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete service variant");
      }

      toast({
        title: t("common.success"),
        description: t("deleteVariantSuccess"),
      });

      onRefresh();
    } catch (error) {
      console.error("Error deleting service variant:", error);
      toast({
        title: t("common.error"),
        description: t("deleteVariantError"),
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-xl font-bold">{service.name}</CardTitle>
            <CardDescription className="mt-1">
              {service.description || t("noDescription")}
            </CardDescription>
          </div>
          {!readOnly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setTimeout(() => onEdit(service), 0)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  {t("common.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    setTimeout(() => setIsDeleteDialogOpen(true), 0)
                  }
                  className="text-destructive focus:text-destructive"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  {t("common.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: service.color || "#6366F1" }}
            />
            <Badge variant={service.active ? "default" : "outline"}>
              {service.active ? t("active") : t("inactive")}
            </Badge>
            {service.category && (
              <Badge variant="secondary">
                {t(`servicesOffer.categories.${service.category}`)}
              </Badge>
            )}
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">{t("variants")}</h4>
              {!readOnly && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddVariant}
                  className="h-8"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("addVariant")}
                </Button>
              )}
            </div>
            <ServiceVariantList
              variants={variants}
              onEdit={!readOnly ? handleEditVariant : undefined}
              onDelete={!readOnly ? handleDeleteVariant : undefined}
              translationFunc={t}
            />
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) =>
          setTimeout(() => setIsDeleteDialogOpen(open), 0)
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteServiceTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteServiceDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setTimeout(() => {
                  onDelete(service.id);
                  setIsDeleteDialogOpen(false);
                }, 0);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Service Variant Form */}
      <ServiceVariantForm
        open={isVariantFormOpen}
        onOpenChange={(open) => {
          setTimeout(() => {
            if (!open) {
              setIsVariantFormOpen(false);
              setTimeout(() => setSelectedVariant(null), 100);
            } else {
              setIsVariantFormOpen(true);
            }
          }, 0);
        }}
        onSuccess={onRefresh}
        variant={selectedVariant || undefined}
        serviceId={service.id}
        translationFunc={t}
      />
    </>
  );
}
