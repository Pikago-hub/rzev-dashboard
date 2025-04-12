/**
 * Utility functions for interacting with GPT models
 */
import { formatPhoneWithCountryCode } from "./phone-utils";

// Define the type for business information
export interface BusinessInfo {
  name?: string;
  description?: string;
  contact_email?: string;
  contact_phone?: string;
  business_type?: { services: string[]; otherService?: string };
  service_locations?: string[];
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    formatted?: string;
  };
  logo_url?: string;
  business_hours?: Record<string, string>;
  social_media?: Record<string, string>;
  services?: Array<{ name: string; description?: string }>;
  team_members?: Array<{ name: string; role?: string }>;
  timezone?: string;
  lat?: number;
  lng?: number;
}

// Function to extract business information from a website using GPT-4
export async function extractBusinessInfoFromWebsite(
  websiteUrl: string
): Promise<BusinessInfo> {
  try {
    // Check if OpenAI API key is configured
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error("OpenAI API key is not configured");
    }

    // Fetch the website content
    const response = await fetch(websiteUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.statusText}`);
    }

    const html = await response.text();

    // Prepare the prompt for GPT-4
    const prompt = `
      Extract comprehensive business information from this website HTML.
      Return a JSON object with the following fields if found:
      - name: The business name
      - description: A brief description of the business
      - contact_email: The contact email
      - contact_phone: The contact phone number
      - business_type: An array of business categories (e.g., ["salon", "spa"]) - use only these categories if found: hair, nails, makeup, skincare, massage, spa, barber, waxing, lashes, tanning, tattoo, piercing, fitness, yoga, wellness, nutrition, therapy, dental, medical, other
      - otherService: If the business type doesn't fit into the above categories, - use "other: service type found" this format
      - service_locations: An array of service types (e.g., ["inStore", "clientLocation"]) - use only these values: "inStore" for in-store services, "clientLocation" for mobile/client location services
      - address: An object with street, city, state, postalCode, country
      - logo_url: URL of the business logo if found
      - business_hours: Business hours in a structured format if available
      - social_media: Object with social media links (facebook, instagram, twitter, etc.)
      - services: Array of services offered with names and descriptions if available
      - team_members: Array of team members with names and roles if available
      - timezone: Business timezone if available

      Only include fields if you can find them in the HTML. If you can't find a field, omit it.
      Be as accurate as possible and extract as much information as you can find.

      HTML: ${html.substring(
        0,
        15000
      )} // Limit to first 15000 chars to avoid token limits
    `;

    // Call the OpenAI API
    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                "You are a specialized assistant that extracts detailed business information from websites. You are extremely thorough and accurate in identifying business details from HTML content. You format your responses as clean, valid JSON. When identifying business types, you should categorize them into one or more of these specific categories: hair, nails, makeup, skincare, massage, spa, barber, waxing, lashes, tanning, tattoo, piercing, fitness, yoga, wellness, nutrition, therapy, dental, medical, other. If the business type doesn't fit into these categories, use 'other'. For service_locations, use ONLY 'inStore' for in-store services and 'clientLocation' for mobile or at-client services.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.2, // Lower temperature for more deterministic results
          max_tokens: 2000, // Increased token limit for more detailed responses
        }),
      }
    );

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
    }

    const data = await openaiResponse.json();
    const content = data.choices[0].message.content;

    // Parse the JSON response
    try {
      // Extract JSON from the response (in case GPT adds extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in the response");
      }

      const businessInfo = JSON.parse(jsonMatch[0]);

      // Log the extracted information for debugging
      console.log(
        "Extracted business information:",
        JSON.stringify(businessInfo, null, 2)
      );

      // Process and clean up the data
      const processedInfo = processBusinessInfo(businessInfo);

      return processedInfo as BusinessInfo;
    } catch (parseError) {
      console.error("Error parsing GPT response:", parseError);
      throw new Error("Failed to parse business information from GPT response");
    }
  } catch (error) {
    console.error("Error extracting business info:", error);
    throw error;
  }
}

/**
 * Process and clean up the business information extracted from GPT
 * @param info Raw business information from GPT
 * @returns Processed business information
 */
function processBusinessInfo(info: Record<string, unknown>): BusinessInfo {
  const processed: BusinessInfo = {};

  // Copy basic fields
  if (info.name) processed.name = info.name as string;
  if (info.description) processed.description = info.description as string;
  if (info.contact_email)
    processed.contact_email = info.contact_email as string;

  // Process address first so we can use country for phone formatting
  let country: string | undefined;
  if (info.address && typeof info.address === "object") {
    const addressObj = info.address as Record<string, unknown>;
    processed.address = {
      street: addressObj.street as string | undefined,
      city: addressObj.city as string | undefined,
      state: addressObj.state as string | undefined,
      postalCode: addressObj.postalCode as string | undefined,
      country: addressObj.country as string | undefined,
      formatted: addressObj.formatted as string | undefined,
    };

    // Clean up empty fields
    Object.keys(processed.address).forEach((key) => {
      if (!processed.address![key as keyof typeof processed.address]) {
        delete processed.address![key as keyof typeof processed.address];
      }
    });

    // Save country for phone formatting
    country = processed.address.country;

    // If we have lat/lng coordinates
    if (info.lat) processed.lat = Number(info.lat);
    if (info.lng) processed.lng = Number(info.lng);
  }

  // Format phone number with country code if available
  if (info.contact_phone) {
    const rawPhone = info.contact_phone as string;
    processed.contact_phone = formatPhoneWithCountryCode(rawPhone, country);
  }

  if (info.logo_url) processed.logo_url = info.logo_url as string;
  if (info.timezone) processed.timezone = info.timezone as string;

  // Process business type - format it to match services-offer format
  if (info.business_type) {
    const businessTypeArray = Array.isArray(info.business_type)
      ? info.business_type
      : [info.business_type];

    // Valid service categories from services-offer page
    const validCategories = [
      "hair",
      "nails",
      "makeup",
      "skincare",
      "massage",
      "spa",
      "barber",
      "waxing",
      "lashes",
      "tanning",
      "tattoo",
      "piercing",
      "fitness",
      "yoga",
      "wellness",
      "nutrition",
      "therapy",
      "dental",
      "medical",
      "other",
    ];

    // Filter to only include valid categories
    const validBusinessTypes = businessTypeArray.filter((type) =>
      validCategories.includes(type.toLowerCase())
    );

    // If we have any valid types, use them; otherwise mark as "other"
    const services =
      validBusinessTypes.length > 0 ? validBusinessTypes : ["other"];

    // If we're using "other", include the original business types as otherService
    const otherService =
      validBusinessTypes.length === 0 && businessTypeArray.length > 0
        ? businessTypeArray.join(", ")
        : undefined;

    // Transform to {services: [...]} format to match services-offer page expectations
    processed.business_type = {
      services,
      ...(otherService ? { otherService } : {}),
    };
  }

  // Process service locations
  if (info.service_locations) {
    // Map service locations to the format expected by the service-locations page
    // Ensure exact casing is preserved: "inStore" and "clientLocation"
    const locationMapping: Record<string, string> = {
      "in-store": "inStore",
      instore: "inStore",
      mobile: "clientLocation",
      "client-location": "clientLocation",
      "client location": "clientLocation",
      clientlocation: "clientLocation",
      "at client": "clientLocation",
    };

    const rawLocations = Array.isArray(info.service_locations)
      ? info.service_locations
      : [info.service_locations];

    // Convert each location to the expected format with correct casing
    processed.service_locations = rawLocations.map((loc) => {
      const locationKey = String(loc).toLowerCase();
      return (
        locationMapping[locationKey] ||
        // If not in mapping, check if it's a case variation of our expected values
        (locationKey === "instore"
          ? "inStore"
          : locationKey === "clientlocation"
            ? "clientLocation"
            : String(loc))
      ); // Keep original if no match
    });
  }

  // Address is already processed above

  // Process business hours
  if (info.business_hours && typeof info.business_hours === "object") {
    processed.business_hours = info.business_hours as Record<string, string>;
  }

  // Process social media
  if (info.social_media && typeof info.social_media === "object") {
    processed.social_media = info.social_media as Record<string, string>;
  }

  // Process services
  if (info.services && Array.isArray(info.services)) {
    processed.services = info.services.map(
      (service: Record<string, unknown>) => ({
        name: service.name as string,
        description: service.description as string | undefined,
      })
    );
  }

  // Process team members
  if (info.team_members && Array.isArray(info.team_members)) {
    processed.team_members = info.team_members.map(
      (member: Record<string, unknown>) => ({
        name: member.name as string,
        role: member.role as string | undefined,
      })
    );
  }

  return processed;
}
