import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDriverServiceAreas } from "@/hooks/useDriverServiceAreas";
import { Car, Loader2, MapPin, Search, Users } from "lucide-react";
import { useState } from "react";

export default function RoutesPage() {
  const { data: serviceAreas = [], isLoading, error } = useDriverServiceAreas();
  const [searchTerm, setSearchTerm] = useState("");

  // Group service areas by pincode
  const groupedAreas = serviceAreas.reduce((acc, area) => {
    const pincode = area.pincode;
    if (!acc[pincode]) {
      acc[pincode] = [];
    }
    acc[pincode].push(area);
    return acc;
  }, {} as Record<string, typeof serviceAreas>);

  const filteredPincodes = Object.keys(groupedAreas).filter((pincode) =>
    pincode.includes(searchTerm)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Routes & Areas</h1>
          <p className="text-muted-foreground">
            Manage service areas, routes, and geographic coverage.
          </p>
        </div>

        {/* Service Areas Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Total Service Areas
                </CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : Object.keys(groupedAreas).length}
              </div>
              <p className="text-xs text-muted-foreground">Pin codes served</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Active Drivers
                </CardTitle>
                <Car className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : serviceAreas.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Driver-area assignments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Coverage</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">85%</div>
              <p className="text-xs text-muted-foreground">Area coverage</p>
            </CardContent>
          </Card>
        </div>

        {/* Service Areas Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Service Areas</CardTitle>
              {/* <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Service Area
              </Button> */}
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by pincode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                Error loading service areas: {error.message || "Unknown error occurred"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pincode</TableHead>
                    <TableHead>Drivers Assigned</TableHead>
                    <TableHead>Vehicle Types</TableHead>
                    <TableHead>Total Capacity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPincodes.map((pincode) => {
                    const drivers = groupedAreas[pincode];
                    const totalCapacity = drivers.length * 4; // Average capacity estimate
                    const vehicleTypes = [
                      ...new Set(
                        drivers
                          .map((d) => d.drivers?.vehicle_type)
                          .filter(Boolean)
                      ),
                    ];

                    return (
                      <TableRow key={pincode}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{pincode}</span>
                          </div>
                        </TableCell>
                        <TableCell>{drivers.length} drivers</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {vehicleTypes.map((type, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs"
                              >
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{totalCapacity} seats</TableCell>
                        <TableCell>
                          <Badge variant="default">Active</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {!isLoading && filteredPincodes.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No service areas found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
