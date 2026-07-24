import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/auth-context";
import {
  useDeleteDriver,
  useDrivers,
  useUpdateDriverStatus,
} from "@/hooks/useDrivers";
import { Check, Edit, Eye, Loader2, Star, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface DriversTableProps {
  onAddDriver?: () => void;
  onViewDriver?: (id: string) => void;
  onEditDriver?: (id: string) => void;
  filters?: {
    status?: "active" | "suspended";
    search?: string;
    pincode?: string;
    schoolId?: string;
  };
}

export function DriversTable({
  onAddDriver,
  onViewDriver,
  onEditDriver,
  filters = {},
}: DriversTableProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userRole, isMasterAdmin } = useAuth();
  const canDeleteDriver =
    isMasterAdmin || (userRole as string | null) === "admin";
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { mutate: updateStatus, isPending: isUpdatingStatus } =
    useUpdateDriverStatus();
  const deleteDriver = useDeleteDriver();

  const { data, isLoading, error, refetch } = useDrivers({
    ...filters,
    search: searchTerm || filters?.search,
  });

  const handleStatusChange = (driverId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    updateStatus(
      { id: driverId, is_verified: newStatus },
      {
        onSuccess: () => {
          toast({
            title: "Success",
            description: `Driver ${
              newStatus ? "verified" : "unverified"
            } successfully`,
          });
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: error.message || "Failed to update driver status",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleView = (id: string) => {
    if (onViewDriver) {
      onViewDriver(id);
    } else {
      navigate(`/drivers/${id}`);
    }
  };

  const handleEdit = (id: string) => {
    if (onEditDriver) {
      onEditDriver(id);
    } else {
      navigate(`/drivers/${id}/edit`);
    }
  };

  const handleDelete = async (id: string, name?: string | null) => {
    if (
      !window.confirm(
        `Are you sure you want to delete ${name || "this driver"}? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteDriver.mutateAsync(id);
      toast({
        title: "Success",
        description: "Driver deleted successfully",
      });
      await refetch();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete driver",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading && !data) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-destructive">
            Error loading drivers: {error.message || "Unknown error occurred"}
          </div>
        </CardContent>
      </Card>
    );
  }

  const drivers = data || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-2xl font-bold">
            Drivers Directory
          </CardTitle>
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            {/* <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search drivers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div> */}
            {/* <Button onClick={onAddDriver} className="whitespace-nowrap">
              <Plus className="h-4 w-4 mr-2" />
              Add Driver
            </Button> */}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Driver Details</TableHead>
              <TableHead className="min-w-[150px]">Vehicle Info</TableHead>
              <TableHead className="w-[120px]">Rating</TableHead>
              <TableHead className="w-[120px]">Service Areas</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[150px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.map((driver) => (
              <TableRow key={driver.driver_id} className="hover:bg-muted/50">
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                      {driver.name?.charAt(0) || "D"}
                    </div>
                    <div>
                      <div className="font-medium">{driver.name || "N/A"}</div>
                      <div className="text-muted-foreground text-sm">
                        {driver.phone || "N/A"}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        License: {driver.license_number || "N/A"}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="font-medium">
                      {driver.cab_number || "N/A"}
                    </div>
                    <div className="text-muted-foreground">
                      {driver.vehicle_type || "N/A"}
                    </div>
                    <div className="text-muted-foreground">
                      Capacity: {driver.cab_capacity || 0}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                    <span>{driver.avg_rating?.toFixed(1) || "N/A"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {driver.service_areas?.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-w-[120px]">
                      {driver.service_areas.slice(0, 2).map((area) => (
                        <Badge
                          key={area.pincode}
                          variant="outline"
                          className="text-xs"
                        >
                          {area.pincode}
                        </Badge>
                      ))}
                      {driver.service_areas.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{driver.service_areas.length - 2}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">None</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Badge
                      variant={driver.is_verified ? "default" : "secondary"}
                      className={`${
                        driver.is_verified
                          ? "bg-green-100 text-green-800 hover:bg-green-100"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                      }`}
                    >
                      {driver.is_verified ? "Verified" : "Unverified"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 h-6 w-6 p-0"
                      onClick={() =>
                        handleStatusChange(
                          driver.driver_id.toString(),
                          driver.is_verified || false
                        )
                      }
                      disabled={isUpdatingStatus}
                    >
                      {isUpdatingStatus ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : driver.is_verified ? (
                        <X className="h-3 w-3 text-destructive" />
                      ) : (
                        <Check className="h-3 w-3 text-green-600" />
                      )}
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleView(driver.driver_id.toString())}
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(driver.driver_id.toString())}
                      title="Edit driver"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {canDeleteDriver && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() =>
                          handleDelete(
                            driver.driver_id.toString(),
                            driver.name
                          )
                        }
                        disabled={deletingId === driver.driver_id.toString()}
                        title="Delete driver"
                      >
                        {deletingId === driver.driver_id.toString() ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {drivers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "No drivers match your search" : "No drivers found"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
