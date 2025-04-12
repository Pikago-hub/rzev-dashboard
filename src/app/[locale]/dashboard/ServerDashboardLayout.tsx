import { getServerWorkspace } from "@/lib/server/getWorkspace";
import { ClientDashboardLayout } from "./layout";

export default async function ServerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch workspace data server-side
  const { workspaceProfile, userRole, isActive } = await getServerWorkspace();
  
  // Pass data to client component
  return (
    <ClientDashboardLayout 
      initialWorkspaceData={workspaceProfile}
      initialUserRole={userRole}
      initialIsActive={isActive}
    >
      {children}
    </ClientDashboardLayout>
  );
} 