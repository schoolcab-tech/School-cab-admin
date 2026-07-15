import { useParams } from 'react-router-dom';
import { DriverDetail } from '@/components/drivers/DriverDetail';
import { DashboardLayout } from '@/components/DashboardLayout';

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  
  if (!id) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="rounded-lg border border-destructive p-6 text-center">
            <h3 className="text-lg font-medium text-destructive mb-2">Driver ID is required</h3>
            <p className="text-muted-foreground">
              The requested driver could not be found. Please check the URL and try again.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <DriverDetail />
    </DashboardLayout>
  );
}
