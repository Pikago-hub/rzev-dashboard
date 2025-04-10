import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import PhoneNumberInput from "@/components/phone-number-input";
import { LogoUploader } from "./LogoUploader";
import { MerchantProfile } from "@/types/merchant"; 

interface BusinessInfoFormProps {
  merchantProfile: MerchantProfile | null;
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
}

export const BusinessInfoForm = ({
  merchantProfile,
  translationFunc: t,
  userId,
  phoneNumber,
  setPhoneNumber,
  setLogoUrl,
  setLogoFile,
}: BusinessInfoFormProps) => {
  // Refs for form inputs
  const businessNameRef = useRef<HTMLInputElement>(null);
  const businessEmailRef = useRef<HTMLInputElement>(null);
  const businessWebsiteRef = useRef<HTMLInputElement>(null);
  const businessDescriptionRef = useRef<HTMLTextAreaElement>(null);

  // Handle logo change
  const handleLogoChange = (url: string | null, file: File | null) => {
    setLogoUrl(url);
    setLogoFile(file);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="business-name">
            {t("business.businessName")}
          </Label>
          <Input
            id="business-name"
            defaultValue={merchantProfile?.business_name || ""}
            placeholder="Your Business Name"
            ref={businessNameRef}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="business-email">
            {t("business.businessEmail")}
          </Label>
          <Input
            id="business-email"
            type="email"
            defaultValue={merchantProfile?.contact_email || ""}
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
          <Label htmlFor="business-website">
            {t("business.website")}
          </Label>
          <Input
            id="business-website"
            type="url"
            defaultValue={merchantProfile?.website || ""}
            placeholder="https://yourbusiness.com"
            ref={businessWebsiteRef}
          />
        </div>
      </div>
      
      {/* Business Logo Upload */}
      <LogoUploader
        initialLogoUrl={merchantProfile?.logo_url || null}
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
          defaultValue={merchantProfile?.description || ""}
          placeholder={t("business.descriptionPlaceholder") || "Tell customers about your business..."}
          className="min-h-[120px]"
          ref={businessDescriptionRef}
        />
      </div>
    </div>
  );
}; 