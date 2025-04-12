/**
 * Utility functions for phone number formatting
 */
import { parsePhoneNumber, getCountryCallingCode, CountryCode } from 'libphonenumber-js';

// Map of common country names to ISO country codes
const countryNameToCode: Record<string, CountryCode> = {
  'united states': 'US',
  'usa': 'US',
  'us': 'US',
  'canada': 'CA',
  'united kingdom': 'GB',
  'uk': 'GB',
  'australia': 'AU',
  'germany': 'DE',
  'france': 'FR',
  'spain': 'ES',
  'italy': 'IT',
  'japan': 'JP',
  'china': 'CN',
  'india': 'IN',
  'brazil': 'BR',
  'mexico': 'MX',
  // Add more countries as needed
};

/**
 * Format a phone number with country code based on the country in the address
 * 
 * @param phoneNumber The raw phone number string
 * @param country Optional country string from address
 * @returns Formatted phone number with country code in E.164 format
 */
export function formatPhoneWithCountryCode(phoneNumber: string, country?: string): string {
  if (!phoneNumber) return '';
  
  try {
    // Try to parse the phone number as is - it might already be in E.164 format
    try {
      const parsedNumber = parsePhoneNumber(phoneNumber);
      if (parsedNumber.isValid()) {
        return parsedNumber.format('E.164');
      }
    } catch {
      // Continue with other methods if this fails
    }
    
    // Clean the phone number - remove all non-digit characters except '+'
    const cleanedNumber = phoneNumber.replace(/[^\d+]/g, '');
    
    // If it already starts with +, it might be in international format
    if (cleanedNumber.startsWith('+')) {
      try {
        const parsedNumber = parsePhoneNumber(cleanedNumber);
        if (parsedNumber.isValid()) {
          return parsedNumber.format('E.164');
        }
      } catch {
        // Continue with other methods if this fails
      }
    }
    
    // Try to determine country code from the provided country
    let countryCode: CountryCode = 'US'; // Default to US
    
    if (country) {
      const normalizedCountry = country.toLowerCase().trim();
      
      // Check if the country name is in our map
      if (normalizedCountry in countryNameToCode) {
        countryCode = countryNameToCode[normalizedCountry];
      } else {
        // Check if it's already a valid 2-letter country code
        if (normalizedCountry.length === 2) {
          const upperCountry = normalizedCountry.toUpperCase() as CountryCode;
          try {
            // This will throw if the country code is invalid
            getCountryCallingCode(upperCountry);
            countryCode = upperCountry;
          } catch {
            // Invalid country code, stick with default
          }
        }
      }
    }
    
    // If the number doesn't start with +, add the country code
    if (!cleanedNumber.startsWith('+')) {
      try {
        // Try to parse with the determined country code
        const parsedNumber = parsePhoneNumber(cleanedNumber, countryCode);
        if (parsedNumber.isValid()) {
          return parsedNumber.format('E.164');
        }
      } catch {
        // If parsing fails, manually add the country code
        const countryCallingCode = getCountryCallingCode(countryCode);
        return `+${countryCallingCode}${cleanedNumber}`;
      }
    }
    
    // If all else fails, return the cleaned number
    return cleanedNumber.startsWith('+') ? cleanedNumber : `+1${cleanedNumber}`;
  } catch (error) {
    console.error('Error formatting phone number:', error);
    // Return the original number if formatting fails
    return phoneNumber;
  }
}
