"use client";

import React from "react";
import RouteGuard from "@/lib/route-guard";

export default function UsageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RouteGuard requiredRole="owner">{children}</RouteGuard>;
}
