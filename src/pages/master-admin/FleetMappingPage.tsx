import { DashboardLayout } from "@/components/DashboardLayout";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUnassignedDrivers, useAllDriverMappings, useAssignDriver, useUnassignDriver } from "@/hooks/useFleetMappings";
import { useFleetOwners } from "@/hooks/useFleetOwners";
import { useState } from "react";
import { Users, Car, ArrowRight, X, Loader2, History } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export default function FleetMappingPage() {
  return (
    <DashboardLayout>
      <FleetMappingContent />
    </DashboardLayout>
  );
}

function FleetMappingContent() {
  const { data: unassignedDrivers, isLoading: loadingUnassigned } = useUnassignedDrivers();
  const { data: allMappings, isLoading: loadingMappings } = useAllDriverMappings();
  const { data: fleetOwners } = useFleetOwners();

  const assignMutation = useAssignDriver();
  const unassignMutation = useUnassignDriver();

  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [selectedOwner, setSelectedOwner] = useState<number | null>(null);
  const [searchUnassigned, setSearchUnassigned] = useState("");
  const [searchAssigned, setSearchAssigned] = useState("");

  const handleAssign = async () => {
    if (!selectedDriver || !selectedOwner) {
      toast.error("Please select both a driver and a fleet owner");
      return;
    }

    try {
      await assignMutation.mutateAsync({
        driverId: selectedDriver,
        ownerId: selectedOwner,
      });
      toast.success("Driver assigned successfully");
      setSelectedDriver(null);
      setSelectedOwner(null);
    } catch (error: any) {
      toast.error("Failed to assign driver: " + error.message);
    }
  };

  const handleUnassign = async (mappingId: number, driverId: number, ownerId: number) => {
    if (!window.confirm("Are you sure you want to unassign this driver?")) {
      return;
    }

    try {
      await unassignMutation.mutateAsync({
        mappingId,
        driverId,
        ownerId,
      });
      toast.success("Driver unassigned successfully");
    } catch (error: any) {
      toast.error("Failed to unassign driver: " + error.message);
    }
  };

  const filteredUnassigned = unassignedDrivers?.filter((driver) => {
    if (!searchUnassigned) return true;
    const search = searchUnassigned.toLowerCase();
    return (
      driver.name?.toLowerCase().includes(search) ||
      driver.cab_number.toLowerCase().includes(search) ||
      driver.phone?.toLowerCase().includes(search)
    );
  });

  const filteredAssigned = allMappings?.filter((driver) => {
    if (!searchAssigned) return true;
    const search = searchAssigned.toLowerCase();
    return (
      driver.name?.toLowerCase().includes(search) ||
      driver.cab_number.toLowerCase().includes(search) ||
      driver.phone?.toLowerCase().includes(search) ||
      (driver as any).owner_info?.company_name?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fleet Mapping</h1>
        <p className="text-muted-foreground">
          Assign drivers to fleet owners and manage driver-owner relationships
        </p>
      </div>

      {/* Assignment Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Assign Driver to Fleet Owner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                Select Driver
              </label>
              <Select
                value={selectedDriver?.toString() || ""}
                onValueChange={(value) => setSelectedDriver(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a driver..." />
                </SelectTrigger>
                <SelectContent>
                  {unassignedDrivers?.map((driver) => (
                    <SelectItem key={driver.driver_id} value={driver.driver_id.toString()}>
                      {driver.name} - {driver.cab_number} ({driver.vehicle_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                Select Fleet Owner
              </label>
              <Select
                value={selectedOwner?.toString() || ""}
                onValueChange={(value) => setSelectedOwner(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a fleet owner..." />
                </SelectTrigger>
                <SelectContent>
                  {fleetOwners?.map((owner) => (
                    <SelectItem key={owner.owner_id} value={owner.owner_id.toString()}>
                      {owner.company_name} ({owner.contact_person})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleAssign}
              disabled={!selectedDriver || !selectedOwner || assignMutation.isPending}
            >
              {assignMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Assign Driver
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unassigned Drivers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Unassigned Drivers ({unassignedDrivers?.length || 0})
            </CardTitle>
            <Input
              placeholder="Search unassigned drivers..."
              value={searchUnassigned}
              onChange={(e) => setSearchUnassigned(e.target.value)}
            />
          </CardHeader>
          <CardContent>
            {loadingUnassigned ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUnassigned && filteredUnassigned.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredUnassigned.map((driver) => (
                  <div
                    key={driver.driver_id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedDriver === driver.driver_id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedDriver(driver.driver_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{driver.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {driver.cab_number} - {driver.vehicle_type}
                        </p>
                      </div>
                      <Badge variant="outline">
                        Capacity: {driver.cab_capacity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                {searchUnassigned ? "No drivers found" : "All drivers are assigned"}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Assigned Drivers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Assigned Drivers ({allMappings?.length || 0})
            </CardTitle>
            <Input
              placeholder="Search assigned drivers..."
              value={searchAssigned}
              onChange={(e) => setSearchAssigned(e.target.value)}
            />
          </CardHeader>
          <CardContent>
            {loadingMappings ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredAssigned && filteredAssigned.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredAssigned.map((driver) => (
                  <div
                    key={driver.driver_id}
                    className="p-3 border rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{driver.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {driver.cab_number} - {driver.vehicle_type}
                        </p>
                        <Badge variant="secondary" className="mt-1">
                          {(driver as any).owner_info?.company_name}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleUnassign(
                            driver.mapping!.mapping_id,
                            driver.driver_id,
                            driver.mapping!.owner_id
                          )
                        }
                        disabled={unassignMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                {searchAssigned ? "No drivers found" : "No assigned drivers yet"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full Mapping Table */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Fleet Mapping Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingMappings ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : allMappings && allMappings.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver Name</TableHead>
                    <TableHead>Cab Number</TableHead>
                    <TableHead>Vehicle Type</TableHead>
                    <TableHead>Fleet Owner</TableHead>
                    <TableHead>Assigned Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allMappings.map((driver) => (
                    <TableRow key={driver.driver_id}>
                      <TableCell className="font-medium">{driver.name}</TableCell>
                      <TableCell>{driver.cab_number}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{driver.vehicle_type}</Badge>
                      </TableCell>
                      <TableCell>
                        {(driver as any).owner_info?.company_name}
                      </TableCell>
                      <TableCell>
                        {driver.mapping?.assigned_at &&
                          new Date(driver.mapping.assigned_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleUnassign(
                              driver.mapping!.mapping_id,
                              driver.driver_id,
                              driver.mapping!.owner_id
                            )
                          }
                          disabled={unassignMutation.isPending}
                        >
                          Unassign
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No driver assignments yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
