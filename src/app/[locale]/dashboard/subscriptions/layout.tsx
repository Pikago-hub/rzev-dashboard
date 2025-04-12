"use client";

import React from "react";
import RouteGuard from "@/lib/route-guard";

export default function SubscriptionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Only owner can access subscriptions
    <RouteGuard requiredRole="owner">{children}</RouteGuard>
  );
}
