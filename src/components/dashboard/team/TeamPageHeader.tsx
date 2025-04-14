"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SearchBar } from "./SearchBar";

interface TeamPageHeaderProps {
  title: string;
  subtitle: string;
  teamMembersTitle: string;
  teamMembersDescription: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onAddTeamMember: () => void;
  isLoading: boolean;
  isSubscriptionLoading: boolean;
  isStaff: boolean;
  searchPlaceholder: string;
  addTeamMemberText: string;
  loadingText: string;
}

export function TeamPageHeader({
  title,
  subtitle,
  teamMembersTitle,
  teamMembersDescription,
  searchQuery,
  onSearchChange,
  onAddTeamMember,
  isLoading,
  isSubscriptionLoading,
  isStaff,
  searchPlaceholder,
  addTeamMemberText,
  loadingText,
}: TeamPageHeaderProps) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{teamMembersTitle}</h2>
          <p className="text-sm text-muted-foreground">{teamMembersDescription}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {!isStaff && (
            <>
              <SearchBar
                value={searchQuery}
                onChange={onSearchChange}
                placeholder={searchPlaceholder}
              />
              <Button
                onClick={onAddTeamMember}
                disabled={isLoading || isSubscriptionLoading}
              >
                {isLoading || isSubscriptionLoading ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {loadingText}
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    {addTeamMemberText}
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
