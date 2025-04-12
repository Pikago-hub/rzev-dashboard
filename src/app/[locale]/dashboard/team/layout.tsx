'use client';

import React from 'react';
import RouteGuard from '@/lib/route-guard';

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Allow all authenticated users to access team page
    <RouteGuard>{children}</RouteGuard>
  );
} 