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
  useActivateModerator,
  useDeleteModerator,
  useModerators,
  useSuspendModerator,
} from "@/hooks/useModerators";
import { format } from "date-fns";
import {
  CheckCircle,
  Loader2,
  Mail,
  MoreVertical,
  Phone,
  Plus,
  Search,
  User,
  UserCog,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ModeratorFormDialog } from "./components/ModeratorFormDialog";
import { ModeratorAssignSchoolsDialog } from "./components/ModeratorAssignSchoolsDialog";
import type { ModeratorWithSchoolCount } from "@/services/moderatorService";

export default function ModeratorsPage() {
  return (
    <DashboardLayout>
      <ModeratorsContent />
    </DashboardLayout>
  );
}

function ModeratorsContent() {
  const { data: moderators, isLoading, error, refetch } = useModerators();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<ModeratorWithSchoolCount | null>(null);

  const suspendMutation = useSuspendModerator();
  const activateMutation = useActivateModerator();
  const deleteMutation = useDeleteModerator();

  const filtered = (moderators || []).filter((m) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      m.contact_person.toLowerCase().includes(s) ||
      m.email.toLowerCase().includes(s) ||
      m.phone.toLowerCase().includes(s)
    );
  });

  const handleSuspend = async (id: number) => {
    try {
      await suspendMutation.mutateAsync(id);
      toast.success("Moderator suspended");
      refetch();
    } catch (e: any) {
      toast.error("Failed to suspend: " + e.message);
    }
  };

  const handleActivate = async (id: number) => {
    try {
      await activateMutation.mutateAsync(id);
      toast.success("Moderator activated");
      refetch();
    } catch (e: any) {
      toast.error("Failed to activate: " + e.message);
    }
  };

  const handleDelete = async (m: ModeratorWithSchoolCount) => {
    if (
      !window.confirm(
        `Delete moderator "${m.contact_person}"? Their schools will be unassigned and their login removed.`
      )
    ) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(m.moderator_id);
      toast.success("Moderator deleted");
      refetch();
    } catch (e: any) {
      toast.error("Failed to delete: " + e.message);
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-destructive">
          Error loading moderators: {error.message}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <UserCog className="h-7 w-7" />
            Moderators
          </h1>
          <p className="text-muted-foreground">
            School providers who manage multiple schools without full platform admin access.
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Moderator
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && !moderators ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Schools</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow key={m.moderator_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {m.contact_person}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {m.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {m.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{m.school_count ?? 0}</Badge>
                    </TableCell>
                    <TableCell>
                      {m.is_active ? (
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
                      {format(new Date(m.created_at), "dd MMM yyyy")}
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
                          <DropdownMenuItem onClick={() => setAssignTarget(m)}>
                            Assign schools
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {m.is_active ? (
                            <DropdownMenuItem onClick={() => handleSuspend(m.moderator_id)}>
                              Suspend
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleActivate(m.moderator_id)}>
                              Activate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(m)}
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
                      No moderators found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ModeratorFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} onCreated={() => refetch()} />
      <ModeratorAssignSchoolsDialog
        moderator={assignTarget}
        open={!!assignTarget}
        onOpenChange={(open) => !open && setAssignTarget(null)}
        onUpdated={() => refetch()}
      />
    </div>
  );
}
