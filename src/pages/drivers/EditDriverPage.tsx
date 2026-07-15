import { DashboardLayout } from "@/components/DashboardLayout";
import { DriverSimpleForm } from "@/components/forms/DriverSimpleForm";
import { useParams } from "react-router-dom";

export default function EditDriverPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="rounded-lg border border-destructive p-6 text-center">
            <h3 className="text-lg font-medium text-destructive mb-2">
              Driver ID is required
            </h3>
            <p className="text-muted-foreground">
              The requested driver could not be found. Please check the URL and
              try again.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Driver</h1>
          <p className="text-muted-foreground">
            Update driver information and details.
          </p>
        </div>
        <DriverSimpleForm driverId={id} />
      </div>
    </DashboardLayout>
  );
}
