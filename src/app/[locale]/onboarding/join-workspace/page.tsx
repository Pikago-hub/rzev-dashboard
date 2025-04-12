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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Loader2, Search, Building } from "lucide-react";
import Image from "next/image";

// Define the form schema with Zod
const getFormSchema = (t: ReturnType<typeof useTranslations>) =>
  z.object({
    workspaceId: z.string().min(1, {
      message: t("workspaceRequired"),
    }),
    message: z.string().optional(),
  });

// Define the type for the form values
type FormValues = z.infer<ReturnType<typeof getFormSchema>>;

// Define the workspace type
type Workspace = {
  id: string;
  name: string;
  contact_email: string | null;
  website: string | null;
  logo_url: string | null;
};

export default function JoinWorkspacePage() {
  const t = useTranslations("onboarding.joinWorkspace");
  const { user } = useAuth();
  const router = useRouter();
  const { setSubmitHandler } = useOnboarding();
  const [isSearching, setIsSearching] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(
    null
  );

  // Initialize the form with react-hook-form
  const form = useForm<FormValues>({
    resolver: zodResolver(getFormSchema(t)),
    defaultValues: {
      workspaceId: "",
      message: "",
    },
  });

  // Search for workspaces
  const searchWorkspaces = useCallback(async () => {
    if (!searchQuery.trim()) {
      setWorkspaces([]);
      return;
    }

    try {
      setIsSearching(true);
      const response = await fetch(
        `/api/workspace/search?query=${encodeURIComponent(searchQuery)}`
      );

      if (!response.ok) {
        throw new Error("Failed to search workspaces");
      }

      const data = await response.json();
      setWorkspaces(data.workspaces || []);
    } catch (error) {
      console.error("Error searching workspaces:", error);
      toast({
        title: t("errorTitle"),
        description: t("searchError"),
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, t]);

  // Handle workspace selection
  const handleSelectWorkspace = (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    form.setValue("workspaceId", workspace.id);
  };

  // Handle form submission
  const handleSubmit = useCallback(
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

        setIsJoining(true);

        // Call the API to send a join request
        const response = await fetch("/api/workspace/join-request", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
            workspaceId: values.workspaceId,
            message: values.message,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to send join request");
        }

        await response.json();

        toast({
          title: t("successTitle"),
          description: t("successMessage"),
        });

        // Redirect to dashboard with a pending message
        router.push("/dashboard");
        return true;
      } catch (error) {
        console.error("Error sending join request:", error);
        toast({
          title: t("errorTitle"),
          description:
            error instanceof Error ? error.message : t("errorMessage"),
          variant: "destructive",
        });
        return false;
      } finally {
        setIsJoining(false);
      }
    },
    [user, router, t]
  );

  // Create a stable reference to the submit handler function
  const submitFn = useCallback(async (): Promise<boolean> => {
    try {
      // This will run the form validation and then call handleSubmit if valid
      let isSuccess = false;

      // We need to wrap this because handleSubmit returns void, not a Promise
      await form.handleSubmit(async (values) => {
        const result = await handleSubmit(values);
        isSuccess = result === undefined ? true : !!result;
      })();

      return isSuccess;
    } catch (error) {
      console.error("Error in submit handler:", error);
      return false;
    }
  }, [form, handleSubmit]);

  // Register the submit handler with the onboarding context
  useEffect(() => {
    setSubmitHandler(submitFn);

    // Clean up by setting a dummy handler when component unmounts
    return () => {
      setSubmitHandler(() => Promise.resolve(false));
    };
  }, [setSubmitHandler, submitFn]);

  // Effect to search when query changes
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.trim()) {
        searchWorkspaces();
      }
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [searchQuery, searchWorkspaces]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="search">{t("searchLabel")}</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder={t("searchPlaceholder")}
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isSearching || isJoining}
              />
            </div>
            {isSearching && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">
                  {t("searching")}
                </span>
              </div>
            )}
          </div>

          {workspaces.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t("resultsLabel")}</h3>
              <div className="grid grid-cols-1 gap-4">
                {workspaces.map((workspace) => (
                  <Card
                    key={workspace.id}
                    className={`cursor-pointer transition-colors ${
                      selectedWorkspace?.id === workspace.id
                        ? "border-primary"
                        : "hover:border-muted-foreground/50"
                    }`}
                    onClick={() => handleSelectWorkspace(workspace)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center">
                        {workspace.logo_url ? (
                          <Image
                            src={workspace.logo_url}
                            alt={workspace.name}
                            className="h-8 w-8 rounded-full mr-2"
                            width={32}
                            height={32}
                          />
                        ) : (
                          <Building className="h-8 w-8 mr-2 text-muted-foreground" />
                        )}
                        <div>
                          <CardTitle className="text-base">
                            {workspace.name}
                          </CardTitle>
                          {workspace.website && (
                            <CardDescription className="text-xs">
                              {workspace.website}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    {workspace.contact_email && (
                      <CardContent className="pb-2 pt-0">
                        <p className="text-sm text-muted-foreground">
                          {workspace.contact_email}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {searchQuery && !isSearching && workspaces.length === 0 && (
            <div className="text-center py-4">
              <p className="text-muted-foreground">{t("noResults")}</p>
            </div>
          )}

          <Form {...form}>
            <form className="space-y-6">
              <FormField
                control={form.control}
                name="workspaceId"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormControl>
                      <Input {...field} type="hidden" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("messageLabel")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("messagePlaceholder")}
                        {...field}
                        disabled={!selectedWorkspace || isJoining}
                        rows={4}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("messageDescription")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* No submit button - the Next button in the layout will handle submission */}
            </form>
          </Form>
        </div>
      </CardContent>
    </Card>
  );
}
