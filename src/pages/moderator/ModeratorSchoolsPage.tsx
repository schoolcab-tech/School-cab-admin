import { DashboardLayout } from "@/components/DashboardLayout";
import { SchoolsTable } from "@/components/tables/SchoolsTable";
import { useAuth } from "@/contexts/auth-context";
import { useNavigate } from "react-router-dom";

export default function ModeratorSchoolsPage() {
  const navigate = useNavigate();
  const { moderatorId } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Schools</h1>
          <p className="text-muted-foreground">
            Add and edit schools you operate. New schools are automatically linked to your account.
          </p>
        </div>
        <SchoolsTable
          moderatorId={moderatorId ?? undefined}
          allowDelete={false}
          allowBulkUpload={false}
          onAddSchool={() => navigate("/moderator/schools/new")}
          onViewSchool={(id) => navigate(`/moderator/schools/${id}`)}
          onEditSchool={(id) => navigate(`/moderator/schools/${id}/edit`)}
        />
      </div>
    </DashboardLayout>
  );
}
