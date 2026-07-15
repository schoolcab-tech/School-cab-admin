import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { useSimpleQuery } from "@/hooks/useSimpleQuery";
import {
  getHourlyTripDistribution,
  getPerformanceStats,
  type HourlyTripBar,
  type PerformanceStats,
} from "@/services/performanceService";
import { format } from "date-fns";
import {
  Activity,
  Car,
  Clock,
  MapPin,
  Sunrise,
  Sunset,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface PerformancePageProps {
  schoolId?: number;
}

export default function PerformancePage() {
  return (
    <DashboardLayout>
      <PerformanceContent />
    </DashboardLayout>
  );
}

export function SchoolAdminPerformancePage() {
  return (
    <DashboardLayout>
      <SchoolAdminPerformanceContent />
    </DashboardLayout>
  );
}

function SchoolAdminPerformanceContent() {
  const { linkedSchoolId } = useAuth();
  return <PerformanceContent schoolId={linkedSchoolId ?? undefined} />;
}

function PerformanceContent({ schoolId }: PerformancePageProps = {}) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [chartDate, setChartDate] = useState(today);

  const { data: stats, isLoading: statsLoading } = useSimpleQuery<PerformanceStats>(
    () => getPerformanceStats({ schoolId }),
    [schoolId],
    { refetchInterval: 60000 }
  );

  const { data: hourly = [], isLoading: hourlyLoading } = useSimpleQuery<HourlyTripBar[]>(
    () => getHourlyTripDistribution(chartDate, { schoolId }),
    [chartDate, schoolId]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <TrendingUp className="h-7 w-7" />
          Performance Dashboard
        </h1>
        <p className="text-muted-foreground">
          {schoolId != null
            ? "Summarized operational insights for vehicles serving your school."
            : "Summarized operational insights across the entire fleet."}
        </p>
      </div>

      {/* Top stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Trips Today"
          value={stats?.tripsToday ?? 0}
          icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
          loading={statsLoading}
        />
        <StatCard
          label="This Week (7 days)"
          value={stats?.tripsThisWeek ?? 0}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          loading={statsLoading}
        />
        <StatCard
          label="This Month (30 days)"
          value={stats?.tripsThisMonth ?? 0}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          loading={statsLoading}
        />
        <StatCard
          label="Active Drivers Now"
          value={stats?.activeDriversNow ?? 0}
          subtext={`of ${stats?.registeredDrivers ?? 0} registered`}
          icon={<Activity className="h-4 w-4 text-green-600" />}
          accent="text-green-600"
          loading={statsLoading}
        />
      </div>

      {/* Morning vs Drop breakdown */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Morning Pickup Trips Today</CardTitle>
            <Sunrise className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              {stats?.morningTripsToday ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drop Trips Today</CardTitle>
            <Sunset className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {stats?.dropTripsToday ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Trip Duration (Today)</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.avgDurationMinutes != null ? `${stats.avgDurationMinutes}m` : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hourly timeline chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Daily Trip Timeline</CardTitle>
              <p className="text-xs text-muted-foreground">
                Distribution of trip starts by hour
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={chartDate}
                onChange={(e) => setChartDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hourlyLoading ? (
            <div className="h-72 flex items-center justify-center text-muted-foreground">
              Loading...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourly} margin={{ top: 16, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="pickup"
                  name="Morning Pickup"
                  stackId="a"
                  fill="#f59e0b"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="drop"
                  name="Drop"
                  stackId="a"
                  fill="#8b5cf6"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Driver activity status note */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="h-4 w-4" />
            Driver Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <ActivityChip
              label="Active"
              value={stats?.activeDriversNow ?? 0}
              accent="text-green-600"
            />
            <ActivityChip
              label="Idle"
              value={Math.max(0, (stats?.registeredDrivers ?? 0) - (stats?.activeDriversNow ?? 0))}
              accent="text-muted-foreground"
            />
            <ActivityChip
              label="Registered"
              value={stats?.registeredDrivers ?? 0}
            />
            <ActivityChip
              label="Util %"
              value={
                stats && stats.registeredDrivers > 0
                  ? Math.round((stats.activeDriversNow / stats.registeredDrivers) * 100)
                  : 0
              }
              suffix="%"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
  icon,
  accent,
  loading,
}: {
  label: string;
  value: number;
  subtext?: string;
  icon?: React.ReactNode;
  accent?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${accent ?? ""}`}>
          {loading ? "—" : value}
        </div>
        {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

function ActivityChip({
  label,
  value,
  accent,
  suffix,
}: {
  label: string;
  value: number;
  accent?: string;
  suffix?: string;
}) {
  return (
    <div className="text-center border rounded-md py-3">
      <div className={`text-xl font-bold ${accent ?? ""}`}>
        {value}
        {suffix || ""}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
