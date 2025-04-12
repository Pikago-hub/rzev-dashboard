"use client";

import React from "react";
import RouteGuard from "@/lib/route-guard";

export default function ClientsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Only owner can access clients page
    <RouteGuard requiredRole="owner">{children}</RouteGuard>
  );
}
