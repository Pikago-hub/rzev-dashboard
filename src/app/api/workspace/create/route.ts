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
      workspaceData,
      useWebsiteInfo = false,
    } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!workspaceData || !workspaceData.name) {
      return NextResponse.json(
        { error: "Workspace name is required" },
        { status: 400 }
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

    // Normalize service locations to ensure correct casing
    let normalizedServiceLocations = null;
    if (enhancedWorkspaceData.service_locations) {
      normalizedServiceLocations = enhancedWorkspaceData.service_locations.map(
        (location: string) => {
          if (location.toLowerCase() === "instore") return "inStore";
          if (location.toLowerCase() === "clientlocation")
            return "clientLocation";
          return location;
        }
      );
      console.log("Normalized service locations:", normalizedServiceLocations);
    }

    // Create the workspace
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .insert({
        name: enhancedWorkspaceData.name,
        contact_email: enhancedWorkspaceData.contact_email || null,
        contact_phone: enhancedWorkspaceData.contact_phone || null,
        website: enhancedWorkspaceData.website || null,
        description: enhancedWorkspaceData.description || null,
        logo_url: null, // Don't use extracted logo_url
        business_type: enhancedWorkspaceData.business_type || null,
        service_locations: normalizedServiceLocations,
        address: enhancedWorkspaceData.address || null,
        lat: enhancedWorkspaceData.lat || null,
        lng: enhancedWorkspaceData.lng || null,
        timezone: enhancedWorkspaceData.timezone || null,
        active_status: false,
        onboarding_complete: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (workspaceError) {
      console.error("Error creating workspace:", workspaceError);
      return NextResponse.json(
        { error: "Failed to create workspace" },
        { status: 500 }
      );
    }

    // Add the user as a workspace member with owner role
    const { error: memberError } = await supabaseAdmin
      .from("workspace_members")
      .insert({
        workspace_id: workspace.id,
        team_member_id: userId,
        role: "owner",
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (memberError) {
      console.error("Error adding workspace member:", memberError);
      // Try to delete the workspace if we couldn't add the member
      await supabaseAdmin.from("workspaces").delete().eq("id", workspace.id);

      return NextResponse.json(
        { error: "Failed to add user to workspace" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Workspace created successfully",
      workspaceId: workspace.id,
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
