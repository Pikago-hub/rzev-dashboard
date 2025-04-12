"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { useOnboarding } from "@/lib/onboarding-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { toast } from "@/components/ui/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WorkspaceExtractor } from "@/components/workspace/WorkspaceExtractor";

// Define the form schema with Zod
const formSchema = (t: ReturnType<typeof useTranslations>) =>
  z.object({
    name: z.string().min(1, {
      message: t("nameRequired"),
    }),
    website: z
      .string()
      .optional()
      .refine(
        (val) =>
          !val ||
          val === "" ||
          /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/.test(val),
        {
          message: t("validWebsite"),
        }
      ),
  });

// Define the type for the form values
type FormValues = z.infer<ReturnType<typeof formSchema>>;

export default function CreateWorkspacePage() {
  const t = useTranslations("onboarding.createWorkspace");
  const { user } = useAuth();
  const router = useRouter();
  const { setSubmitHandler } = useOnboarding();

  const [hasExistingWorkspace, setHasExistingWorkspace] = useState(false);
  const [existingWorkspace, setExistingWorkspace] = useState<{
    id: string;
    name: string;
    website: string | null;
  }>({ id: "", name: "", website: null });
  const [isLoading, setIsLoading] = useState(true);
  const [isFormDisabled, setIsFormDisabled] = useState(false);

  // Initialize the form with react-hook-form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema(t)),
    defaultValues: {
      name: "",
      website: "",
    },
  });

  // Fetch user's workspace when component mounts
  useEffect(() => {
    const fetchUserWorkspace = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/workspace/get-user-workspace?userId=${user.id}`
        );
        const data = await response.json();

        if (response.ok && data.success && data.workspace) {
          setHasExistingWorkspace(true);
          setExistingWorkspace(data.workspace);

          // Update form values with existing workspace data
          form.reset({
            name: data.workspace.name,
            website: data.workspace.website || "",
          });
        } else {
          setHasExistingWorkspace(false);
        }
      } catch (error) {
        console.error("Error fetching user workspace:", error);
        toast({
          title: t("errorTitle"),
          description: t("errorFetchingWorkspace"),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserWorkspace();
  }, [user, form, t]);

  // Handle successful extraction
  const handleExtractionSuccess = useCallback(() => {
    // Go to heard-about-us page if extraction was successful
    router.push("/onboarding/heard-about-us");
  }, [router]);

  // Handle manual workspace creation/update
  const createOrUpdateWorkspace = useCallback(
    async (values: FormValues) => {
      try {
        if (!user) {
          toast({
            title: t("errorTitle"),
            description: t("notAuthenticated"),
            variant: "destructive",
          });
          return false;
        }

        // Prepare workspace data
        const workspaceData = {
          name: values.name,
          website: values.website || null,
        };

        if (hasExistingWorkspace) {
          // Update existing workspace
          const updateResponse = await fetch("/api/workspace/update", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: user.id,
              workspaceId: existingWorkspace.id,
              workspaceData,
            }),
          });

          if (!updateResponse.ok) {
            const updateError = await updateResponse.json();
            console.error("Error updating workspace:", updateError);
            throw new Error("Failed to update workspace");
          }

          toast({
            title: t("successTitle"),
            description: t("updateMessage"),
          });
        } else {
          // Create a new workspace
          const createResponse = await fetch("/api/workspace/create", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: user.id,
              workspaceData,
              useWebsiteInfo: false,
            }),
          });

          if (!createResponse.ok) {
            const createError = await createResponse.json();
            console.error("Error creating workspace:", createError);
            throw new Error("Failed to create workspace");
          }

          toast({
            title: t("successTitle"),
            description: t("successMessage"),
          });
        }

        // Navigate to services-offer page
        router.push("/onboarding/services-offer");
        return true;
      } catch (error) {
        console.error("Error creating/updating workspace:", error);
        toast({
          title: t("errorTitle"),
          description:
            error instanceof Error ? error.message : t("errorMessage"),
          variant: "destructive",
        });
        return false;
      }
    },
    [user, router, t, hasExistingWorkspace, existingWorkspace.id]
  );

  // Create a stable reference to the submit handler function
  const submitFn = useCallback(async (): Promise<boolean> => {
    // Get current form values
    const values = form.getValues();

    // Clear previous errors
    form.clearErrors();

    // Only name is required for manual creation/update
    if (!values.name || values.name.trim() === "") {
      form.setError("name", { message: t("nameRequired") });
      return false;
    }

    // If website is provided, validate its format
    if (values.website && values.website.trim() !== "") {
      if (
        !/^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/.test(
          values.website
        )
      ) {
        form.setError("website", { message: t("validWebsite") });
        return false;
      }
    }

    // All validations passed, create/update workspace
    return await createOrUpdateWorkspace(values);
  }, [form, createOrUpdateWorkspace, t]);

  // Register the submit handler with the onboarding context
  useEffect(() => {
    setSubmitHandler(submitFn);

    // Clean up by setting a dummy handler when component unmounts
    return () => {
      setSubmitHandler(() => Promise.resolve(false));
    };
  }, [setSubmitHandler, submitFn]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {hasExistingWorkspace ? t("updateTitle") : t("title")}
        </CardTitle>
        <CardDescription>
          {hasExistingWorkspace ? t("updateSubtitle") : t("subtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasExistingWorkspace && (
          <Alert className="mb-6 bg-muted">
            <Info className="h-4 w-4" />
            <AlertTitle>{t("existingWorkspaceTitle")}</AlertTitle>
            <AlertDescription>
              {t("existingWorkspaceDescription")}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("nameLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("namePlaceholder")}
                      {...field}
                      disabled={isFormDisabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("websiteLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("websitePlaceholder")}
                      {...field}
                      disabled={isFormDisabled}
                    />
                  </FormControl>
                  <FormDescription>{t("websiteDescription")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col space-y-6 mt-8">
              <WorkspaceExtractor
                form={form}
                user={user}
                hasExistingWorkspace={hasExistingWorkspace}
                existingWorkspace={existingWorkspace}
                t={t}
                onExtractionSuccess={handleExtractionSuccess}
                className="w-full h-12 text-base"
                onExtractionStart={() => setIsFormDisabled(true)}
                onExtractionEnd={() => setIsFormDisabled(false)}
              />

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    {t("orLabel")}
                  </span>
                </div>
              </div>

              <Alert className="bg-muted">
                <AlertDescription className="text-center py-2">
                  {hasExistingWorkspace
                    ? t("manualUpdateDescription")
                    : t("manualEntryDescription")}
                </AlertDescription>
              </Alert>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
