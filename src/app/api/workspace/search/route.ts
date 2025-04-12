import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("query") || "";
    const limit = parseInt(url.searchParams.get("limit") || "10");

    // Search for workspaces by name, email, or website
    let supabaseQuery = supabaseAdmin
      .from("workspaces")
      .select("id, name, contact_email, website, logo_url")
      .limit(limit);

    if (query) {
      supabaseQuery = supabaseQuery.or(
        `name.ilike.%${query}%,contact_email.ilike.%${query}%,website.ilike.%${query}%`
      );
    }

    const { data: workspaces, error } = await supabaseQuery;

    if (error) {
      console.error("Error searching workspaces:", error);
      return NextResponse.json(
        { error: "Failed to search workspaces" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      workspaces: workspaces || [],
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
