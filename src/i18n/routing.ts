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
    "/profile": "/profile",
    "/settings": "/settings"
  },
});
