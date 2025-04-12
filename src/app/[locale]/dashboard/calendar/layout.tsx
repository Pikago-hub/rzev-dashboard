'use client';

import React from 'react';
import RouteGuard from '@/lib/route-guard';

export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Both staff and admins can access calendar
    <RouteGuard>{children}</RouteGuard>
  );
} 