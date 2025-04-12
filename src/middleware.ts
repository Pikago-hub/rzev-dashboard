import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { createServerClient } from './lib/supabase';

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  // Handle Supabase auth
  const supabase = createServerClient();

  // Create a cookies instance
  const requestCookies = request.cookies;
  const supabaseAuthCookie = requestCookies.get('supabase-auth');
  
  // Check if it's a protected route
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard');
  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth');
  const isOnboardingRoute = request.nextUrl.pathname.startsWith('/onboarding');

  try {
    // Only check auth for protected routes
    if (isProtectedRoute || isOnboardingRoute) {
      // Get auth state
      const { data: { session } } = await supabase.auth.getSession();
      
      // If no auth and trying to access protected route, redirect to login
      if (!session && isProtectedRoute) {
        const redirectUrl = new URL('/auth', request.url);
        return NextResponse.redirect(redirectUrl);
      }
    }
    
    // For auth routes, redirect logged-in users to dashboard
    if (isAuthRoute && supabaseAuthCookie) {
      // Verify that cookie corresponds to a valid session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const redirectUrl = new URL('/dashboard', request.url);
        return NextResponse.redirect(redirectUrl);
      }
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
  }

  // Continue with the intl middleware
  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/auth/callback'],
};
