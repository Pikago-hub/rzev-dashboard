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
import { ServiceVariant, ServiceVariantFormData } from "@/types/service";

// Define the form schema
const serviceVariantSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  description: z.string().optional(),
  duration: z.coerce
    .number()
    .min(1, { message: "Duration must be at least 1 minute" })
    .optional(),
  price: z.coerce
    .number()
    .min(0, { message: "Price cannot be negative" })
    .optional(),
  active: z.boolean().default(true),
});

// Type for translation function
type TranslationFunction = (key: string) => string;

interface ServiceVariantFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  variant?: ServiceVariant;
  serviceId: string;
  translationFunc: TranslationFunction;
}

export function ServiceVariantForm({
  open,
  onOpenChange,
  onSuccess,
  variant,
  serviceId,
  translationFunc: t,
}: ServiceVariantFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { session } = useAuth();

  const form = useForm<ServiceVariantFormData>({
    resolver: zodResolver(
      serviceVariantSchema
    ) as Resolver<ServiceVariantFormData>,
    defaultValues: {
      name: variant?.name || "",
      description: variant?.description || "",
      duration: variant?.duration || 60,
      price: variant?.price || 0,
      active: variant?.active ?? true,
    },
  });

  // Update form values when variant changes
  useEffect(() => {
    if (variant) {
      form.reset({
        name: variant.name,
        description: variant.description || "",
        duration: variant.duration || 60,
        price: variant.price || 0,
        active: variant.active ?? true,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        duration: 60,
        price: 0,
        active: true,
      });
    }
  }, [variant, form]);

  const onSubmit = async (data: ServiceVariantFormData) => {
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

      if (variant?.id) {
        // Update existing service variant
        const response = await fetch(`/api/services/variants/${variant.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            name: data.name,
            description: data.description || null,
            duration: data.duration || null,
            price: data.price || null,
            active: data.active,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Failed to update service variant"
          );
        }

        toast({
          title: t("common.success"),
          description: t("updateVariantSuccess"),
        });
      } else {
        // Create new service variant
        const response = await fetch("/api/services/variants", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            serviceId: serviceId,
            name: data.name,
            description: data.description || null,
            duration: data.duration || null,
            price: data.price || null,
            active: data.active,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Failed to create service variant"
          );
        }

        toast({
          title: t("common.success"),
          description: t("createVariantSuccess"),
        });
      }

      onSuccess();
      setTimeout(() => onOpenChange(false), 0);
    } catch (error) {
      console.error("Error submitting service variant form:", error);
      toast({
        title: t("common.error"),
        description: variant?.id
          ? t("updateVariantError")
          : t("createVariantError"),
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
            {variant?.id ? t("editVariant") : t("addVariant")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("variantName")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("variantNamePlaceholder")}
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("duration")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder={t("durationPlaceholder")}
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
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("price")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={t("pricePlaceholder")}
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                  : variant?.id
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
