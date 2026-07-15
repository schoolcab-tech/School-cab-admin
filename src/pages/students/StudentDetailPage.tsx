import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";

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

export default function StudentDetailPage() {
  return (
    <DashboardLayout>
      <StudentDetailContent />
    </DashboardLayout>
  );
}

function StudentDetailContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentDetail | null>(null);

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

        setStudent({
          ...data,
          school_name: data.schools?.name || "Unknown",
        });
      } catch (error: any) {
        toast.error("Failed to load student: " + error.message);
        navigate("/students");
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [id, navigate]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/students")}
          >
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
        <Button onClick={() => navigate(`/students/${id}/edit`)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Student
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
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

        {/* School Information */}
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

        {/* Pickup Details */}
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

        {/* Drop Details */}
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
