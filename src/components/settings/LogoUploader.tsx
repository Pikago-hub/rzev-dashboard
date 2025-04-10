import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { createBrowserClient } from "@/lib/supabase";

interface LogoUploaderProps {
  initialLogoUrl: string | null;
  onLogoChange: (url: string | null, file: File | null) => void;
  translationFunc: (key: string) => string;
  userId: string;
}

// Upload logo to Supabase storage - define outside the component so it can be exported
export const uploadLogo = async (
  logoFile: File | null,
  userId: string,
  setIsUploading?: (isUploading: boolean) => void
): Promise<string | null> => {
  if (!logoFile || !userId) return null;
  
  try {
    if (setIsUploading) setIsUploading(true);
    const supabase = createBrowserClient();
    
    // Create a unique filename with timestamp
    const fileExt = logoFile.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;
    
    // Upload file to Supabase storage
    const { error } = await supabase.storage
      .from('merchant.logo')
      .upload(filePath, logoFile, {
        cacheControl: '3600',
        upsert: true
      });
      
    if (error) throw error;
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('merchant.logo')
      .getPublicUrl(filePath);
      
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("Error uploading logo:", error);
    return null;
  } finally {
    if (setIsUploading) setIsUploading(false);
  }
};

export const LogoUploader = ({
  initialLogoUrl,
  onLogoChange,
  translationFunc: t,
  userId,
}: LogoUploaderProps) => {
  const { toast } = useToast();
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Handle file selection for logo upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const maxSize = 2 * 1024 * 1024; // 2MB

      if (!validTypes.includes(file.type)) {
        toast({
          title: t("common.error"),
          description: t("business.invalidFileType"),
          variant: "destructive",
        });
        return;
      }

      if (file.size > maxSize) {
        toast({
          title: t("common.error"),
          description: t("business.fileTooLarge"),
          variant: "destructive",
        });
        return;
      }

      // Create a preview URL
      const objectUrl = URL.createObjectURL(file);
      setLogoUrl(objectUrl);
      
      // Upload the logo to Supabase
      const uploadedUrl = await uploadLogo(file, userId, setIsUploading);
      
      // Pass the Supabase URL to parent component if upload succeeded, otherwise use the local preview
      onLogoChange(uploadedUrl || objectUrl, file);
    }
  };

  // Handle logo removal
  const handleRemoveLogo = () => {
    setLogoUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onLogoChange(null, null);
  };

  // Trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2 mt-4">
      <Label htmlFor="business-logo">
        {t("business.logo")}
      </Label>
      <div className="flex items-start gap-4">
        <div 
          className="w-32 h-32 border-2 border-dashed rounded-md flex items-center justify-center overflow-hidden bg-muted relative"
        >
          {logoUrl ? (
            <>
              <Image 
                src={logoUrl}
                alt="Business Logo"
                className="w-full h-full object-contain"
                width={128}
                height={128}
              />
              {isUploading && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              <button 
                type="button"
                onClick={handleRemoveLogo}
                className="absolute top-1 right-1 bg-background rounded-full p-1 shadow-sm text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Remove logo"
                disabled={isUploading}
              >
                <X size={16} />
              </button>
            </>
          ) : (
            <div className="text-center p-2">
              <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-2">{t("business.uploadLogo")}</p>
            </div>
          )}
        </div>
        <div className="space-y-2 flex-1">
          <input
            type="file"
            id="business-logo"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/gif, image/webp"
            disabled={isUploading}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleUploadClick}
            className="w-full"
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("common.uploading")}
              </>
            ) : (
              logoUrl ? t("business.changeLogo") : t("business.selectLogo")
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            {t("business.logoRequirements")}
          </p>
        </div>
      </div>
    </div>
  );
}; 