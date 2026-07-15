import { DashboardLayout } from "@/components/DashboardLayout";
import { DriverSimpleForm } from "@/components/forms/DriverSimpleForm";

export default function NewDriverPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add New Driver</h1>
          <p className="text-muted-foreground">
            Add a new driver to the system.
          </p>
        </div>
        <DriverSimpleForm />
      </div>
    </DashboardLayout>
  );
}
