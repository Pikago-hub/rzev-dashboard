"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MoreVertical,
  Edit,
  Trash,
  Calendar,
  Plus,
  Clock,
  UserRound,
  Mail,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { createBrowserClient } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { AvailabilityForm } from "./AvailabilityForm";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";

interface TeamMemberCardProps {
  teamMember: {
    id: string;
    name: string;
    email?: string | null;
    role: string;
    active: boolean;
  };
  onEdit: (teamMember: TeamMemberCardProps["teamMember"]) => void;
  onDelete: (id: string) => void;
  translationFunc: (key: string) => string;
}

interface Availability {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export function TeamMemberCard({
  teamMember,
  onEdit,
  onDelete,
  translationFunc: t,
}: TeamMemberCardProps) {
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAvailabilityDialogOpen, setIsAvailabilityDialogOpen] = useState(false);
  const [selectedAvailability, setSelectedAvailability] = useState<Availability | undefined>(undefined);
  const [isDeleteAvailabilityOpen, setIsDeleteAvailabilityOpen] = useState(false);
  const [availabilityToDelete, setAvailabilityToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const supabase = createBrowserClient();

  // Fetch availabilities for this team member
  const fetchAvailabilities = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("team_member_availabilities")
        .select("*")
        .eq("team_member_id", teamMember.id)
        .order("day_of_week");

      if (error) throw error;
      
      if (data) {
        const typedData = data.map(item => ({
          id: item.id as string,
          day_of_week: item.day_of_week as number,
          start_time: item.start_time as string,
          end_time: item.end_time as string,
          is_available: item.is_available as boolean
        }));
        setAvailabilities(typedData);
      } else {
        setAvailabilities([]);
      }
    } catch (error) {
      console.error("Error fetching availabilities:", error);
      toast({
        title: t("common.error"),
        description: t("notifications.error"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [supabase, teamMember.id, toast, t]);

  useEffect(() => {
    fetchAvailabilities();
  }, [fetchAvailabilities]);

  const handleEditAvailability = (availability: Availability) => {
    setSelectedAvailability(availability);
    setIsAvailabilityDialogOpen(true);
  };

  const handleAddAvailability = () => {
    setSelectedAvailability(undefined);
    setIsAvailabilityDialogOpen(true);
  };

  const handleDeleteAvailability = async (id: string) => {
    try {
      const { error } = await supabase
        .from("team_member_availabilities")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("notifications.availabilityDeleteSuccess"),
      });
      
      fetchAvailabilities();
    } catch (error) {
      console.error("Error deleting availability:", error);
      toast({
        title: t("common.error"),
        description: t("notifications.error"),
        variant: "destructive",
      });
    }
  };

  const getDayName = (day: number) => {
    const dayKeys = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    return t(`availability.days.${dayKeys[day]}`);
  };

  // Format time to HH:MM, removing any seconds if present
  const formatTimeDisplay = (time: string): string => {
    if (!time) return "";
    // If time includes seconds (HH:MM:SS format), remove them
    if (time.length > 5 && /^\d{2}:\d{2}:\d{2}$/.test(time)) {
      return time.substring(0, 5);
    }
    return time;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex flex-col space-y-1">
          <CardTitle className="text-xl">{teamMember.name}</CardTitle>
          <div className="flex items-center text-sm text-muted-foreground">
            <Mail className="mr-1 h-4 w-4" />
            {teamMember.email || t("common.noEmail")}
          </div>
          <div className="flex items-center text-sm text-muted-foreground mt-1">
            <UserRound className="mr-1 h-4 w-4" />
            {t(`addTeamMemberForm.roles.${teamMember.role}`)}
            {!teamMember.active && (
              <Badge variant="outline" className="ml-2">
                Inactive
              </Badge>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTimeout(() => onEdit(teamMember), 0)}>
              <Edit className="mr-2 h-4 w-4" />
              {t("common.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTimeout(() => onDelete(teamMember.id), 0)}
              className="text-destructive focus:text-destructive"
            >
              <Trash className="mr-2 h-4 w-4" />
              {t("common.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Calendar className="mr-2 h-4 w-4" />
              <span className="font-medium">{t("availability.title")}</span>
            </div>
            <Button onClick={handleAddAvailability} size="sm" variant="outline">
              <Plus className="mr-1 h-3 w-3" />
              {t("availability.addAvailability")}
            </Button>
          </div>
          
          <Separator />
          
          {isLoading ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {t("common.loading")}
            </div>
          ) : availabilities.length > 0 ? (
            <div className="space-y-2 mt-2">
              {availabilities.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between py-1 text-sm"
                >
                  <div className="flex items-center">
                    <Badge 
                      variant={slot.is_available ? "default" : "outline"}
                      className="mr-2"
                    >
                      {getDayName(slot.day_of_week)}
                    </Badge>
                    <Clock className="mr-1 h-3 w-3 text-muted-foreground" />
                    <span>
                      {formatTimeDisplay(slot.start_time)} - {formatTimeDisplay(slot.end_time)}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleEditAvailability(slot)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => {
                        setAvailabilityToDelete(slot.id);
                        setIsDeleteAvailabilityOpen(true);
                      }}
                    >
                      <Trash className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {t("availability.noAvailability")}
            </div>
          )}
        </div>
      </CardContent>

      {/* Availability Form Dialog - Keep rendered, control via 'open' prop */}
      <AvailabilityForm
        open={isAvailabilityDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAvailabilityDialogOpen(false);
            // Keep setTimeout for potential animation cleanup or debouncing
            setTimeout(() => setSelectedAvailability(undefined), 100); 
          } else {
            setIsAvailabilityDialogOpen(true); // Ensure state is true if opened externally
          }
        }}
        onSuccess={() => {
          fetchAvailabilities();
          setIsAvailabilityDialogOpen(false); // Close form on success
        }}
        teamMemberId={teamMember.id}
        availability={selectedAvailability}
        translationFunc={t}
      />

      {/* Delete Availability Confirmation - Keep rendered, control via 'open' prop */}
      <DeleteConfirmationDialog
        open={isDeleteAvailabilityOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsDeleteAvailabilityOpen(false);
             // Keep setTimeout for potential animation cleanup or debouncing
            setTimeout(() => setAvailabilityToDelete(null), 100); 
          } else {
            setIsDeleteAvailabilityOpen(true); // Ensure state is true if opened externally
          }
        }}
        onConfirm={() => {
          if (availabilityToDelete) {
            handleDeleteAvailability(availabilityToDelete);
            setIsDeleteAvailabilityOpen(false); // Close dialog on confirm
            setAvailabilityToDelete(null); // Reset state
          }
        }}
        title={t("availability.delete")}
        description={t("deleteConfirmation.message")}
        confirmText={t("deleteConfirmation.confirm")}
        cancelText={t("deleteConfirmation.cancel")}
      />
    </Card>
  );
} 