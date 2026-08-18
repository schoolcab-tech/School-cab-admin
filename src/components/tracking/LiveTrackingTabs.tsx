import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DriverOperationsView } from "./DriverOperationsView";
import { LiveTrackingMap } from "./LiveTrackingMap";
import { SchoolLiveMonitorView } from "./SchoolLiveMonitorView";
import { LayoutList, Map, Radio } from "lucide-react";

export interface LiveTrackingTabsProps {
  schoolId?: number;
  driverIds?: number[];
  schoolCenter?: { latitude: number; longitude: number; name: string } | null;
  detailPathPrefix: string;
  refetchInterval?: number;
}

export function LiveTrackingTabs({
  schoolId,
  driverIds,
  schoolCenter,
  detailPathPrefix,
  refetchInterval = 15000,
}: LiveTrackingTabsProps) {
  const [view, setView] = useState<"table" | "map" | "monitor">("table");

  return (
    <div className="space-y-4">
      <Tabs
        value={view}
        onValueChange={(v) => setView(v as "table" | "map" | "monitor")}
      >
        <TabsList>
          <TabsTrigger value="table" className="gap-2">
            <LayoutList className="h-4 w-4" />
            Drivers table
          </TabsTrigger>
          <TabsTrigger value="map" className="gap-2">
            <Map className="h-4 w-4" />
            Live map
          </TabsTrigger>
          <TabsTrigger value="monitor" className="gap-2">
            <Radio className="h-4 w-4" />
            Live monitor
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {view === "table" ? (
        <DriverOperationsView
          schoolId={schoolId}
          driverIds={driverIds}
          detailPathPrefix={detailPathPrefix}
          refetchInterval={refetchInterval}
        />
      ) : view === "map" ? (
        <LiveTrackingMap
          schoolId={schoolId}
          driverIds={driverIds}
          schoolCenter={schoolCenter}
          detailPathPrefix={detailPathPrefix}
          refetchInterval={refetchInterval}
        />
      ) : (
        <SchoolLiveMonitorView
          schoolId={schoolId}
          driverIds={driverIds}
          detailPathPrefix={detailPathPrefix}
          refetchInterval={refetchInterval}
        />
      )}
    </div>
  );
}
