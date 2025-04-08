import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    // Use the admin client to check if a user with this email exists
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      filter: {
        email: email,
      },
    });

    if (error) {
      throw error;
    }

    // Check if any users were found with this email
    const exists = data.users.length > 0;

    return NextResponse.json({ exists });
  } catch (error) {
    console.error('Error checking if user exists:', error);
    return NextResponse.json(
      { error: 'Failed to check if user exists' },
      { status: 500 }
    );
  }
}
