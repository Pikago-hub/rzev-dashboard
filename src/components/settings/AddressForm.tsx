import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleMapsAddressInput } from "@/components/GoogleMapsAddressInput";
import { AddressData } from "@/types/addressData";

interface AddressFormProps {
  addressData: AddressData;
  onAddressChange: (newAddressData: AddressData) => void;
  translationFunc: (key: string) => string;
}

export const AddressForm = ({
  addressData,
  onAddressChange,
  translationFunc: t,
}: AddressFormProps) => {
  
  // Handle address change from Google Maps component
  const handleAddressChange = (newAddressData: AddressData) => {
    onAddressChange(newAddressData);
  };

  // Handle manual changes to address fields
  const handleFieldChange = (field: keyof AddressData, value: string) => {
    onAddressChange({
      ...addressData,
      [field]: value,
    });
  };
  
  return (
    <div className="space-y-4">
      {/* Google Maps Address Input Component */}
      <GoogleMapsAddressInput
        id="business-address"
        value={addressData.street}
        label={t("business.address")}
        placeholder="123 Main Street"
        onChange={handleAddressChange}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="business-city">
            {t("business.city")}
          </Label>
          <Input
            id="business-city"
            value={addressData.city}
            onChange={(e) => handleFieldChange('city', e.target.value)}
            placeholder="San Francisco"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="business-state">
            {t("business.state")}
          </Label>
          <Input
            id="business-state"
            value={addressData.state}
            onChange={(e) => handleFieldChange('state', e.target.value)}
            placeholder="CA"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="business-zip">
            {t("business.zipCode")}
          </Label>
          <Input
            id="business-zip"
            value={addressData.postalCode}
            onChange={(e) => handleFieldChange('postalCode', e.target.value)}
            placeholder="94105"
          />
        </div>
      </div>
    </div>
  );
}; 