"use client";

import { useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { AddressData } from "@/types/addressData";

// Google Maps types
declare global {
  interface Window {
    google: {
      maps: {
        places: {
          Autocomplete: {
            new (input: HTMLInputElement, options?: object): {
              addListener(event: string, handler: () => void): void;
              getPlace(): {
                address_components?: Array<{
                  long_name: string;
                  short_name: string;
                  types: string[];
                }>;
                formatted_address?: string;
                geometry?: {
                  location: {
                    lat(): number;
                    lng(): number;
                  };
                };
                place_id?: string;
              };
            };
          };
        };
        event: {
          clearInstanceListeners(instance: unknown): void;
        };
      };
    };
  }
}

interface GoogleMapsAddressInputProps {
  id?: string;
  value?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  onChange: (addressData: AddressData) => void;
}

export function GoogleMapsAddressInput({
  id = "address-input",
  value = "",
  label,
  placeholder = "Enter address",
  required = false,
  className = "",
  onChange,
}: GoogleMapsAddressInputProps) {
  const googleMapsLoaded = useGoogleMaps();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<{
    addListener(event: string, handler: () => void): void;
    getPlace(): {
      address_components?: Array<{
        long_name: string;
        short_name: string;
        types: string[];
      }>;
      formatted_address?: string;
      geometry?: {
        location: {
          lat(): number;
          lng(): number;
        };
      };
      place_id?: string;
    };
  } | null>(null);

  // Initialize Google Maps Autocomplete
  const initializeAutocomplete = useCallback(() => {
    if (!inputRef.current) {
      console.log("Address input ref not available yet");
      return;
    }
    
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      console.log("Google Maps API not fully loaded yet");
      return;
    }

    // Check if autocomplete is already initialized to prevent duplicates
    if (autocompleteRef.current) {
      console.log("Autocomplete already initialized");
      return;
    }

    console.log("Initializing Google Maps Autocomplete");

    try {
      // Create the autocomplete instance
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ["address"],
          fields: [
            "address_components",
            "formatted_address",
            "geometry",
            "place_id",
          ],
        }
      );

      // Add listener for place changed
      autocompleteRef.current.addListener("place_changed", () => {
        if (!autocompleteRef.current) return;

        const place = autocompleteRef.current.getPlace();
        console.log("Place selected:", place);

        if (!place.geometry || !place.address_components) {
          console.error("No details available for this place");
          return;
        }

        // Extract address components for storage
        let street_number = "";
        let route = "";
        let city = "";
        let state = "";
        let postalCode = "";
        let country = "";

        place.address_components?.forEach(
          (component: { types: string[]; long_name: string }) => {
            const types = component.types;

            if (types.includes("street_number")) {
              street_number = component.long_name;
            } else if (types.includes("route")) {
              route = component.long_name;
            } else if (types.includes("locality")) {
              city = component.long_name;
            } else if (
              types.includes("administrative_area_level_1") ||
              types.includes("administrative_area_level_2")
            ) {
              state = component.long_name;
            } else if (types.includes("postal_code")) {
              postalCode = component.long_name;
            } else if (types.includes("country")) {
              country = component.long_name;
            }
          }
        );

        // Store the street address
        const street = `${street_number} ${route}`.trim();

        // Call the onChange with all address data
        onChange({
          lat: place.geometry?.location.lat() || null,
          lng: place.geometry?.location.lng() || null,
          place_id: place.place_id || "",
          formatted: place.formatted_address || "",
          street,
          city,
          state,
          postalCode,
          country,
        });
      });
      
      console.log("Google Maps Autocomplete initialized successfully");
    } catch (error) {
      console.error("Error initializing Google Maps Autocomplete:", error);
      autocompleteRef.current = null;
    }
  }, [onChange]);

  // Initialize autocomplete when Google Maps is loaded
  useEffect(() => {
    if (googleMapsLoaded && inputRef.current) {
      console.log("Google Maps loaded, initializing autocomplete");
      
      // Small delay to ensure DOM is fully rendered and API is completely loaded
      const timer = setTimeout(() => {
        initializeAutocomplete();
      }, 500);
      
      return () => clearTimeout(timer);
    }
    
    // Cleanup function to remove event listeners when component unmounts
    return () => {
      if (autocompleteRef.current) {
        console.log("Cleaning up Google Maps Autocomplete");
        // Remove all event listeners from autocomplete
        if (window.google && window.google.maps) {
          window.google.maps.event.clearInstanceListeners(
            autocompleteRef.current
          );
        }
        autocompleteRef.current = null;
      }
    };
  }, [googleMapsLoaded, initializeAutocomplete]);

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={id} className={required ? "after:content-['*'] after:ml-0.5 after:text-red-500" : ""}>
          {label}
        </Label>
      )}
      <div className="relative">
        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          id={id}
          ref={inputRef}
          defaultValue={value}
          placeholder={placeholder}
          className={`pl-10 ${className}`}
          // Prevent form submission on Enter key press
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
            }
          }}
        />
      </div>
    </div>
  );
} 