"use client";

import { useEffect, useState } from "react";
import PhoneInput, {
  isValidPhoneNumber,
  Country,
} from "react-phone-number-input";
import type { E164Number } from "libphonenumber-js";
import "react-phone-number-input/style.css";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PhoneNumberInputProps {
  value: string;
  onChange: (value: E164Number | undefined) => void;
  disabled?: boolean;
  required?: boolean;
  label?: string;
}

export default function PhoneNumberInput({
  value,
  onChange,
  disabled = false,
  required = false,
  label = "Phone Number",
}: PhoneNumberInputProps) {
  const [country, setCountry] = useState<Country>("US");

  // Try to detect user's country
  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then((response) => response.json())
      .then((data) => {
        if (data.country_code) {
          setCountry(data.country_code as Country);
        }
      })
      .catch((error) => {
        console.error("Error detecting country:", error);
      });
  }, []);

  return (
    <div className="space-y-2">
      <Label htmlFor="phone">{label}</Label>
      <PhoneInput
        id="phone"
        international
        defaultCountry={country}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={cn(
          "rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "w-full"
        )}
        inputComponent={Input}
      />
      {!value || isValidPhoneNumber(value) ? null : (
        <p className="text-sm text-destructive">Invalid phone number</p>
      )}
    </div>
  );
}
