'use client';

import React from 'react';
import RouteGuard from '@/lib/route-guard';

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Both staff and admins can access services
    <RouteGuard>{children}</RouteGuard>
  );
} 