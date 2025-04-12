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
import { useToast } from "@/components/ui/use-toast";
import { Resolver } from "react-hook-form";
import { useAuth } from "@/lib/auth-context";

// Define the form schema
const teamMemberSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  role: z.string().min(1, { message: "Role is required" }),
  active: z.boolean().default(true),
});

// For edit mode, email can be optional
const editTeamMemberSchema = z.object({
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
  workspaceId: string;
  translationFunc: TranslationFunction;
}

export function TeamMemberForm({
  open,
  onOpenChange,
  onSuccess,
  teamMember,
  workspaceId,
  translationFunc: t,
}: TeamMemberFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { session } = useAuth();

  // Use the appropriate schema based on whether we're editing or adding
  const schema = teamMember?.id ? editTeamMemberSchema : teamMemberSchema;

  const form = useForm<TeamMemberFormValues>({
    resolver: zodResolver(schema) as Resolver<TeamMemberFormValues>,
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
    if (!session) {
      toast({
        title: t("common.error"),
        description: t("notifications.unauthorized"),
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // If this is an existing team member, update their information
      if (teamMember?.id) {
        // Prepare payload for API request to update existing member
        const payload = {
          teamMemberId: teamMember.id,
          name: data.name,
          email: data.email || null,
          role: data.role,
          active: data.active,
          workspaceId: workspaceId,
        };

        // Send request to the API with auth token
        const response = await fetch('/api/team/member', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update team member");
        }

        toast({
          title: t("common.success"),
          description: t("notifications.updateSuccess"),
        });
      } 
      // If this is a new team member and email is provided, send an invitation
      else if (data.email) {
        // Send invitation
        const invitePayload = {
          email: data.email,
          role: data.role,
          workspaceId: workspaceId,
        };

        const inviteResponse = await fetch('/api/team/invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(invitePayload),
        });

        if (!inviteResponse.ok) {
          const errorData = await inviteResponse.json();
          if (errorData.error && errorData.error.includes("already associated with another workspace")) {
            throw new Error(t("workspaceRestriction"));
          } else if (errorData.error && errorData.error.includes("cannot invite yourself")) {
            throw new Error(t("selfInvitation"));
          } else if (errorData.error && errorData.error.includes("already a member of this workspace")) {
            throw new Error(t("alreadyMember"));
          } else {
            throw new Error(errorData.error || "Failed to send invitation");
          }
        }

        toast({
          title: t("common.success"),
          description: t("invitationSent"),
        });
      }
      // If no email is provided, we can't send an invitation
      else {
        throw new Error("Email is required to invite a team member");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving team member:", error);
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("notifications.error"),
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
                  <FormLabel>
                    {t("addTeamMemberForm.email")}
                    {!teamMember?.id && <span className="text-destructive"> *</span>}
                  </FormLabel>
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
                      <SelectItem value="owner">
                        {t("addTeamMemberForm.roles.owner")}
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

            <DialogFooter className="pt-4">
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting 
                  ? t("common.saving") 
                  : teamMember?.id 
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