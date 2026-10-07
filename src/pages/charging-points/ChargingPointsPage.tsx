import { DashboardLayout } from "@/components/DashboardLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useChargingPoints,
  useDeleteChargingPoint,
  useSaveChargingPoint,
  useSyncLocationCoverage,
  useToggleChargingPoint,
} from "@/hooks/useChargingPoints";
import {
  chargingPointToForm,
  emptyChargingPointForm,
  generatedPhrases,
  sectorsFrom,
  shortAddressFrom,
  spokenNameFrom,
  syncLocationCoverage,
  type ChargingPoint,
  type ChargingPointForm,
} from "@/services/chargingPointService";
import { Loader2, MapPin, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type LocationGroup = {
  name: string;
  chargers: ChargingPoint[];
};

function mergePhrases(current: string[], incoming: string[]) {
  const seen = new Set(current.map((value) => value.toLowerCase()));
  const next = [...current];
  for (const value of incoming) {
    const cleaned = value.replace(/\s+/g, " ").trim();
    if (cleaned.length < 2 || seen.has(cleaned.toLowerCase())) continue;
    seen.add(cleaned.toLowerCase());
    next.push(cleaned);
  }
  return next;
}

function splitPhrases(raw: string) {
  return raw
    .split(/[\n,]/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter((part) => part.length > 1);
}

function TagField({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  const addText = (raw: string) => {
    const parts = splitPhrases(raw);
    if (!parts.length) return;
    onChange(mergePhrases(values, parts));
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addText(draft);
            }
          }}
          onPaste={(event) => {
            const text = event.clipboardData.getData("text");
            if (!/[\n,]/.test(text)) return;
            event.preventDefault();
            addText(text);
          }}
        />
        <Button type="button" variant="secondary" onClick={() => addText(draft)}>
          Add
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <Badge key={value} variant="secondary" className="gap-1 pr-1">
              {value}
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-background"
                aria-label={`Remove ${value}`}
                onClick={() => onChange(values.filter((item) => item !== value))}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function ChargerDialog({
  open,
  point,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  point: ChargingPoint | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const saveMutation = useSaveChargingPoint();
  const [form, setForm] = useState<ChargingPointForm>(emptyChargingPointForm());

  useEffect(() => {
    if (!open) return;
    setForm(point ? chargingPointToForm(point) : emptyChargingPointForm());
  }, [open, point]);

  const set = <K extends keyof ChargingPointForm>(key: K, value: ChargingPointForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const addGeneratedPhrases = () => {
    const spoken = form.spoken_name.trim() || spokenNameFrom(form.name);
    const address = form.address.trim();
    const shortAddress = form.short_address.trim() || shortAddressFrom(address);
    set(
      "site_phrases",
      mergePhrases(
        form.site_phrases,
        generatedPhrases({
          spoken,
          shortAddress,
          address,
          city: form.city.trim(),
          state: form.state.trim(),
          sectors: sectorsFrom(form.name, spoken, address),
        }),
      ),
    );
  };

  const onSubmit = async () => {
    try {
      await saveMutation.mutateAsync({ input: form, existing: point });
      toast.success(point ? "Charger updated" : "Charger added");
      onOpenChange(false);
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save charger");
    }
  };

  const mapsUrl =
    form.latitude.trim() && form.longitude.trim()
      ? `https://www.google.com/maps?q=${encodeURIComponent(`${form.latitude.trim()},${form.longitude.trim()}`)}`
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{point ? "Edit charger" : "Add charger"}</DialogTitle>
          <DialogDescription>
            The caller bot uses this on the next call. Nearby locations are the places a driver can name to be sent here.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Name" value={form.name} onChange={(value) => set("name", value)} placeholder="Noida Sector 62 Charger" />
          <Field
            label="Spoken name"
            value={form.spoken_name}
            onChange={(value) => set("spoken_name", value)}
            placeholder="Filled from the name if left blank"
          />
          <div className="md:col-span-2">
            <Field label="Address" value={form.address} onChange={(value) => set("address", value)} placeholder="Sector 62, Noida" />
          </div>
          <Field
            label="Short address"
            value={form.short_address}
            onChange={(value) => set("short_address", value)}
            placeholder="First part of the address, used in the spoken reply"
          />
          <Field label="City" value={form.city} onChange={(value) => set("city", value)} placeholder="Noida" />
          <Field label="State" value={form.state} onChange={(value) => set("state", value)} placeholder="Uttar Pradesh" />
          <Field label="Operator" value={form.operator} onChange={(value) => set("operator", value)} placeholder="Reliable Charge" />
          <Field label="Latitude" value={form.latitude} onChange={(value) => set("latitude", value)} placeholder="28.6266" />
          <Field label="Longitude" value={form.longitude} onChange={(value) => set("longitude", value)} placeholder="77.3720" />
          <Field label="Power (kW)" value={form.power_kw} onChange={(value) => set("power_kw", value)} placeholder="60" />
          <Field label="Connectors" value={form.connectors} onChange={(value) => set("connectors", value)} placeholder="CCS2, DC" />
          <Field label="Access" value={form.access} onChange={(value) => set("access", value)} placeholder="Public" />
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div>
              <Label>Active</Label>
              <p className="text-xs text-muted-foreground">Inactive chargers are hidden from the bot.</p>
            </div>
            <Switch checked={form.active} onCheckedChange={(checked) => set("active", checked)} />
          </div>
        </div>

        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
            Check these coordinates on Google Maps
          </a>
        )}

        <div className="space-y-2">
          <Label>Nearby locations</Label>
          <p className="text-xs text-muted-foreground">
            Places a driver might say. Add one at a time, or paste a list separated by commas or new lines.
          </p>
          <TagField
            values={form.service_areas}
            onChange={(values) => set("service_areas", values)}
            placeholder="Noida Sector 62"
          />
        </div>

        <details className="rounded-md border px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium">Voice matching phrases</summary>
          <p className="mt-2 text-xs text-muted-foreground">
            Extra names for this charger’s own site, such as a mall or sector. Nearby locations stay in the list above.
          </p>
          <div className="mt-3 space-y-2">
            <TagField
              values={form.site_phrases}
              onChange={(values) => set("site_phrases", values)}
              placeholder="Sector 62"
            />
            <Button type="button" variant="outline" size="sm" onClick={addGeneratedPhrases}>
              Add phrases from the name and address
            </Button>
          </div>
        </details>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LocationDialog({
  open,
  location,
  points,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  location: LocationGroup | null;
  points: ChargingPoint[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const syncMutation = useSyncLocationCoverage();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [chargerQuery, setChargerQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(location?.name ?? "");
    setSelected(location?.chargers.map((charger) => charger.id) ?? []);
    setChargerQuery("");
  }, [open, location]);

  const visibleChargers = useMemo(() => {
    const query = chargerQuery.trim().toLowerCase();
    if (!query) return points;
    return points.filter((point) =>
      `${point.name} ${point.city ?? ""} ${point.address ?? ""}`.toLowerCase().includes(query),
    );
  }, [points, chargerQuery]);

  const toggle = (id: string, checked: boolean) => {
    setSelected((current) => (checked ? [...current, id] : current.filter((item) => item !== id)));
  };

  const onSubmit = async () => {
    try {
      await syncMutation.mutateAsync({
        previousName: location?.name ?? null,
        name,
        chargerIds: selected,
        points,
      });
      toast.success(location ? "Location updated" : "Location added");
      onOpenChange(false);
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update location");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{location ? "Edit location" : "Add location"}</DialogTitle>
          <DialogDescription>
            Choose which chargers the bot should offer when a driver names this place.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Location name</Label>
          <Input value={name} placeholder="Rajouri Garden" onChange={(event) => setName(event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Chargers that cover it</Label>
          <Input
            value={chargerQuery}
            placeholder="Search chargers"
            onChange={(event) => setChargerQuery(event.target.value)}
          />
          <div className="max-h-64 overflow-y-auto rounded-md border">
            {visibleChargers.map((point) => (
              <label key={point.id} className="flex items-start gap-3 border-b px-3 py-2 last:border-b-0">
                <Checkbox
                  checked={selected.includes(point.id)}
                  onCheckedChange={(checked) => toggle(point.id, checked === true)}
                />
                <span>
                  <span className="block text-sm font-medium">{point.spoken_name || point.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {[point.city, point.address].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </label>
            ))}
            {visibleChargers.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">No chargers match.</p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{selected.length} selected</p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={syncMutation.isPending}>
            {syncMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ChargingPointsPage() {
  const { data: points = [], isLoading, error, refetch } = useChargingPoints();
  const deleteMutation = useDeleteChargingPoint();
  const toggleMutation = useToggleChargingPoint();

  const [search, setSearch] = useState("");
  const [city, setCity] = useState("all");
  const [status, setStatus] = useState("all");
  const [locationSearch, setLocationSearch] = useState("");
  const [editor, setEditor] = useState<ChargingPoint | null | undefined>(undefined);
  const [locationEditor, setLocationEditor] = useState<LocationGroup | null | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<ChargingPoint | null>(null);
  const [pendingLocationDelete, setPendingLocationDelete] = useState<LocationGroup | null>(null);

  const cities = useMemo(
    () => [...new Set(points.map((point) => point.city).filter(Boolean) as string[])].sort(),
    [points],
  );

  const locations = useMemo(() => {
    const groups = new Map<string, LocationGroup>();
    for (const point of points) {
      for (const area of point.service_areas ?? []) {
        const names = area.split(/[,;\n]+/).map((part) => part.replace(/\s+/g, " ").trim()).filter((part) => part.length > 1);
        for (const name of names.length ? names : [area]) {
          const existing = groups.get(name);
          if (existing) existing.chargers.push(point);
          else groups.set(name, { name, chargers: [point] });
        }
      }
    }
    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [points]);

  const filteredPoints = useMemo(() => {
    const query = search.trim().toLowerCase();
    return points.filter((point) => {
      if (city !== "all" && point.city !== city) return false;
      if (status === "active" && !point.active) return false;
      if (status === "inactive" && point.active) return false;
      if (!query) return true;
      const haystack = [
        point.name,
        point.spoken_name,
        point.address,
        point.city,
        point.operator,
        ...(point.service_areas ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [points, search, city, status]);

  const filteredLocations = useMemo(() => {
    const query = locationSearch.trim().toLowerCase();
    if (!query) return locations;
    return locations.filter((location) => {
      const haystack = [location.name, ...location.chargers.map((charger) => charger.name)]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [locations, locationSearch]);

  const missingCoordinates = points.filter((point) => point.latitude == null || point.longitude == null).length;
  const activeCount = points.filter((point) => point.active).length;

  const removeCharger = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync(pendingDelete.id);
      toast.success("Charger deleted");
      setPendingDelete(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete charger");
    }
  };

  const removeLocation = async () => {
    if (!pendingLocationDelete) return;
    try {
      await syncLocationCoverage({
        previousName: pendingLocationDelete.name,
        name: pendingLocationDelete.name,
        chargerIds: [],
        points,
      });
      toast.success("Location removed");
      setPendingLocationDelete(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove location");
    }
  };

  const toggleActive = async (point: ChargingPoint, active: boolean) => {
    try {
      await toggleMutation.mutateAsync({ id: point.id, active });
      toast.success(active ? "Charger turned on" : "Charger turned off");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update charger");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Charging Points</h1>
            <p className="text-muted-foreground">
              Update chargers and the locations they cover. The caller bot reads this list on the next call.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocationEditor(null)}>
              <MapPin className="mr-2 h-4 w-4" />
              Add location
            </Button>
            <Button onClick={() => setEditor(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Add charger
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Chargers" value={points.length} />
          <Stat label="Active" value={activeCount} />
          <Stat label="Locations" value={locations.length} />
          <Stat label="Missing coordinates" value={missingCoordinates} />
        </div>

        {error && (
          <Card>
            <CardContent className="pt-6 text-sm text-destructive">
              Could not load charging points. {error.message}
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && points.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              The database returned no charging points for this login. Existing rows stay hidden until admin
              access is enabled. In the Supabase SQL editor, run{" "}
              <span className="font-medium text-foreground">
                supabase/migrations/20261005_ev_charging_points_admin_access.sql
              </span>
              , then refresh this page.
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="chargers">
          <TabsList>
            <TabsTrigger value="chargers">Chargers</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
          </TabsList>

          <TabsContent value="chargers" className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search name, city, or location"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger className="md:w-48">
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cities</SelectItem>
                  {cities.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="md:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Charger</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Power</TableHead>
                        <TableHead>Locations</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPoints.map((point) => (
                        <TableRow key={point.id}>
                          <TableCell>
                            <div className="font-medium">{point.spoken_name || point.name}</div>
                            <div className="text-xs text-muted-foreground">{point.address || point.name}</div>
                          </TableCell>
                          <TableCell>{point.city || "—"}</TableCell>
                          <TableCell>
                            {point.power_kw ? `${point.power_kw} kW` : "—"}
                            {point.connectors ? ` · ${point.connectors}` : ""}
                          </TableCell>
                          <TableCell>
                            <LocationPreview areas={point.service_areas ?? []} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={point.active}
                                aria-label={point.active ? "Turn charger off" : "Turn charger on"}
                                onCheckedChange={(checked) => toggleActive(point, checked)}
                              />
                              <Badge variant={point.active ? "default" : "secondary"}>
                                {point.active ? "Active" : "Inactive"}
                              </Badge>
                              {(point.latitude == null || point.longitude == null) && (
                                <Badge variant="outline">No coordinates</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" aria-label="Edit charger" onClick={() => setEditor(point)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Delete charger"
                              onClick={() => setPendingDelete(point)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredPoints.length === 0 && !isLoading && (
                        <TableRow>
                          <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                            No chargers match these filters.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locations" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search a location or charger"
                value={locationSearch}
                onChange={(event) => setLocationSearch(event.target.value)}
              />
            </div>
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Location</TableHead>
                      <TableHead>Nearby chargers</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLocations.map((location) => (
                      <TableRow key={location.name}>
                        <TableCell className="font-medium">{location.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {location.chargers.map((charger) => (
                              <Badge key={charger.id} variant={charger.active ? "secondary" : "outline"}>
                                {charger.spoken_name || charger.name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Edit location"
                            onClick={() => setLocationEditor(location)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Remove location"
                            onClick={() => setPendingLocationDelete(location)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredLocations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                          No locations yet. Add one and attach the chargers that cover it.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ChargerDialog
        open={editor !== undefined}
        point={editor ?? null}
        onOpenChange={(open) => {
          if (!open) setEditor(undefined);
        }}
        onSaved={refetch}
      />
      <LocationDialog
        open={locationEditor !== undefined}
        location={locationEditor ?? null}
        points={points}
        onOpenChange={(open) => {
          if (!open) setLocationEditor(undefined);
        }}
        onSaved={refetch}
      />

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this charger?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.spoken_name || pendingDelete?.name} will be removed from the caller bot. Turn it off
              instead if you only want to hide it for now.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={removeCharger}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(pendingLocationDelete)}
        onOpenChange={(open) => !open && setPendingLocationDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this location?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingLocationDelete?.name} will be detached from{" "}
              {pendingLocationDelete?.chargers.length ?? 0} charger
              {(pendingLocationDelete?.chargers.length ?? 0) === 1 ? "" : "s"}. The chargers themselves stay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={removeLocation}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

function LocationPreview({ areas }: { areas: string[] }) {
  if (!areas.length) return <span className="text-muted-foreground">None</span>;
  const shown = areas.slice(0, 2);
  const rest = areas.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((area) => (
        <Badge key={area} variant="outline">
          {area}
        </Badge>
      ))}
      {rest > 0 && <Badge variant="secondary">+{rest}</Badge>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-semibold">{value}</CardContent>
    </Card>
  );
}
