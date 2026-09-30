import { DashboardLayout } from "@/components/DashboardLayout";
import { SchoolAdminsContent } from "@/pages/master-admin/SchoolAdminsPage";
import { useAuth } from "@/contexts/auth-context";
import { useModeratorSchoolContext } from "@/contexts/moderator-school-context";

export default function ModeratorSchoolAdminsPage() {
  const { moderatorId } = useAuth();
  const { moderatorSchoolIds } = useModeratorSchoolContext();

  if (!moderatorId) {
    return (
      <DashboardLayout>
        <p className="text-muted-foreground p-8">Moderator account not loaded.</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <SchoolAdminsContent
        allowDelete={false}
        schoolIds={moderatorSchoolIds}
        title="School Admins"
        description="Create and manage school-admin logins for schools you operate. You cannot delete accounts — contact master admin if needed."
      />
    </DashboardLayout>
  );
}
