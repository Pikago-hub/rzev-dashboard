import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import PhoneNumberInput from "@/components/phone-number-input";
import { LogoUploader } from "./LogoUploader";
import { OperatingHoursForm } from "./OperatingHoursForm";
import { GoLiveButton } from "./GoLiveButton";
import { WorkspaceProfile, OperatingHours } from "@/types/workspace";
import { useWorkspace } from "@/lib/workspace-context";
import { getAuthToken } from "@/lib/auth-context";

interface BusinessInfoFormProps {
  workspaceProfile: WorkspaceProfile | null;
  translationFunc: (key: string) => string;
  userId: string;
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
  logoUrl: string | null;
  logoFile: File | null;
  setLogoUrl: (url: string | null) => void;
  setLogoFile: (file: File | null) => void;
  onSave?: () => Promise<void>; // Make onSave optional since we're not using it in the component
  isSaving?: boolean; // Make isSaving optional
  onOperatingHoursChange?: (hours: OperatingHours) => void;
}

export const BusinessInfoForm = ({
  workspaceProfile,
  translationFunc: t,
  userId,
  phoneNumber,
  setPhoneNumber,
  setLogoUrl,
  setLogoFile,
  onOperatingHoursChange,
}: BusinessInfoFormProps) => {
  // Refs for form inputs
  const businessNameRef = useRef<HTMLInputElement>(null);
  const businessEmailRef = useRef<HTMLInputElement>(null);
  const businessWebsiteRef = useRef<HTMLInputElement>(null);
  const businessDescriptionRef = useRef<HTMLTextAreaElement>(null);

  // State for operating hours
  const [operatingHours, setOperatingHours] = useState<OperatingHours | null>(
    workspaceProfile?.operating_hours || null
  );

  // State for Stripe Connect
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isGeneratingDashboardLink, setIsGeneratingDashboardLink] =
    useState(false);
  const { toast } = useToast();
  const { workspaceId } = useWorkspace();

  // Handle logo change
  const handleLogoChange = (url: string | null, file: File | null) => {
    setLogoUrl(url);
    setLogoFile(file);
  };

  // Handle operating hours change
  const handleOperatingHoursChange = (hours: OperatingHours) => {
    setOperatingHours(hours);
    if (onOperatingHoursChange) {
      onOperatingHoursChange(hours);
    }
  };

  // Handle Stripe Connect account creation
  const handleCreateConnectAccount = async () => {
    if (!workspaceId) return;

    try {
      setIsCreatingAccount(true);

      // Get the auth token
      const token = await getAuthToken();

      // Call the API to create a Connect account
      const response = await fetch("/api/stripe/connect/create-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ workspaceId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create Connect account");
      }

      // If account creation was successful, generate an account link
      await handleGenerateAccountLink();
    } catch (error) {
      console.error("Error creating Connect account:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create Connect account",
        variant: "destructive",
      });
    } finally {
      setIsCreatingAccount(false);
    }
  };

  // Handle generating an account link for onboarding
  const handleGenerateAccountLink = async () => {
    if (!workspaceId) return;

    try {
      setIsGeneratingLink(true);

      // Get the auth token
      const token = await getAuthToken();

      // Call the API to create an account link
      const response = await fetch("/api/stripe/connect/create-account-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ workspaceId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create account link");
      }

      // Redirect to the Stripe hosted onboarding
      window.location.href = data.url;
    } catch (error) {
      console.error("Error generating account link:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to generate account link",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // Handle redirecting to the Stripe dashboard
  const handleGoToStripeDashboard = async () => {
    if (!workspaceId) return;

    try {
      setIsGeneratingDashboardLink(true);

      // Get the auth token
      const token = await getAuthToken();

      // Call the API to create a login link
      const response = await fetch("/api/stripe/connect/create-login-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ workspaceId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create Stripe dashboard link");
      }

      // Open the Stripe dashboard in a new tab
      window.open(data.url, "_blank");
    } catch (error) {
      console.error("Error generating Stripe dashboard link:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to access Stripe dashboard",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingDashboardLink(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="business-name">{t("business.businessName")}</Label>
          <Input
            id="business-name"
            defaultValue={workspaceProfile?.name || ""}
            placeholder="Your Business Name"
            ref={businessNameRef}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="business-email">{t("business.businessEmail")}</Label>
          <Input
            id="business-email"
            type="email"
            defaultValue={workspaceProfile?.contact_email || ""}
            placeholder="contact@yourbusiness.com"
            ref={businessEmailRef}
          />
        </div>
        <div className="space-y-2">
          <PhoneNumberInput
            value={phoneNumber}
            onChange={(value) => setPhoneNumber(value || "")}
            label={t("business.businessPhone")}
            required={false}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="business-website">{t("business.website")}</Label>
          <Input
            id="business-website"
            type="url"
            defaultValue={workspaceProfile?.website || ""}
            placeholder="https://yourbusiness.com"
            ref={businessWebsiteRef}
          />
        </div>
      </div>

      {/* Business Logo Upload */}
      <LogoUploader
        initialLogoUrl={workspaceProfile?.logo_url || null}
        onLogoChange={handleLogoChange}
        translationFunc={t}
        userId={userId}
      />

      <Separator className="my-4" />

      {/* Business Description */}
      <div className="space-y-2">
        <Label htmlFor="business-description">
          {t("business.description")}
        </Label>
        <Textarea
          id="business-description"
          defaultValue={workspaceProfile?.description || ""}
          placeholder={
            t("business.descriptionPlaceholder") ||
            "Tell customers about your business..."
          }
          className="min-h-[120px]"
          ref={businessDescriptionRef}
        />
      </div>

      <Separator className="my-4" />

      {/* Operating Hours */}
      <OperatingHoursForm
        operatingHours={operatingHours}
        translationFunc={t}
        onOperatingHoursChange={handleOperatingHoursChange}
      />

      <Separator className="my-4" />

      {/* Go Live Button */}
      <GoLiveButton translationFunc={t} />

      <Separator className="my-4" />

      {/* Stripe Connect Integration */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium">
              {t("business.stripeConnect") || "Stripe Connect"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("business.stripeConnectDescription") ||
                "Connect your business to Stripe to accept payments directly."}
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            {workspaceProfile?.stripe_connect_account_id ? (
              <div className="space-y-4">
                {workspaceProfile.stripe_connect_onboarding_complete ? (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">
                        {t("business.stripeConnectComplete") ||
                          "Stripe Connect account is active"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("business.stripeConnectCompleteDescription") ||
                          "Your business is connected to Stripe and ready to accept payments."}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {t("business.stripeDashboardDescription") ||
                          "To view billings, payouts, and manage payment settings, go to your Stripe Dashboard."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="font-medium">
                        {t("business.stripeConnectIncomplete") ||
                          "Stripe Connect onboarding incomplete"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("business.stripeConnectIncompleteDescription") ||
                          "Please complete the Stripe onboarding process to activate your account."}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mt-4">
                  {!workspaceProfile.stripe_connect_onboarding_complete && (
                    <Button
                      onClick={handleGenerateAccountLink}
                      disabled={isGeneratingLink}
                    >
                      {isGeneratingLink ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("common.loading") || "Loading..."}
                        </>
                      ) : (
                        t("business.completeStripeOnboarding") ||
                        "Complete Stripe Onboarding"
                      )}
                    </Button>
                  )}

                  {workspaceProfile.stripe_connect_onboarding_complete && (
                    <Button
                      onClick={handleGoToStripeDashboard}
                      disabled={isGeneratingDashboardLink}
                    >
                      {isGeneratingDashboardLink ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("common.loading") || "Loading..."}
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          {t("business.goToStripeDashboard") ||
                            "Go to Stripe Dashboard"}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">
                      {t("business.connectToStripe") || "Connect to Stripe"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("business.connectToStripeDescription") ||
                        "Connect your business to Stripe to accept payments directly from customers."}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleCreateConnectAccount}
                  disabled={isCreatingAccount}
                  className="mt-4"
                >
                  {isCreatingAccount ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("common.loading") || "Loading..."}
                    </>
                  ) : (
                    t("business.connectToStripeButton") || "Connect to Stripe"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
