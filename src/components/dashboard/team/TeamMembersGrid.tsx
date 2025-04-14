"use client";

import { TeamMemberCard } from "./TeamMemberCard";
import { Session } from "@supabase/supabase-js";

interface TeamMember {
  id: string;
  display_name: string;
  email: string | null;
  role: string;
  active: boolean;
}

interface TeamMembersGridProps {
  teamMembers: TeamMember[];
  onEdit?: (teamMember: {
    id: string;
    name: string;
    email?: string | null;
    role: string;
    active: boolean;
  }) => void;
  onDelete?: (id: string) => void;
  translationFunc: (key: string, params?: Record<string, string>) => string;
  isStaff: boolean;
  session: Session | null;
  workspaceId?: string;
}

export function TeamMembersGrid({
  teamMembers,
  onEdit,
  onDelete,
  translationFunc: t,
  isStaff,
  session,
}: TeamMembersGridProps) {
  if (teamMembers.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {teamMembers.map((member) => (
        <TeamMemberCard
          key={member.id}
          teamMember={{
            id: member.id,
            name: member.display_name,
            email: member.email,
            role: member.role,
            active: member.active,
          }}
          onEdit={!isStaff ? onEdit : undefined}
          onDelete={!isStaff ? onDelete : undefined}
          translationFunc={t}
          readOnly={isStaff && session?.user?.id !== member.id}
        />
      ))}
    </div>
  );
}
