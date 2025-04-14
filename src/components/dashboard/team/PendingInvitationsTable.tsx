"use client";

import { Button } from "@/components/ui/button";

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

interface PendingInvitationsTableProps {
  invitations: Invitation[];
  onCancelInvitation: (id: string) => void;
  translationFunc: (key: string, params?: Record<string, string>) => string;
  formatDate: (dateString: string) => string;
}

export function PendingInvitationsTable({
  invitations,
  onCancelInvitation,
  translationFunc: t,
  formatDate,
}: PendingInvitationsTableProps) {
  if (invitations.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h3 className="text-lg font-medium mb-4">{t("pendingInvitations")}</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-4">{t("email")}</th>
              <th className="text-left py-2 px-4">{t("role")}</th>
              <th className="text-left py-2 px-4">{t("invitedOn")}</th>
              <th className="text-left py-2 px-4">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((invitation) => (
              <tr key={invitation.id} className="border-b hover:bg-muted/50">
                <td className="py-2 px-4">{invitation.email}</td>
                <td className="py-2 px-4 capitalize">{invitation.role}</td>
                <td className="py-2 px-4">
                  {formatDate(invitation.created_at)}
                </td>
                <td className="py-2 px-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCancelInvitation(invitation.id)}
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
  );
}
