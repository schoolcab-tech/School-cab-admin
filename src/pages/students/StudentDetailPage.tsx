import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { useDeleteStudent } from "@/hooks/useStudents";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Edit,
  Loader2,
  MapPin,
  Clock,
  Phone,
  GraduationCap,
  User,
  Building2,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Navigate, useNavigate, useParams } from "react-router-dom";

type StudentDetail = {
  student_id: number;
  user_id: string;
  name: string;
  school_id: number;
  class: string;
  section: string;
  phone_number: string | null;
  pickup_address: string;
  pickup_pincode: string;
  pickup_time: string;
  drop_address: string;
  drop_pincode: string;
  drop_time: string;
  created_at: string;
  school_name: string;
};

export interface StudentDetailContentProps {
  readOnly?: boolean;
  listPath?: string;
  /** When set, redirect if student belongs to another school. */
  linkedSchoolId?: number;
}

export function StudentDetailContent({
  readOnly = false,
  listPath = "/students",
  linkedSchoolId,
}: StudentDetailContentProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userRole, isMasterAdmin, isSchoolAdmin } = useAuth();
  const deleteStudentMutation = useDeleteStudent();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const canDeleteStudent =
    isMasterAdmin ||
    isSchoolAdmin ||
    (userRole as string | null) === "admin";

  useEffect(() => {
    const fetchStudent = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from("students")
          .select(
            `
            *,
            schools!inner(name)
          `
          )
          .eq("student_id", parseInt(id))
          .single();

        if (error) throw error;

        if (linkedSchoolId != null && data.school_id !== linkedSchoolId) {
          setUnauthorized(true);
          return;
        }

        setStudent({
          ...data,
          school_name: data.schools?.name || "Unknown",
        });
      } catch (error: any) {
        toast.error("Failed to load student: " + error.message);
        navigate(listPath);
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [id, navigate, listPath, linkedSchoolId]);

  if (unauthorized) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!student) {
    return <div>Student not found</div>;
  }

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete ${student.name}? This will also remove their bookings and related records. This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await deleteStudentMutation.mutateAsync({
        studentId: student.student_id,
        adminUserId: user?.id,
        adminRole: userRole || undefined,
      });
      toast.success("Student deleted successfully");
      navigate(listPath);
    } catch (error: any) {
      toast.error("Failed to delete student: " + (error?.message || "Unknown error"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(listPath)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <User className="h-8 w-8" />
              {student.name}
            </h1>
            <p className="text-muted-foreground">Student Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canDeleteStudent && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteStudentMutation.isPending}
            >
              {deleteStudentMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete Student
            </Button>
          )}
          {!readOnly && (
            <Button onClick={() => navigate(`${listPath}/${id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Student
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Student ID:</span>
              <span className="text-sm font-medium">{student.student_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Name:</span>
              <span className="text-sm font-medium">{student.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Class:</span>
              <Badge variant="outline">
                {student.class} - {student.section}
              </Badge>
            </div>
            {student.phone_number && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Phone:
                </span>
                <span className="text-sm font-medium">{student.phone_number}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              School Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">School:</span>
              <span className="text-sm font-medium">{student.school_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">School ID:</span>
              <span className="text-sm font-medium">{student.school_id}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Pickup Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Address:</span>
              <p className="text-sm font-medium mt-1">{student.pickup_address}</p>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Pincode:</span>
              <Badge variant="outline">{student.pickup_pincode}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Time:
              </span>
              <span className="text-sm font-medium">{student.pickup_time}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Drop Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Address:</span>
              <p className="text-sm font-medium mt-1">{student.drop_address}</p>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Pincode:</span>
              <Badge variant="outline">{student.drop_pincode}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Time:
              </span>
              <span className="text-sm font-medium">{student.drop_time}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function StudentDetailPage() {
  return (
    <DashboardLayout>
      <StudentDetailContent />
    </DashboardLayout>
  );
}

export function SchoolAdminStudentDetailPage() {
  const { linkedSchoolId } = useAuth();
  return (
    <DashboardLayout>
      <StudentDetailContent
        readOnly
        listPath="/school-admin/students"
        linkedSchoolId={linkedSchoolId ?? undefined}
      />
    </DashboardLayout>
  );
}
