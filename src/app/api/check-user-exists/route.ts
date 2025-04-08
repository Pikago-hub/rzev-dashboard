import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Use the admin client to check if a user with this email exists
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (error) {
      console.error("Error checking user existence:", error);
      return NextResponse.json(
        { error: "Failed to check if user exists" },
        { status: 500 }
      );
    }

    // Find the user with matching email
    const foundUser = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );

    if (!foundUser) {
      return NextResponse.json({ exists: false });
    }

    // User exists, get the provider information
    const provider = foundUser.app_metadata?.provider || "email";

    return NextResponse.json({
      exists: true,
      provider,
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
