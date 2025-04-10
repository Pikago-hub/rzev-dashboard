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
import { createBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/use-toast";
import { TeamMemberForm } from "@/components/dashboard/team/TeamMemberForm";
import { TeamMemberCard } from "@/components/dashboard/team/TeamMemberCard";
import { DeleteConfirmationDialog } from "@/components/dashboard/team/DeleteConfirmationDialog";

interface TeamMember {
  id: string;
  name: string;
  email: string | null;
  role: string;
  merchant_id: string;
  active: boolean;
}

export default function TeamPage() {
  const t = useTranslations("dashboard.team");
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createBrowserClient();
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [filteredTeamMembers, setFilteredTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Form dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMember | null>(null);
  
  // Delete confirmation dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [teamMemberIdToDelete, setTeamMemberIdToDelete] = useState<string | null>(null);

  // Fetch team members
  const fetchTeamMembers = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("merchant_id", user.id)
        .order("name");

      if (error) throw error;
      
      const typedData = data?.map(item => ({
        id: item.id as string,
        name: item.name as string,
        email: item.email as string | null,
        role: item.role as string,
        merchant_id: item.merchant_id as string,
        active: item.active as boolean
      })) || [];
      
      setTeamMembers(typedData);
      setFilteredTeamMembers(typedData);
    } catch (error) {
      console.error("Error fetching team members:", error);
      toast({
        title: t("common.error"),
        description: t("notifications.error"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase, toast, t]);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  // Filter team members when search query changes
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredTeamMembers(teamMembers);
    } else {
      const lowercasedQuery = searchQuery.toLowerCase();
      const filtered = teamMembers.filter((member) => 
        member.name.toLowerCase().includes(lowercasedQuery) ||
        (member.email && member.email.toLowerCase().includes(lowercasedQuery)) ||
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
    // Find the full team member data including merchant_id
    const fullTeamMember = teamMembers.find(member => member.id === teamMember.id);
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
    if (!teamMemberIdToDelete) return;
    
    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", teamMemberIdToDelete);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("notifications.deleteSuccess"),
      });
      
      fetchTeamMembers();
    } catch (error) {
      console.error("Error deleting team member:", error);
      toast({
        title: t("common.error"),
        description: t("notifications.error"),
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setTeamMemberIdToDelete(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>{t("teamMembers")}</CardTitle>
                <CardDescription>{t("teamMembersDescription")}</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
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
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[200px] flex items-center justify-center">
                <p className="text-muted-foreground">{t("common.loading")}</p>
              </div>
            ) : filteredTeamMembers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTeamMembers.map((member) => (
                  <TeamMemberCard
                    key={member.id}
                    teamMember={member}
                    onEdit={handleEditTeamMember}
                    onDelete={handleDeleteTeamMember}
                    translationFunc={t}
                  />
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? t("noTeamMembers") : t("noTeamMembers")}
                </p>
                {!searchQuery && (
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
          </CardContent>
        </Card>
      </div>

      {/* Team Member Form Dialog - Keep rendered, control via 'open' prop */}
      <TeamMemberForm
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsFormOpen(false);
            // Reset selected team member after the dialog is closed
            // Keep setTimeout for potential animation cleanup or debouncing
            setTimeout(() => setSelectedTeamMember(null), 100); 
          } else {
             setIsFormOpen(true); // Ensure state is true if opened externally
          }
        }}
        onSuccess={() => {
          fetchTeamMembers();
          setIsFormOpen(false); // Close form on success
        }}
        teamMember={selectedTeamMember ? {
          id: selectedTeamMember.id,
          name: selectedTeamMember.name,
          email: selectedTeamMember.email || '',
          role: selectedTeamMember.role,
          active: selectedTeamMember.active
        } : undefined}
        merchantId={user?.id || ''} // Handle potential null user during initial render
        translationFunc={t}
      />

      {/* Delete Confirmation Dialog - Keep rendered, control via 'open' prop */}
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsDeleteDialogOpen(false);
            // Reset team member ID to delete after the dialog is closed
            // Keep setTimeout for potential animation cleanup or debouncing
            setTimeout(() => setTeamMemberIdToDelete(null), 100); 
          } else {
            setIsDeleteDialogOpen(true); // Ensure state is true if opened externally
          }
        }}
        onConfirm={confirmDeleteTeamMember}
        title={t("deleteConfirmation.title")}
        description={t("deleteConfirmation.message")}
        confirmText={t("deleteConfirmation.confirm")}
        cancelText={t("deleteConfirmation.cancel")}
      />
    </DashboardLayout>
  );
}
