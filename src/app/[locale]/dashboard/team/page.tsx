"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/dashboard/layout/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/lib/workspace-context";
import { useToast } from "@/components/ui/use-toast";
import { TeamMemberForm } from "@/components/dashboard/team/TeamMemberForm";
import { DeleteConfirmationDialog } from "@/components/dashboard/team/DeleteConfirmationDialog";
import { SeatLimitDialog } from "@/components/dashboard/team/SeatLimitDialog";
import { createBrowserClient } from "@/lib/supabase";
import { TeamPageHeader } from "@/components/dashboard/team/TeamPageHeader";
import { PendingInvitationsTable } from "@/components/dashboard/team/PendingInvitationsTable";
import { TeamMembersGrid } from "@/components/dashboard/team/TeamMembersGrid";
import { EmptyTeamState } from "@/components/dashboard/team/EmptyTeamState";
import { LoadingState } from "@/components/dashboard/team/LoadingState";

interface TeamMember {
  id: string;
  display_name: string;
  email: string | null;
  role: string;
  active: boolean;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

interface SubscriptionUsage {
  subscription: {
    id: string;
    status: string;
    billing_interval: string | null;
  };
  plan: {
    id: string;
    name: string;
    included_seats: number;
  };
  limits: {
    seats: number;
  };
  usage: {
    seats: number;
  };
}

export default function TeamPage() {
  const t = useTranslations("dashboard.team");
  const { session } = useAuth();
  const { workspaceProfile } = useWorkspace();
  const { toast } = useToast();
  const supabase = createBrowserClient();

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [filteredTeamMembers, setFilteredTeamMembers] = useState<TeamMember[]>(
    []
  );
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isStaff, setIsStaff] = useState(false);

  // Form dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTeamMember, setSelectedTeamMember] =
    useState<TeamMember | null>(null);

  // Delete confirmation dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [teamMemberIdToDelete, setTeamMemberIdToDelete] = useState<
    string | null
  >(null);

  // Seat limit dialog state
  const [isSeatLimitDialogOpen, setIsSeatLimitDialogOpen] = useState(false);
  const [subscriptionUsage, setSubscriptionUsage] =
    useState<SubscriptionUsage | null>(null);

