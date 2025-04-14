"use client";

import { Button } from "@/components/ui/button";
import { Users, Plus } from "lucide-react";

interface EmptyTeamStateProps {
  searchQuery: string;
  pendingInvitationsCount: number;
  isStaff: boolean;
  isLoading: boolean;
  isSubscriptionLoading: boolean;
  onAddTeamMember: () => void;
  translationFunc: (key: string, params?: Record<string, string>) => string;
}

export function EmptyTeamState({
  searchQuery,
  pendingInvitationsCount,
  isStaff,
  isLoading,
  isSubscriptionLoading,
  onAddTeamMember,
  translationFunc: t,
}: EmptyTeamStateProps) {
  return (
    <div className="h-[200px] flex flex-col items-center justify-center text-center">
      <Users className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-muted-foreground">
        {searchQuery
          ? t("noSearchResults")
          : pendingInvitationsCount > 0
            ? t("noActiveTeamMembers")
            : t("noTeamMembers")}
      </p>
      {!isStaff && !searchQuery && pendingInvitationsCount === 0 && (
        <Button
          variant="outline"
          className="mt-4"
          onClick={onAddTeamMember}
          disabled={isLoading || isSubscriptionLoading}
        >
          {isLoading || isSubscriptionLoading ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {t("common.loading")}
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              {t("addTeamMember")}
            </>
          )}
        </Button>
      )}
    </div>
  );
}
