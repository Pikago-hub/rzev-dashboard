import { NextRequest, NextResponse } from "next/server";

// Google Maps API key
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address || typeof address !== "string") {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    if (!GOOGLE_MAPS_API_KEY) {
      return NextResponse.json(
        { error: "Google Maps API key is not configured" },
        { status: 500 }
      );
    }

    // Call Google Maps Geocoding API to validate the address
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
      )}&key=${GOOGLE_MAPS_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Google Maps API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Check if the API returned any results
    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      return NextResponse.json(
        {
          valid: false,
          message: "Address not found or invalid",
          status: data.status,
        },
        { status: 200 }
      );
    }

    // Extract the first result (most relevant)
    const result = data.results[0];

    // Extract address components
    const addressComponents = result.address_components;
    const formattedAddress = result.formatted_address;
    const placeId = result.place_id;
    const location = result.geometry.location;

    // Parse address components
    let street = "";
    let city = "";
    let state = "";
    let postalCode = "";
    let country = "";

    addressComponents.forEach(
      (component: {
        types: string[];
        long_name: string;
        short_name: string;
      }) => {
        const types = component.types;

        if (types.includes("street_number")) {
          street = component.long_name + " ";
        } else if (types.includes("route")) {
          street += component.long_name;
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

    return NextResponse.json({
      valid: true,
      address: {
        formatted: formattedAddress,
        street,
        city,
        state,
        postalCode,
        country,
        place_id: placeId,
        lat: location.lat,
        lng: location.lng,
      },
    });
  } catch (error) {
    console.error("Address validation error:", error);
    return NextResponse.json(
      { error: "Failed to validate address" },
      { status: 500 }
    );
  }
}
