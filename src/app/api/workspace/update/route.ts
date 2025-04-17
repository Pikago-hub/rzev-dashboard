import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { extractBusinessInfoFromWebsite, BusinessInfo } from "@/lib/gpt-utils";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

export async function POST(request: NextRequest) {
  try {
    const {
      userId,
      workspaceId,
      workspaceData,
      useWebsiteInfo = false,
    } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 }
      );
    }

    if (!workspaceData) {
      return NextResponse.json(
        { error: "Workspace data is required" },
        { status: 400 }
      );
    }

    // Verify the user is a member of this workspace
    const { error: memberError } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("team_member_id", userId)
      .single();

    if (memberError) {
      console.error("Error verifying workspace membership:", memberError);
      return NextResponse.json(
        { error: "User is not a member of this workspace" },
        { status: 403 }
      );
    }

    // If useWebsiteInfo is true and a website URL is provided, try to extract business info
    let enhancedWorkspaceData = { ...workspaceData };
    let extractionSuccess = false;
    let extractedFields: string[] = [];

    if (useWebsiteInfo && workspaceData.website) {
      try {
        console.log(
          `Attempting to extract business info from website: ${workspaceData.website}`
        );

        // Normalize the website URL if it doesn't have a protocol
        let websiteUrl = workspaceData.website;
        if (!websiteUrl.startsWith("http")) {
          websiteUrl = `https://${websiteUrl}`;
        }

        const businessInfo = await extractBusinessInfoFromWebsite(websiteUrl);

        // Track which fields were successfully extracted
        extractedFields = Object.keys(businessInfo).filter((key) => {
          const value = businessInfo[key as keyof BusinessInfo];
          return (
            value !== undefined &&
            value !== null &&
            (typeof value !== "object" ||
              (value && Object.keys(value).length > 0))
          );
        });

        console.log(
          `Successfully extracted fields: ${extractedFields.join(", ")}`
        );

        // Merge the extracted info with the provided data, prioritizing user-provided data
        // Remove logo_url from businessInfo to prevent favicon being used as logo
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { logo_url, ...filteredBusinessInfo } = businessInfo;
        enhancedWorkspaceData = {
          ...filteredBusinessInfo,
          ...workspaceData, // User-provided data takes precedence
        };

        extractionSuccess = extractedFields.length > 0;
      } catch (error) {
        console.error("Error extracting business info:", error);
        // Continue with user-provided data only
      }
    }

    // Update the workspace
    let updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (useWebsiteInfo && extractionSuccess) {
      // Normalize service locations to ensure correct casing
      let normalizedServiceLocations = null;
      if (enhancedWorkspaceData.service_locations) {
        normalizedServiceLocations =
          enhancedWorkspaceData.service_locations.map((location: string) => {
            if (location.toLowerCase() === "instore") return "inStore";
            if (location.toLowerCase() === "clientlocation")
              return "clientLocation";
            return location;
          });
        console.log(
          "Normalized service locations:",
          normalizedServiceLocations
        );
      }

      // If using website info extraction, update all available fields
      updateData = {
        name: enhancedWorkspaceData.name,
        contact_email: enhancedWorkspaceData.contact_email || null,
        contact_phone: enhancedWorkspaceData.contact_phone || null,
        website: enhancedWorkspaceData.website || null,
        description: enhancedWorkspaceData.description || null,
        logo_url: null,
        business_type: enhancedWorkspaceData.business_type || null,
        service_locations: normalizedServiceLocations,
        address: enhancedWorkspaceData.address || null,
        lat: enhancedWorkspaceData.lat || null,
        lng: enhancedWorkspaceData.lng || null,
        timezone: enhancedWorkspaceData.timezone || null,
        require_upfront_payment:
          enhancedWorkspaceData.require_upfront_payment !== undefined
            ? enhancedWorkspaceData.require_upfront_payment
            : null,
        updated_at: new Date().toISOString(),
      };
    } else {
      // For manual updates, only update name and website
      updateData.name = workspaceData.name;
      updateData.website = workspaceData.website || null;
      updateData.contact_email = workspaceData.contact_email || null;
      updateData.contact_phone = workspaceData.contact_phone || null;
      updateData.description = workspaceData.description || null;
      updateData.logo_url = workspaceData.logo_url || null;
      updateData.timezone = workspaceData.timezone || null;

      // Include address if provided
      if (workspaceData.address) {
        updateData.address = workspaceData.address;
      }

      // Include coordinates if provided
      if (workspaceData.lat !== undefined && workspaceData.lng !== undefined) {
        updateData.lat = workspaceData.lat;
        updateData.lng = workspaceData.lng;
      }

      // Include require_upfront_payment if provided
      if (workspaceData.require_upfront_payment !== undefined) {
        updateData.require_upfront_payment =
          workspaceData.require_upfront_payment;
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from("workspaces")
      .update(updateData)
      .eq("id", workspaceId);

    if (updateError) {
      console.error("Error updating workspace:", updateError);
      return NextResponse.json(
        { error: "Failed to update workspace" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Workspace updated successfully",
      extractionSuccess,
      extractedFields: extractedFields || [],
      enhancedData: useWebsiteInfo && extractionSuccess,
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
