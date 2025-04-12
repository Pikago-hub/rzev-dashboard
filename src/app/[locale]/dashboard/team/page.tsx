"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/dashboard/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/lib/workspace-context";
import { useToast } from "@/components/ui/use-toast";
import { TeamMemberForm } from "@/components/dashboard/team/TeamMemberForm";
import { TeamMemberCard } from "@/components/dashboard/team/TeamMemberCard";
import { DeleteConfirmationDialog } from "@/components/dashboard/team/DeleteConfirmationDialog";
import { createBrowserClient } from "@/lib/supabase";

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
  }, [fetchTeamData]);

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
    setSelectedTeamMember(null);
    setIsFormOpen(true);
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
      const { error } = await supabase
        .from("workspace_invitations")
        .update({ status: "expired" })
        .eq("id", invitationId)
        .eq("workspace_id", workspaceProfile.id);

      if (error) {
        throw new Error(error.message || "Failed to cancel invitation");
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
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">
            {isStaff ? t("subtitleStaff") : t("subtitle")}
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>{t("teamMembers")}</CardTitle>
                <CardDescription>
                  {isStaff
                    ? t("teamMembersDescriptionStaff")
                    : t("teamMembersDescription")}
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {!isStaff && (
                  <>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder={t("searchPlaceholder")}
                        className="pl-8 w-full md:w-[300px]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleAddTeamMember}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t("addTeamMember")}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[200px] flex items-center justify-center">
                <p className="text-muted-foreground">{t("common.loading")}</p>
              </div>
            ) : (
              <>
                {/* Pending Invitations Section - Only shown to admins */}
                {!isStaff && pendingInvitations.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-medium mb-4">
                      {t("pendingInvitations")}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-4">
                              {t("email")}
                            </th>
                            <th className="text-left py-2 px-4">{t("role")}</th>
                            <th className="text-left py-2 px-4">
                              {t("invitedOn")}
                            </th>
                            <th className="text-left py-2 px-4">
                              {t("actions")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingInvitations.map((invitation) => (
                            <tr
                              key={invitation.id}
                              className="border-b hover:bg-muted/50"
                            >
                              <td className="py-2 px-4">{invitation.email}</td>
                              <td className="py-2 px-4 capitalize">
                                {invitation.role}
                              </td>
                              <td className="py-2 px-4">
                                {formatDate(invitation.created_at)}
                              </td>
                              <td className="py-2 px-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleCancelInvitation(invitation.id)
                                  }
                                >
                                  {t("cancelInvitation")}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Team Members Section */}
                {filteredTeamMembers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTeamMembers.map((member) => (
                      <TeamMemberCard
                        key={member.id}
                        teamMember={{
                          id: member.id,
                          name: member.display_name,
                          email: member.email,
                          role: member.role,
                          active: member.active,
                        }}
                        onEdit={!isStaff ? handleEditTeamMember : undefined}
                        onDelete={!isStaff ? handleDeleteTeamMember : undefined}
                        translationFunc={t}
                        readOnly={isStaff && session?.user?.id !== member.id}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="h-[200px] flex flex-col items-center justify-center text-center">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {searchQuery
                        ? t("noSearchResults")
                        : pendingInvitations.length > 0
                          ? t("noActiveTeamMembers")
                          : t("noTeamMembers")}
                    </p>
                    {!isStaff &&
                      !searchQuery &&
                      pendingInvitations.length === 0 && (
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={handleAddTeamMember}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          {t("addTeamMember")}
                        </Button>
                      )}
                  </div>
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
        </>
      )}
    </DashboardLayout>
  );
}
