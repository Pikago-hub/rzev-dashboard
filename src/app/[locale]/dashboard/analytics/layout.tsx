"use client";

import React from "react";
import RouteGuard from "@/lib/route-guard";

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Only owner can access analytics
    <RouteGuard requiredRole="owner">{children}</RouteGuard>
  );
}
