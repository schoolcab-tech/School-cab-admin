import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SchoolForm } from "@/components/forms/SchoolForm";
import { useCreateSchool } from "@/hooks/useSchools";
import { CreateSchoolInput } from "@/types/school";

export default function ModeratorAddSchoolPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createSchool = useCreateSchool();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: CreateSchoolInput) => {
    try {
      setIsSubmitting(true);
      await createSchool.mutateAsync(data);
      toast({
        title: "Success",
        description: "School created successfully",
        variant: "default",
      });
      setTimeout(() => navigate("/moderator/schools"), 1000);
    } catch (error) {
      console.error("Error creating school:", error);
      toast({
        title: "Error",
        description: "Failed to create school. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add New School</h1>
          <p className="text-muted-foreground">
            This school will be linked to your moderator account automatically.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <SchoolForm onSubmit={handleSubmit} isLoading={isSubmitting} />
        </div>
      </div>
    </DashboardLayout>
  );
}
