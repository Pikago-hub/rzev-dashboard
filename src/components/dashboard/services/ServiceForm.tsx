"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Switch } from "@/components/ui/switch";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/components/ui/use-toast";
import { Resolver } from "react-hook-form";
import { useAuth } from "@/lib/auth-context";
import { Service, ServiceFormData } from "@/types/service";

// Define the form schema
const serviceSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  description: z.string().optional(),
  color: z.string().optional(),
  category: z.string().optional(),
  active: z.boolean().default(true),
});

// Type for translation function
type TranslationFunction = (key: string) => string;

interface ServiceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  service?: Service;
  workspaceId: string;
  translationFunc: TranslationFunction;
}

export function ServiceForm({
  open,
  onOpenChange,
  onSuccess,
  service,
  workspaceId,
  translationFunc: t,
}: ServiceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { session } = useAuth();

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema) as Resolver<ServiceFormData>,
    defaultValues: {
      name: service?.name || "",
      description: service?.description || "",
      color: service?.color || "#6366F1", // Default indigo color
      category: service?.category || "",
      active: service?.active ?? true,
    },
  });

  // Update form values when service changes
  useEffect(() => {
    if (service) {
      form.reset({
        name: service.name,
        description: service.description || "",
        color: service.color || "#6366F1",
        category: service.category || "",
        active: service.active ?? true,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        color: "#6366F1",
        category: "",
        active: true,
      });
    }
  }, [service, form]);

  const onSubmit = async (data: ServiceFormData) => {
    if (!session) {
      toast({
        title: t("common.error"),
        description: t("common.sessionExpired"),
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      if (service?.id) {
        // Update existing service
        const response = await fetch(`/api/services/${service.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            name: data.name,
            description: data.description || null,
            color: data.color || null,
            active: data.active,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update service");
        }

        toast({
          title: t("common.success"),
          description: t("updateSuccess"),
        });
      } else {
        // Create new service
        const response = await fetch("/api/services", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            name: data.name,
            description: data.description || null,
            color: data.color || null,
            category: data.category || null,
            active: data.active,
            workspaceId: workspaceId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create service");
        }

        toast({
          title: t("common.success"),
          description: t("createSuccess"),
        });
      }

      onSuccess();
      setTimeout(() => onOpenChange(false), 0);
    } catch (error) {
      console.error("Error submitting service form:", error);
      toast({
        title: t("common.error"),
        description: service?.id ? t("updateError") : t("createError"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => setTimeout(() => onOpenChange(open), 0)}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {service?.id ? t("editService") : t("addService")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("serviceName")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("serviceNamePlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("description")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("descriptionPlaceholder")}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("color")}</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input
                        type="color"
                        className="w-12 h-10 p-1"
                        {...field}
                        value={field.value || "#6366F1"}
                      />
                    </FormControl>
                    <Input
                      {...field}
                      value={field.value || "#6366F1"}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("category")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("categoryPlaceholder")}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>{t("active")}</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => setTimeout(() => onOpenChange(false), 0)}
                disabled={isSubmitting}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? t("common.saving")
                  : service?.id
                    ? t("common.update")
                    : t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
