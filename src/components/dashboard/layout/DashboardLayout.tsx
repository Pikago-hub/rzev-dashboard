"use client";

import { useState, useEffect } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardHeader } from "./DashboardHeader";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { VisuallyHidden } from "@/components/ui/visually-hidden";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Fix zoom issue on mobile
  useEffect(() => {
    // Ensure proper viewport meta tag is set
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
    }
    
    // Fix for Chrome and other browsers
    document.documentElement.style.height = '100%';
    document.body.style.height = '100%';
    
    return () => {
      document.documentElement.style.height = '';
      document.body.style.height = '';
    };
  }, []);

  return (
    <div className="flex min-h-screen h-screen w-full bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <DashboardSidebar className="hidden lg:flex h-screen sticky top-0" />

      {/* Mobile Sidebar */}
      <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <SheetTitle>
            <VisuallyHidden>Dashboard Navigation</VisuallyHidden>
          </SheetTitle>
          <DashboardSidebar className="border-none" />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col w-full h-screen overflow-hidden">
        <DashboardHeader>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsMobileNavOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </DashboardHeader>

        <main className="flex-1 p-4 md:p-6 w-full overflow-auto flex flex-col h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
