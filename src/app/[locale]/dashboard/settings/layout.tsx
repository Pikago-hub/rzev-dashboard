'use client';

import React from 'react';
import RouteGuard from '@/lib/route-guard';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Any user can access settings
    <RouteGuard>{children}</RouteGuard>
  );
} 