  // Fetch subscription usage data
  const fetchSubscriptionUsage = useCallback(async () => {
    if (!workspaceProfile || !workspaceProfile.id || !session) {
      setIsSubscriptionLoading(false);
      return null;
    }

    try {
      setIsSubscriptionLoading(true);
      const response = await fetch(
        `/api/usage/current?workspaceId=${workspaceProfile.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error fetching usage data:", errorData);
        return null;
      }

      const data = await response.json();
      setSubscriptionUsage(data);
      return data;
    } catch (error) {
      console.error("Error fetching subscription usage:", error);
      return null;
    } finally {
      setIsSubscriptionLoading(false);
    }
  }, [workspaceProfile, session, setIsSubscriptionLoading]);

  // Fetch team members and invitations
  const fetchTeamData = useCallback(async () => {
    if (!workspaceProfile || !workspaceProfile.id || !session) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Make a proper request with the auth token for team members
      const response = await fetch(
        `/api/team?workspaceId=${workspaceProfile.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch team members");
      }

      const { teamMembers: data, isStaff: userIsStaff } = await response.json();

      // Set the staff status from API response
      setIsStaff(userIsStaff === true);

      if (data && data.length > 0) {
        setTeamMembers(data);
        setFilteredTeamMembers(data);
      } else {
        setTeamMembers([]);
        setFilteredTeamMembers([]);
      }

      // Only fetch pending invitations if not staff
      if (!userIsStaff) {
        // Fetch pending invitations
        const { data: invitationData, error: invitationError } = await supabase
          .from("workspace_invitations")
          .select("id, email, role, status, created_at")
          .eq("workspace_id", workspaceProfile.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        if (invitationError) {
          console.error("Error fetching invitations:", invitationError);
        } else {
          setPendingInvitations((invitationData as Invitation[]) || []);
        }
      } else {
        // Clear invitations for staff
        setPendingInvitations([]);
      }
    } catch (error) {
      console.error("Error fetching team data:", error);
      toast({
        title: t("error"),
        description: t("notifications.error"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [workspaceProfile, session, toast, t, supabase]);

  useEffect(() => {
    fetchTeamData();
    fetchSubscriptionUsage();
  }, [fetchTeamData, fetchSubscriptionUsage]);

  // Filter team members when search query changes
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredTeamMembers(teamMembers);
    } else {
      const lowercasedQuery = searchQuery.toLowerCase();
      const filtered = teamMembers.filter(
        (member) =>
          member.display_name.toLowerCase().includes(lowercasedQuery) ||
          (member.email &&
            member.email.toLowerCase().includes(lowercasedQuery)) ||
          member.role.toLowerCase().includes(lowercasedQuery)
      );
      setFilteredTeamMembers(filtered);
    }
  }, [searchQuery, teamMembers]);

  const handleAddTeamMember = () => {
    // Don't proceed if data is still loading
    if (isLoading || isSubscriptionLoading) {
      return;
    }

    // Check if we've reached the seat limit
    if (
      subscriptionUsage &&
      subscriptionUsage.usage.seats >= subscriptionUsage.limits.seats
    ) {
      // Show seat limit dialog
      setIsSeatLimitDialogOpen(true);
    } else {
      // Proceed with adding a team member
      setSelectedTeamMember(null);
      setIsFormOpen(true);
    }
  };

  const handleEditTeamMember = (teamMember: {
    id: string;
    name: string;
    email?: string | null;
    role: string;
    active: boolean;
  }) => {
    // Find the full team member data
    const fullTeamMember = teamMembers.find(
      (member) => member.id === teamMember.id
    );

    if (fullTeamMember) {
      setSelectedTeamMember(fullTeamMember);
      setIsFormOpen(true);
    }
  };

  const handleDeleteTeamMember = (id: string) => {
    setTeamMemberIdToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteTeamMember = async () => {
    if (!teamMemberIdToDelete || !workspaceProfile?.id || !session) return;

    try {
      const response = await fetch(
        `/api/team/member?workspaceId=${workspaceProfile.id}&teamMemberId=${teamMemberIdToDelete}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete team member");
      }

      toast({
        title: t("success"),
        description: t("notifications.deleteSuccess"),
      });

      fetchTeamData();
    } catch (error) {
      console.error("Error deleting team member:", error);
      toast({
        title: t("error"),
        description: t("notifications.error"),
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setTeamMemberIdToDelete(null);
    }
  };

  // Cancel an invitation
  const handleCancelInvitation = async (invitationId: string) => {
    if (!workspaceProfile?.id || !session) return;

    try {
      const response = await fetch("/api/team/cancel-invitation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          invitationId,
          workspaceId: workspaceProfile.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel invitation");
      }

      toast({
        title: t("success"),
        description: t("invitationCancelled"),
      });

      fetchTeamData();
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      toast({
        title: t("error"),
        description: t("notifications.error"),
        variant: "destructive",
      });
    }
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <TeamPageHeader
          title={t("title")}
          subtitle={isStaff ? t("subtitleStaff") : t("subtitle")}
          teamMembersTitle={t("teamMembers")}
          teamMembersDescription={
            isStaff
              ? t("teamMembersDescriptionStaff")
              : t("teamMembersDescription")
          }
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAddTeamMember={handleAddTeamMember}
          isLoading={isLoading}
          isSubscriptionLoading={isSubscriptionLoading}
          isStaff={isStaff}
          searchPlaceholder={t("searchPlaceholder")}
          addTeamMemberText={t("addTeamMember")}
          loadingText={t("common.loading")}
        />

        <Card>
          <CardHeader className="pb-3" />
          <CardContent>
            {isLoading ? (
              <LoadingState loadingText={t("common.loading")} />
            ) : (
              <>
                {/* Pending Invitations Section - Only shown to admins */}
                {!isStaff && (
                  <PendingInvitationsTable
                    invitations={pendingInvitations}
                    onCancelInvitation={handleCancelInvitation}
                    translationFunc={t}
                    formatDate={formatDate}
                  />
                )}

                {/* Team Members Section */}
                {filteredTeamMembers.length > 0 ? (
                  <TeamMembersGrid
                    teamMembers={filteredTeamMembers}
                    onEdit={!isStaff ? handleEditTeamMember : undefined}
                    onDelete={!isStaff ? handleDeleteTeamMember : undefined}
                    translationFunc={t}
                    isStaff={isStaff}
                    session={session}
                    workspaceId={workspaceProfile?.id}
                  />
                ) : (
                  <EmptyTeamState
                    searchQuery={searchQuery}
                    pendingInvitationsCount={pendingInvitations.length}
                    isStaff={isStaff}
                    isLoading={isLoading}
                    isSubscriptionLoading={isSubscriptionLoading}
                    onAddTeamMember={handleAddTeamMember}
                    translationFunc={t}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Only render form and delete dialog for non-staff users */}
      {!isStaff && (
        <>
          {/* Team Member Form Dialog */}
          <TeamMemberForm
            open={isFormOpen}
            onOpenChange={(open) => {
              if (!open) {
                setIsFormOpen(false);
                setTimeout(() => setSelectedTeamMember(null), 100);
              } else {
                setIsFormOpen(true);
              }
            }}
            onSuccess={() => {
              fetchTeamData();
              setIsFormOpen(false);
            }}
            onSeatLimitReached={() => {
              setIsSeatLimitDialogOpen(true);
            }}
            teamMember={
              selectedTeamMember
                ? {
                    id: selectedTeamMember.id,
                    name: selectedTeamMember.display_name,
                    email: selectedTeamMember.email || "",
                    role: selectedTeamMember.role,
                    active: selectedTeamMember.active,
                  }
                : undefined
            }
            workspaceId={workspaceProfile?.id || ""}
            translationFunc={t}
          />

          {/* Delete Confirmation Dialog */}
          <DeleteConfirmationDialog
            open={isDeleteDialogOpen}
            onOpenChange={(open) => {
              if (!open) {
                setIsDeleteDialogOpen(false);
                setTimeout(() => setTeamMemberIdToDelete(null), 100);
              } else {
                setIsDeleteDialogOpen(true);
              }
            }}
            onConfirm={confirmDeleteTeamMember}
            title={t("deleteConfirmation.title")}
            description={t("deleteConfirmation.message")}
            confirmText={t("deleteConfirmation.confirm")}
            cancelText={t("deleteConfirmation.cancel")}
          />

          {/* Seat Limit Dialog */}
          <SeatLimitDialog
            open={isSeatLimitDialogOpen}
            onOpenChange={(open) => setIsSeatLimitDialogOpen(open)}
            translationFunc={t}
            billingInterval={
              subscriptionUsage?.subscription.billing_interval || null
            }
            onSuccess={() => {
              // Refresh subscription usage and team data when seats are added
              fetchSubscriptionUsage();
              fetchTeamData();
            }}
          />
        </>
      )}
    </DashboardLayout>
  );
}
