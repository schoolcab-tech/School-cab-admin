import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { DashboardLayout } from '@/components/DashboardLayout';
import { SchoolForm } from '@/components/forms/SchoolForm';
import { useSchool, useUpdateSchool } from '@/hooks/useSchools';
import { School, UpdateSchoolInput } from '@/types/school';
import { Loader2 } from 'lucide-react';

export default function EditSchool() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: school, isLoading, error } = useSchool(id || '');
  const updateSchool = useUpdateSchool();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load school details',
        variant: 'destructive',
      });
      navigate('/schools');
    }
  }, [error, navigate, toast]);

  const handleSubmit = async (data: UpdateSchoolInput) => {
    if (!id) return;
    
    try {
      setIsSubmitting(true);
      await updateSchool.mutateAsync({ id, data });
      
      toast({
        title: 'Success',
        description: 'School updated successfully',
        variant: 'default',
      });
      
      // Redirect to school detail page after a short delay
      setTimeout(() => {
        navigate(`/schools/${id}`);
      }, 1000);
    } catch (error) {
      console.error('Error updating school:', error);
      toast({
        title: 'Error',
        description: 'Failed to update school. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !school) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit School</h1>
          <p className="text-muted-foreground">
            Update the details of {school.name}.
          </p>
        </div>
        
        <div className="rounded-lg border bg-card p-6">
          <SchoolForm 
            initialData={school}
            onSubmit={handleSubmit} 
            isLoading={isSubmitting}
            isEdit={true}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
