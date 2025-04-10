"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Service } from "./ServiceList";
import { Switch } from "@/components/ui/switch";

type AddServiceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddService: (service: Omit<Service, 'id' | 'merchant_id' | 'created_at' | 'updated_at'>) => Promise<void>;
};

const formSchema = z.object({
  name: z.string().min(1, { message: "Service name is required" }),
  description: z.string().optional(),
  category: z.string().min(1, { message: "Category is required" }),
  duration: z.coerce.number().int().positive({ message: "Duration must be a positive number" }),
  price: z.coerce.number().positive({ message: "Price must be a positive number" }),
  active: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export function AddServiceDialog({ open, onOpenChange, onAddService }: AddServiceDialogProps) {
  const t = useTranslations("dashboard.services");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      duration: 30,
      price: 0,
      active: true,
    },
  });

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      await onAddService({
        name: values.name,
        description: values.description || null,
        category: values.category,
        duration: values.duration,
        price: values.price,
        active: values.active,
      });
      form.reset();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{t("addServiceTitle")}</DialogTitle>
          <DialogDescription>
            {t("addServiceDescription")}
          </DialogDescription>
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
                    <Input placeholder={t("serviceNamePlaceholder")} {...field} />
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
                  <FormLabel>{t("serviceDescription")}</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={t("serviceDescriptionPlaceholder")} 
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
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("serviceCategory")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("serviceCategoryPlaceholder")} {...field} />
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
                    <FormLabel>{t("serviceDuration")}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="30"
                        min={1}
                        {...field}
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
                    <FormLabel>{t("servicePrice")}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        step="0.01"
                        min={0}
                        {...field}
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
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>{t("serviceActive")}</FormLabel>
                    <FormDescription>
                      {t("serviceActiveDescription")}
                    </FormDescription>
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

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t("adding") : t("addService")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}