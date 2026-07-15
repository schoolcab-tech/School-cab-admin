import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useActivatePlatformAdmin,
  useBackfillPlatformAdmins,
  useDeletePlatformAdmin,
  usePlatformAdmins,
  useSuspendPlatformAdmin,
} from "@/hooks/usePlatformAdmins";
import { useAuth } from "@/contexts/auth-context";
import { format } from "date-fns";
import {
  CheckCircle,
  Loader2,
  Mail,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Shield,
  User,
  UserCog,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PlatformAdminFormDialog } from "./components/PlatformAdminFormDialog";
import type { PlatformAdmin } from "@/services/platformAdminService";

export default function PlatformAdminsPage() {
  return (
    <DashboardLayout>
      <PlatformAdminsContent />
    </DashboardLayout>
  );
}

function PlatformAdminsContent() {
  const { user } = useAuth();
  const { data: admins, isLoading, error, refetch } = usePlatformAdmins();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const suspendMutation = useSuspendPlatformAdmin();
  const activateMutation = useActivatePlatformAdmin();
  const deleteMutation = useDeletePlatformAdmin();
  const backfillMutation = useBackfillPlatformAdmins();

  const handleBackfill = async () => {
    try {
      const result = await backfillMutation.mutateAsync();
      if (result.inserted_count > 0) {
        toast.success(
          `Imported ${result.inserted_count} existing admin account(s). Total: ${result.total_platform_admins}.`
        );
      } else {
        toast.info("No new admin accounts to import — all existing admins are already listed.");
      }
      refetch();
    } catch (e: any) {
      toast.error("Failed to import existing admins: " + e.message);
    }
  };

  const handleSuspend = async (id: number) => {
    try {
      await suspendMutation.mutateAsync(id);
      toast.success("Platform admin suspended");
      refetch();
    } catch (e: any) {
      toast.error("Failed to suspend: " + e.message);
    }
  };

  const handleActivate = async (id: number) => {
    try {
      await activateMutation.mutateAsync(id);
      toast.success("Platform admin activated");
      refetch();
    } catch (e: any) {
      toast.error("Failed to activate: " + e.message);
    }
  };

  const handleDelete = async (admin: PlatformAdmin) => {
    if (
      !window.confirm(
        `Delete platform admin "${admin.contact_person}" (${admin.email})? This will also delete their user account.`
      )
    ) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(admin.platform_admin_id);
      toast.success("Platform admin deleted");
      refetch();
    } catch (e: any) {
      toast.error("Failed to delete: " + e.message);
    }
  };

  const filtered = (admins || []).filter((a) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      a.contact_person.toLowerCase().includes(s) ||
      a.email.toLowerCase().includes(s) ||
      a.phone.toLowerCase().includes(s) ||
      a.role.toLowerCase().includes(s)
    );
  });

  const roleBadge = (role: string) => {
    if (role === "master_admin") {
      return (
        <Badge className="bg-purple-600 hover:bg-purple-700">
          <Shield className="h-3 w-3 mr-1" />
          Master Admin
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <UserCog className="h-3 w-3 mr-1" />
        Admin
      </Badge>
    );
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-destructive">
          Error loading platform admins: {error.message}
          <p className="text-sm text-muted-foreground mt-2">
            If this is a new feature, apply the migration{" "}
            <code className="text-xs">migrations/20260715_platform_admins.sql</code> in Supabase
            first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-7 w-7" />
            Platform Admins
          </h1>
          <p className="text-muted-foreground">
            Create and manage admin and master admin accounts for your team — no Supabase SQL
            required.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleBackfill}
            disabled={backfillMutation.isPending}
          >
            {backfillMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Import Existing Admins
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Platform Admin
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline">
              {filtered.length} of {admins?.length || 0}
            </Badge>
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
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => {
                  const isSelf = a.user_id === user?.id;
                  return (
                    <TableRow key={a.platform_admin_id}>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{a.contact_person}</span>
                          {isSelf && (
                            <Badge variant="outline" className="text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{roleBadge(a.role)}</TableCell>
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
                            {!isSelf && (
                              <>
                                {a.is_active ? (
                                  <DropdownMenuItem
                                    onClick={() => handleSuspend(a.platform_admin_id)}
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Suspend
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => handleActivate(a.platform_admin_id)}
                                  >
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
                              </>
                            )}
                            {isSelf && (
                              <DropdownMenuItem disabled>
                                Cannot modify your own account
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No platform admins found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PlatformAdminFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onCreated={() => refetch()}
      />
    </div>
  );
}
