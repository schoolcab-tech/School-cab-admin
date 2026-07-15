import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useSchoolAdmins,
  useSuspendSchoolAdmin,
  useActivateSchoolAdmin,
  useDeleteSchoolAdmin,
} from "@/hooks/useSchoolAdmins";
import { useState } from "react";
import {
  Building2,
  CheckCircle,
  Loader2,
  Mail,
  MoreVertical,
  Phone,
  Plus,
  School,
  Search,
  User,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { SchoolAdminFormDialog } from "./components/SchoolAdminFormDialog";
import type { SchoolAdminWithSchool } from "@/services/schoolAdminService";

export default function SchoolAdminsPage() {
  return (
    <DashboardLayout>
      <SchoolAdminsContent />
    </DashboardLayout>
  );
}

function SchoolAdminsContent() {
  const { data: admins, isLoading, error, refetch } = useSchoolAdmins();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const suspendMutation = useSuspendSchoolAdmin();
  const activateMutation = useActivateSchoolAdmin();
  const deleteMutation = useDeleteSchoolAdmin();

  const handleSuspend = async (id: number) => {
    try {
      await suspendMutation.mutateAsync(id);
      toast.success("School admin suspended");
      refetch();
    } catch (e: any) {
      toast.error("Failed to suspend: " + e.message);
    }
  };

  const handleActivate = async (id: number) => {
    try {
      await activateMutation.mutateAsync(id);
      toast.success("School admin activated");
      refetch();
    } catch (e: any) {
      toast.error("Failed to activate: " + e.message);
    }
  };

  const handleDelete = async (admin: SchoolAdminWithSchool) => {
    if (
      !window.confirm(
        `Delete school admin for "${admin.school_name}"? This will also delete their user account.`
      )
    ) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(admin.school_admin_id);
      toast.success("School admin deleted");
      refetch();
    } catch (e: any) {
      toast.error("Failed to delete: " + e.message);
    }
  };

  const filtered = (admins || []).filter((a) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      a.school_name?.toLowerCase().includes(s) ||
      a.contact_person.toLowerCase().includes(s) ||
      a.email.toLowerCase().includes(s) ||
      a.phone.toLowerCase().includes(s)
    );
  });

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-destructive">
          Error loading school admins: {error.message}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <School className="h-7 w-7" />
            School Admins
          </h1>
          <p className="text-muted-foreground">
            Manage school-bound sub-admin accounts. Each can only see drivers serving their school.
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add School Admin
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by school, contact, email, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline">{filtered.length} of {admins?.length || 0}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && !admins ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.school_admin_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{a.school_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-3 w-3 text-muted-foreground" />
                        {a.contact_person}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {a.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {a.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      {a.is_active ? (
                        <Badge variant="outline" className="text-green-600 border-green-300">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Suspended
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(a.created_at), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {a.is_active ? (
                            <DropdownMenuItem onClick={() => handleSuspend(a.school_admin_id)}>
                              <XCircle className="mr-2 h-4 w-4" />
                              Suspend
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleActivate(a.school_admin_id)}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Activate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(a)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No school admins found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <SchoolAdminFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onCreated={() => refetch()}
      />
    </div>
  );
}
