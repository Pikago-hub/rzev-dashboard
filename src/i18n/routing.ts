import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "cn", "es"],
  defaultLocale: "en",
  pathnames: {
    "/": "/",
    "/auth": "/auth",
    "/auth/callback": "/auth/callback",
    "/auth/confirm-email": "/auth/confirm-email",
    "/dashboard": "/dashboard",
    "/dashboard/calendar": "/dashboard/calendar",
    "/dashboard/clients": "/dashboard/clients",
    "/dashboard/team": "/dashboard/team",
    "/dashboard/subscriptions": "/dashboard/subscriptions",
    "/dashboard/analytics": "/dashboard/analytics",
    "/dashboard/messages": "/dashboard/messages",
    "/dashboard/services": "/dashboard/services",
    "/dashboard/settings": "/dashboard/settings",
    "/profile": "/profile",
    "/settings": "/settings",
  },
});
