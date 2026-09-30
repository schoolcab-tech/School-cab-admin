import { DashboardLayout } from "@/components/DashboardLayout";
import { SchoolForm } from "@/components/forms/SchoolForm";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/auth-context"
import { useActiveSchoolId } from "@/hooks/useActiveSchoolId";
import { useSchool, useUpdateSchool } from "@/hooks/useSchools";
import { UpdateSchoolInput } from "@/types/school";
import { Building2, Loader2 } from "lucide-react";
import { useState } from "react";

export function SchoolAdminProfileContent() {
  const activeSchoolId = useActiveSchoolId();
  const { toast } = useToast();
  const { data: school, isLoading, error } = useSchool(
    activeSchoolId ? String(activeSchoolId) : ""
  );
  const updateSchool = useUpdateSchool();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!activeSchoolId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No school linked to your account.
      </div>
    );
  }

  if (isLoading || !school) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        Failed to load school profile.
      </div>
    );
  }

  const handleSubmit = async (data: UpdateSchoolInput) => {
    try {
      setIsSubmitting(true);
      await updateSchool.mutateAsync({
        id: String(activeSchoolId),
        data: {
          contact: data.contact,
          address: data.address,
          operatingHours: data.operatingHours,
          latitude: data.latitude,
          longitude: data.longitude,
          googlePlaceId: data.googlePlaceId,
          locationAccuracy: data.locationAccuracy,
          locationSource: data.locationSource,
        },
      });
      toast({
        title: "Profile updated",
        description: "School contact, hours, and location saved successfully.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Update failed",
        description: "Could not save school profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="h-8 w-8" />
          School Profile
        </h1>
        <p className="text-muted-foreground">
          Update contact details, operating hours, and location for {school.name}.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <SchoolForm
          initialData={school}
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
          isEdit
          profileMode
        />
      </div>
    </div>
  );
}

export default function SchoolAdminProfilePage() {
  return (
    <DashboardLayout>
      <SchoolAdminProfileContent />
    </DashboardLayout>
  );
}
