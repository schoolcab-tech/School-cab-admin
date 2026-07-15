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
import { useFleetOwners, useSuspendFleetOwner, useActivateFleetOwner, useDeleteFleetOwner } from "@/hooks/useFleetOwners";
import { useState } from "react";
import { Building2, MoreVertical, Plus, Search, User, Phone, Mail, Calendar, CheckCircle, XCircle } from "lucide-react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FleetOwnerFormDialog } from "./components/FleetOwnerFormDialog";
import { FleetOwnerDetailDialog } from "./components/FleetOwnerDetailDialog";
import { FleetOwnerEditDialog } from "./components/FleetOwnerEditDialog";
import { format } from "date-fns";
import type { FleetOwnerWithStats } from "@/services/fleetOwnerService";

export default function FleetOwnersPage() {
  return (
    <DashboardLayout>
      <FleetOwnersContent />
    </DashboardLayout>
  );
}

function FleetOwnersContent() {
  const { data: fleetOwners, isLoading, error } = useFleetOwners();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<FleetOwnerWithStats | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const suspendMutation = useSuspendFleetOwner();
  const activateMutation = useActivateFleetOwner();
  const deleteMutation = useDeleteFleetOwner();

  const handleSuspend = async (ownerId: number) => {
    try {
      await suspendMutation.mutateAsync(ownerId);
      toast.success("Fleet owner suspended successfully");
    } catch (error: any) {
      toast.error("Failed to suspend fleet owner: " + error.message);
    }
  };

  const handleActivate = async (ownerId: number) => {
    try {
      await activateMutation.mutateAsync(ownerId);
      toast.success("Fleet owner activated successfully");
    } catch (error: any) {
      toast.error("Failed to activate fleet owner: " + error.message);
    }
  };

  const handleDelete = async (ownerId: number, ownerData: any) => {
    if (!window.confirm("Are you sure you want to delete this fleet owner? This will also delete their user account.")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ ownerId, ownerData });
      toast.success("Fleet owner deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete fleet owner: " + error.message);
    }
  };

  const handleViewDetails = (owner: FleetOwnerWithStats) => {
    setSelectedOwner(owner);
    setIsDetailOpen(true);
  };

  const handleEdit = (owner: FleetOwnerWithStats) => {
    setSelectedOwner(owner);
    setIsEditOpen(true);
  };

  const filteredOwners = fleetOwners?.filter((owner) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      owner.company_name.toLowerCase().includes(search) ||
      owner.contact_person.toLowerCase().includes(search) ||
      owner.email.toLowerCase().includes(search) ||
      owner.phone.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fleet Owners</h1>
          <p className="text-muted-foreground">
            Manage sub-admin fleet owners and their cab assignments
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Fleet Owner
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by company, contact, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              Error loading fleet owners: {(error as Error).message}
            </div>
          ) : filteredOwners && filteredOwners.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Total Cabs</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOwners.map((owner) => (
                    <TableRow key={owner.owner_id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {owner.company_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {owner.contact_person}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {owner.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {owner.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {owner.active_drivers_count || 0} cabs
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {owner.is_active ? (
                          <Badge className="bg-green-500">
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
                      <TableCell>
                        {owner.verified_at ? (
                          <div className="flex items-center gap-1 text-sm text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            {format(new Date(owner.verified_at), "MMM dd, yyyy")}
                          </div>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleViewDetails(owner)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(owner)}>
                              Edit
                            </DropdownMenuItem>
                            {owner.is_active ? (
                              <DropdownMenuItem
                                onClick={() => handleSuspend(owner.owner_id)}
                              >
                                Suspend
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleActivate(owner.owner_id)}
                              >
                                Activate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(owner.owner_id, owner)}
                              className="text-destructive"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm ? "No fleet owners found matching your search" : "No fleet owners yet"}
            </div>
          )}
        </CardContent>
      </Card>

      <FleetOwnerFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />

      <FleetOwnerDetailDialog
        owner={selectedOwner}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />

      <FleetOwnerEditDialog
        owner={selectedOwner}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />
    </div>
  );
}
