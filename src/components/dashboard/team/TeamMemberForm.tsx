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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createBrowserClient } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { Resolver } from "react-hook-form";

// Define the form schema
const teamMemberSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "Invalid email address" }).optional().or(z.literal('')),
  role: z.string().min(1, { message: "Role is required" }),
  active: z.boolean().default(true),
});

type TeamMemberFormValues = z.infer<typeof teamMemberSchema>;

// Type for translation function
type TranslationFunction = (key: string) => string;

interface TeamMemberFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  teamMember?: {
    id: string;
    name: string;
    email: string;
    role: string;
    active: boolean;
  };
  merchantId: string;
  translationFunc: TranslationFunction;
}

export function TeamMemberForm({
  open,
  onOpenChange,
  onSuccess,
  teamMember,
  merchantId,
  translationFunc: t,
}: TeamMemberFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<TeamMemberFormValues>({
    resolver: zodResolver(teamMemberSchema) as Resolver<TeamMemberFormValues>,
    defaultValues: {
      name: teamMember?.name || "",
      email: teamMember?.email || "",
      role: teamMember?.role || "staff",
      active: teamMember?.active ?? true,
    },
  });

  // Update form values when teamMember changes
  useEffect(() => {
    if (open) {
      form.reset({
        name: teamMember?.name || "",
        email: teamMember?.email || "",
        role: teamMember?.role || "staff",
        active: teamMember?.active ?? true,
      });
    }
  }, [teamMember, form, open]);

  // Handle clean closing of the dialog
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  const onSubmit = async (data: TeamMemberFormValues) => {
    try {
      setIsSubmitting(true);
      const supabase = createBrowserClient();

      if (teamMember?.id) {
        // Update existing team member
        const { error } = await supabase
          .from("team_members")
          .update({
            name: data.name,
            email: data.email || null,
            role: data.role,
            active: data.active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", teamMember.id);

        if (error) throw error;

        toast({
          title: t("common.success"),
          description: t("notifications.updateSuccess"),
        });
      } else {
        // Add new team member
        const { error } = await supabase.from("team_members").insert({
          merchant_id: merchantId,
          name: data.name,
          email: data.email || null,
          role: data.role,
          active: data.active,
        });

        if (error) throw error;

        toast({
          title: t("common.success"),
          description: t("notifications.addSuccess"),
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving team member:", error);
      toast({
        title: t("common.error"),
        description: t("notifications.error"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {teamMember?.id
              ? t("addTeamMemberForm.editTitle")
              : t("addTeamMemberForm.title")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("addTeamMemberForm.name")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("addTeamMemberForm.namePlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("addTeamMemberForm.email")} (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("addTeamMemberForm.emailPlaceholder")}
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
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("addTeamMemberForm.role")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            "addTeamMemberForm.rolePlaceholder"
                          )}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">
                        {t("addTeamMemberForm.roles.admin")}
                      </SelectItem>
                      <SelectItem value="manager">
                        {t("addTeamMemberForm.roles.manager")}
                      </SelectItem>
                      <SelectItem value="staff">
                        {t("addTeamMemberForm.roles.staff")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
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
                    <FormLabel>
                      {t("addTeamMemberForm.active")}
                    </FormLabel>
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
              >
                {t("addTeamMemberForm.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? t("common.loading")
                  : teamMember?.id
                  ? t("addTeamMemberForm.update")
                  : t("addTeamMemberForm.add")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 