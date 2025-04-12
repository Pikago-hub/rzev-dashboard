"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Briefcase, Plus, X, Loader2 } from "lucide-react";
import { getAuthToken } from "@/lib/auth-context";

// Type for translation function
type TranslationFunction = (key: string) => string;

interface Service {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
}

interface ServiceAssignment {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceDescription: string | null;
  serviceColor: string | null;
  selfAssigned: boolean;
  assignedBy: string | null;
  assignedAt: string | null;
  active: boolean;
}

interface TeamMemberServicesProps {
  teamMemberId: string;
  workspaceId: string;
  translationFunc: TranslationFunction;
  isOwner: boolean;
  isSelf: boolean;
  onRefresh?: () => void;
}

export function TeamMemberServices({
  teamMemberId,
  workspaceId,
  translationFunc: t,
  isOwner,
  isSelf,
  onRefresh,
}: TeamMemberServicesProps) {
  const [assignments, setAssignments] = useState<ServiceAssignment[]>([]);
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isRemoving, setIsRemoving] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  // Fetch service assignments
  const fetchServiceAssignments = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await getAuthToken();

      const response = await fetch(
        `/api/team/member/services?teamMemberId=${teamMemberId}&workspaceId=${workspaceId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to fetch service assignments"
        );
      }

      const data = await response.json();
      setAssignments(
        data.assignments.filter((a: ServiceAssignment) => a.active)
      );
      setAvailableServices(data.availableServices);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching service assignments:", error);
      toast({
        title: t("common.error"),
        description: t("services.fetchError"),
        variant: "destructive",
      });
      setIsLoading(false);
    }
  }, [teamMemberId, workspaceId, t, toast]);

  // Assign a service
  const assignService = async () => {
    if (!selectedServiceId) {
      toast({
        title: t("common.error"),
        description: t("services.selectService"),
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAssigning(true);
      const token = await getAuthToken();

      const response = await fetch("/api/team/member/services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          teamMemberId,
          serviceId: selectedServiceId,
          workspaceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to assign service");
      }

      toast({
        title: t("common.success"),
        description: t("services.assignSuccess"),
      });

      // Refresh data
      await fetchServiceAssignments();
      setSelectedServiceId("");
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error assigning service:", error);
      toast({
        title: t("common.error"),
        description: t("services.assignError"),
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  // Remove a service assignment
  const removeServiceAssignment = async (assignmentId: string) => {
    try {
      setIsRemoving((prev) => ({ ...prev, [assignmentId]: true }));
      const token = await getAuthToken();

      const response = await fetch(
        `/api/team/member/services?assignmentId=${assignmentId}&teamMemberId=${teamMemberId}&workspaceId=${workspaceId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to remove service assignment"
        );
      }

      toast({
        title: t("common.success"),
        description: t("services.removeSuccess"),
      });

      // Refresh data
      await fetchServiceAssignments();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error removing service assignment:", error);
      toast({
        title: t("common.error"),
        description: t("services.removeError"),
        variant: "destructive",
      });
    } finally {
      setIsRemoving((prev) => ({ ...prev, [assignmentId]: false }));
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchServiceAssignments();
  }, [teamMemberId, workspaceId, fetchServiceAssignments]);

  // Filter available services to only show those not already assigned
  const unassignedServices = availableServices.filter(
    (service) => !assignments.some((a) => a.serviceId === service.id)
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center">
          <Briefcase className="h-4 w-4 mr-2" />
          {t("services.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Service Assignment Form */}
            {(isOwner || isSelf) && unassignedServices.length > 0 && (
              <div className="mb-4">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Select
                      value={selectedServiceId}
                      onValueChange={setSelectedServiceId}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("services.selectPlaceholder")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {unassignedServices.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={assignService}
                    disabled={isAssigning || !selectedServiceId}
                    size="sm"
                  >
                    {isAssigning ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Plus className="h-4 w-4 mr-1" />
                    )}
                    {t("services.assign")}
                  </Button>
                </div>
              </div>
            )}

            <Separator className="my-2" />

            {/* Assigned Services List */}
            <div className="space-y-2 mt-3">
              {assignments.length > 0 ? (
                assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        style={{
                          backgroundColor: assignment.serviceColor || undefined,
                        }}
                        className="h-2 w-2 rounded-full p-1"
                      />
                      <span className="font-medium">
                        {assignment.serviceName}
                      </span>
                      {assignment.selfAssigned && (
                        <Badge variant="outline" className="text-xs">
                          {t("services.selfAssigned")}
                        </Badge>
                      )}
                    </div>
                    {(isOwner || (isSelf && assignment.selfAssigned)) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeServiceAssignment(assignment.id)}
                        disabled={isRemoving[assignment.id]}
                      >
                        {isRemoving[assignment.id] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-3 text-muted-foreground">
                  <p>{t("services.noAssignments")}</p>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
