import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DriverOperationsView } from "./DriverOperationsView";
import { LiveTrackingMap } from "./LiveTrackingMap";
import { LayoutList, Map } from "lucide-react";

export interface LiveTrackingTabsProps {
  schoolId?: number;
  schoolCenter?: { latitude: number; longitude: number; name: string } | null;
  detailPathPrefix: string;
  refetchInterval?: number;
}

export function LiveTrackingTabs({
  schoolId,
  schoolCenter,
  detailPathPrefix,
  refetchInterval = 15000,
}: LiveTrackingTabsProps) {
  const [view, setView] = useState<"table" | "map">("table");

  return (
    <div className="space-y-4">
      <Tabs value={view} onValueChange={(v) => setView(v as "table" | "map")}>
        <TabsList>
          <TabsTrigger value="table" className="gap-2">
            <LayoutList className="h-4 w-4" />
            Drivers table
          </TabsTrigger>
          <TabsTrigger value="map" className="gap-2">
            <Map className="h-4 w-4" />
            Live map
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {view === "table" ? (
        <DriverOperationsView
          schoolId={schoolId}
          detailPathPrefix={detailPathPrefix}
          refetchInterval={refetchInterval}
        />
      ) : (
        <LiveTrackingMap
          schoolId={schoolId}
          schoolCenter={schoolCenter}
          detailPathPrefix={detailPathPrefix}
          refetchInterval={refetchInterval}
        />
      )}
    </div>
  );
}
