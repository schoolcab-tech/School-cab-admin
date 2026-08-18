import { DashboardLayout } from "@/components/DashboardLayout";
import { DriversTable } from "@/components/tables/DriversTable";
import { ExportButton } from "@/components/ExportButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useDrivers } from "@/hooks/useDrivers";
import { supabase } from "@/integrations/supabase/client";
import {
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Filter,
  GraduationCap,
  Plus,
  Search,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function DriversPage() {
  return (
    <DashboardLayout>
      <DriversContent />
    </DashboardLayout>
  );
}

function DriversContent() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<{
    status: "" | "active" | "suspended";
    pincode: string;
    schoolId: string;
  }>({
    status: "",
    pincode: "",
    schoolId: searchParams.get("schoolId") || "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [schoolPickerOpen, setSchoolPickerOpen] = useState(false);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [pincodes, setPincodes] = useState<string[]>([]);

  // Fetch schools & pincodes once on mount
  useEffect(() => {
    const fetchFilterData = async () => {
      // Fetch schools
      const { data: schoolData, error: schoolError } = await supabase
        .from("schools")
        .select("school_id, name")
        .order("name");

      if (!schoolError && schoolData) {
        const mapped = schoolData.map((s) => ({
          id: s.school_id.toString(),
          name: s.name,
        }));
        setSchools(mapped);
      }

      // Fetch distinct pincodes from driver_service_areas
      const { data: pincodeData, error: pincodeError } = await supabase
        .from("driver_service_areas")
        .select("pincode");

      if (!pincodeError && pincodeData) {
        const unique = Array.from(
          new Set(pincodeData.map((p) => p.pincode))
        ).sort();
        setPincodes(unique);
      }
    };

    fetchFilterData();
  }, []);

  const handleAddDriver = () => {
    navigate("/drivers/new");
  };

  const handleViewDriver = (id: string) => {
    navigate(`/drivers/${id}`);
  };

  const handleEditDriver = (id: string) => {
    navigate(`/drivers/${id}/edit`);
  };

  const setSchoolId = (schoolId: string) => {
    setFilters((prev) => ({ ...prev, schoolId }));
    if (schoolId) {
      searchParams.set("schoolId", schoolId);
    } else {
      searchParams.delete("schoolId");
    }
    setSearchParams(searchParams, { replace: true });
  };

  const { data: exportDrivers = [] } = useDrivers({
    ...filters,
    search: searchTerm || undefined,
  });

  const selectedSchool = schools.find((s) => s.id === filters.schoolId);
  const schoolNameMap = useMemo(
    () => Object.fromEntries(schools.map((s) => [s.id, s.name])),
    [schools]
  );
  const schoolDriverStats = useMemo(() => {
    if (!filters.schoolId) return null;
    const verified = exportDrivers.filter((d) => d.is_verified).length;
    return {
      total: exportDrivers.length,
      verified,
      unverified: exportDrivers.length - verified,
    };
  }, [filters.schoolId, exportDrivers]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Drivers</h1>
          <p className="text-muted-foreground">
            {selectedSchool
              ? `Drivers serving ${selectedSchool.name}`
              : "Manage your drivers and their details. Filter by school to see all drivers for that school."}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportButton
            headers={[
              "Driver ID",
              "Name",
              "Phone",
              "Cab Number",
              "Vehicle Type",
              "Capacity",
              "Status",
              "Rating",
            ]}
            rows={exportDrivers.map((d) => [
              d.driver_id,
              d.name,
              d.phone || "",
              d.cab_number,
              d.vehicle_type,
              d.cab_capacity,
              d.is_verified ? "Verified" : "Unverified",
              d.avg_rating?.toFixed(1) || "",
            ])}
            filename={`drivers-${new Date().toISOString().split("T")[0]}`}
            disabled={exportDrivers.length === 0}
          />
          <Button variant="outline" onClick={() => navigate("/drivers/bulk-upload")} className="w-full md:w-auto">
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
          <Button onClick={handleAddDriver} className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Driver
          </Button>
        </div>
      </div>
      {/* <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        <div className="flex space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search drivers..."
              className="pl-10 w-full sm:w-[200px] md:w-[300px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {Object.values(filters).some(Boolean) && (
              <span className="ml-2 h-5 w-5 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                {Object.values(filters).filter(Boolean).length}
              </span>
            )}
          </Button>
        </div>
      </div> */}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="text-sm font-medium flex items-center gap-2 shrink-0">
              <GraduationCap className="h-4 w-4" />
              School
            </label>
            <Popover open={schoolPickerOpen} onOpenChange={setSchoolPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={schoolPickerOpen}
                  className="w-full sm:max-w-md justify-between font-normal"
                >
                  <span className="truncate">
                    {selectedSchool ? selectedSchool.name : "All schools"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search schools..." />
                  <CommandList>
                    <CommandEmpty>No school found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all-schools"
                        onSelect={() => {
                          setSchoolId("");
                          setSchoolPickerOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            !filters.schoolId ? "opacity-100" : "opacity-0"
                          )}
                        />
                        All schools
                      </CommandItem>
                      {schools.map((s) => (
                        <CommandItem
                          key={s.id}
                          value={`${s.name} ${s.id}`}
                          onSelect={() => {
                            setSchoolId(s.id);
                            setSchoolPickerOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              filters.schoolId === s.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {s.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {filters.schoolId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSchoolId("")}
                className="shrink-0"
              >
                <X className="h-4 w-4 mr-1" />
                Clear school
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {schoolDriverStats && selectedSchool && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Drivers at this school</h3>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{schoolDriverStats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Verified</h3>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{schoolDriverStats.verified}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Unverified</h3>
              <X className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{schoolDriverStats.unverified}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="all" className="space-y-4">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <TabsList>
            <TabsTrigger value="all">All Drivers</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="suspended">Suspended</TabsTrigger>
          </TabsList>

          <div className="flex space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search drivers..."
                className="pl-10 w-full sm:w-[200px] md:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {[filters.status, filters.pincode].filter(Boolean).length > 0 && (
                <span className="ml-2 h-5 w-5 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                  {[filters.status, filters.pincode].filter(Boolean).length}
                </span>
              )}
            </Button>
          </div>
        </div>

        {showFilters && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Filters</h3>
                <div className="flex items-center space-x-2">
                  {(filters.status || filters.pincode) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          status: "",
                          pincode: "",
                        }))
                      }
                      className="text-sm"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear filters
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Status
                  </label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={filters.status}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        status: e.target.value as "" | "active" | "suspended",
                      })
                    }
                  >
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Pincode
                  </label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={filters.pincode}
                    onChange={(e) =>
                      setFilters({ ...filters, pincode: e.target.value })
                    }
                  >
                    <option value="">All Pincodes</option>
                    {pincodes.map((pc) => (
                      <option key={pc} value={pc}>
                        {pc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <TabsContent value="all" className="space-y-4">
          <DriversTable
            onAddDriver={handleAddDriver}
            onViewDriver={handleViewDriver}
            onEditDriver={handleEditDriver}
            schoolNames={schoolNameMap}
            selectedSchoolName={selectedSchool?.name}
            filters={{
              ...(filters.status
                ? { status: filters.status as "active" | "suspended" }
                : {}),
              ...(filters.pincode ? { pincode: filters.pincode } : {}),
              ...(filters.schoolId ? { schoolId: filters.schoolId } : {}),
              search: searchTerm,
            }}
          />
        </TabsContent>
        <TabsContent value="active" className="space-y-4">
          <DriversTable
            onAddDriver={handleAddDriver}
            onViewDriver={handleViewDriver}
            onEditDriver={handleEditDriver}
            schoolNames={schoolNameMap}
            selectedSchoolName={selectedSchool?.name}
            filters={{
              ...(filters.pincode ? { pincode: filters.pincode } : {}),
              ...(filters.schoolId ? { schoolId: filters.schoolId } : {}),
              status: "active",
              search: searchTerm,
            }}
          />
        </TabsContent>
        <TabsContent value="suspended" className="space-y-4">
          <DriversTable
            onAddDriver={handleAddDriver}
            onViewDriver={handleViewDriver}
            onEditDriver={handleEditDriver}
            schoolNames={schoolNameMap}
            selectedSchoolName={selectedSchool?.name}
            filters={{
              ...(filters.pincode ? { pincode: filters.pincode } : {}),
              ...(filters.schoolId ? { schoolId: filters.schoolId } : {}),
              status: "suspended",
              search: searchTerm,
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
