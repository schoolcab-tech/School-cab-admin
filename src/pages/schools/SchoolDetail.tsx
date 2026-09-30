import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSchool } from '@/hooks/useSchools';
import { useSimpleQuery } from '@/hooks/useSimpleQuery';
import { getSchoolStudentLocations, type StudentLocation } from '@/services/schoolService';
import { formatPhoneNumber } from '@/lib/utils';
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  MapPin,
  Users,
  Bus,
  User,
  MapPin as MapPinIcon,
  Compass,
  Video,
} from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Leaflet icon fix (default icons broken in bundlers) ──────────────

// School marker — red
const schoolIcon = new L.DivIcon({
  className: '',
  html: `<div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:#dc2626;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -20],
});

// Student marker — colored by direction
const studentIcon = (dir: CompassDir) => {
  const colors: Record<CompassDir, string> = {
    N: '#2563eb', NE: '#0891b2', E: '#16a34a', SE: '#059669',
    S: '#ea580c', SW: '#d97706', W: '#9333ea', NW: '#4f46e5',
  };
  const bg = colors[dir];
  return new L.DivIcon({
    className: '',
    html: `<div style="position:relative;">
      <div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:${bg};border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,.3);">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </div>
      <span style="position:absolute;top:-8px;right:-10px;background:${bg};color:white;font-size:9px;font-weight:700;padding:1px 4px;border-radius:4px;line-height:1.2;">${dir}</span>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
};

// ── Compass helpers ──────────────────────────────────────────────────

type CompassDir = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

const DIRECTIONS: CompassDir[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

const DIR_LABELS: Record<CompassDir, string> = {
  N: 'North', NE: 'North-East', E: 'East', SE: 'South-East',
  S: 'South', SW: 'South-West', W: 'West', NW: 'North-West',
};

const DIR_COLORS: Record<CompassDir, string> = {
  N: 'bg-blue-100 text-blue-800',
  NE: 'bg-cyan-100 text-cyan-800',
  E: 'bg-green-100 text-green-800',
  SE: 'bg-emerald-100 text-emerald-800',
  S: 'bg-orange-100 text-orange-800',
  SW: 'bg-amber-100 text-amber-800',
  W: 'bg-purple-100 text-purple-800',
  NW: 'bg-indigo-100 text-indigo-800',
};

function calcBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

function bearingToDirection(deg: number): CompassDir {
  const idx = Math.round(deg / 45) % 8;
  return DIRECTIONS[idx];
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Fit map bounds helper ────────────────────────────────────────────

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(([lat, lng]) => [lat, lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [map, points]);
  return null;
}

// ── Main component ───────────────────────────────────────────────────

export default function SchoolDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isModerator, moderatorId } = useAuth();
  const schoolsBase = isModerator ? '/moderator/schools' : '/schools';
  const { data: school, isLoading, error } = useSchool(id || '');

  useEffect(() => {
    if (!isModerator || !school || moderatorId == null) return;
    if (school.moderatorId !== moderatorId) {
      navigate('/unauthorized', { replace: true });
    }
  }, [isModerator, moderatorId, school, navigate]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !school) {
    toast({
      title: 'Error',
      description: 'Failed to load school details',
      variant: 'destructive',
    });
    setTimeout(() => navigate(schoolsBase), 100);
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <Button variant="ghost" size="sm" className="w-fit pl-0" onClick={() => navigate(schoolsBase)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Schools
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{school.name}</h1>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant={school.status === 'active' ? 'default' : 'secondary'}>
                  {school.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
                <span className="text-sm text-muted-foreground">ID: {school.code}</span>
              </div>
            </div>
            <Button onClick={() => navigate(`${schoolsBase}/${school.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit School
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
            <TabsTrigger value="directions">Student Directions</TabsTrigger>
          </TabsList>

          {/* ── Overview ── */}
          <TabsContent value="overview">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <h3 className="text-sm font-medium">Total Students</h3>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{school.studentCount?.toLocaleString() || 'N/A'}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <h3 className="text-sm font-medium">Active Routes</h3>
                  <Bus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{school.routeCount?.toLocaleString() || 'N/A'}</div>
                </CardContent>
              </Card>
              <Card
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => navigate(`/drivers?schoolId=${school.id}`)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <h3 className="text-sm font-medium">Drivers</h3>
                  <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{school.driverCount?.toLocaleString() || 'N/A'}</div>
                  <p className="text-xs text-muted-foreground mt-1">View all drivers</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <h3 className="text-sm font-medium">Live Streaming</h3>
                  <Video className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-1">
                    <Badge variant={school.livestreamEnabled ? 'default' : 'secondary'}>
                      {school.livestreamEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    {school.livestreamEnabled && (
                      <span className="text-xs text-muted-foreground mt-1">
                        Quality: {school.livestreamQuality}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-4">
              <CardHeader><CardTitle>School Information</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium">School Code</h3>
                    <p className="text-muted-foreground">{school.code}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Live cab streaming</h3>
                    <p className="text-muted-foreground">
                      {school.livestreamEnabled
                        ? `Enabled — ${school.livestreamQuality} quality`
                        : 'Disabled for this school'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Operating Hours</h3>
                    <div className="space-y-1 text-muted-foreground">
                      {Object.entries(school.operatingHours)
                        .filter(([_, value]) => value !== null)
                        .map(([day, times]) => (
                          <div key={day} className="flex items-center">
                            <span className="w-24 capitalize">{day}:</span>
                            <span>{times ? `${times.open} - ${times.close}` : 'Closed'}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                  {school.contact.principalContact && (
                    <div>
                      <h3 className="text-sm font-medium">Principal Contact</h3>
                      <p className="text-muted-foreground">{school.contact.principalContact}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Contact ── */}
          <TabsContent value="contact">
            <Card>
              <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium">Email</h3>
                  <a href={`mailto:${school.contact.email}`} className="text-muted-foreground hover:underline flex items-center">
                    <Mail className="h-4 w-4 mr-2" />{school.contact.email}
                  </a>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Phone</h3>
                  <a href={`tel:${school.contact.phone}`} className="text-muted-foreground hover:underline flex items-center">
                    <Phone className="h-4 w-4 mr-2" />{formatPhoneNumber(school.contact.phone)}
                  </a>
                </div>
                {school.contact.principalName && (
                  <div>
                    <h3 className="text-sm font-medium">Principal</h3>
                    <p className="text-muted-foreground">{school.contact.principalName}</p>
                    {school.contact.principalContact && (
                      <a href={`tel:${school.contact.principalContact}`} className="text-muted-foreground hover:underline flex items-center">
                        <Phone className="h-4 w-4 mr-2" />{formatPhoneNumber(school.contact.principalContact)}
                      </a>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Location ── */}
          <TabsContent value="location">
            <Card>
              <CardHeader><CardTitle>Location</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium">Address</h3>
                    <address className="not-italic text-muted-foreground">
                      <p>{school.address.street}</p>
                      <p>{school.address.city}, {school.address.state} {school.address.postalCode}</p>
                      <p>{school.address.country}</p>
                    </address>
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center p-4">
                        <MapPinIcon className="h-8 w-8 mx-auto mb-2" />
                        <p>Map of {school.name}</p>
                        <p className="text-xs mt-2">
                          {school.address.street}, {school.address.city}, {school.address.state} {school.address.postalCode}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Student Directions ── */}
          <TabsContent value="directions">
            <StudentDirectionsTab
              schoolId={school.id}
              schoolName={school.name}
              schoolLat={school.latitude ?? undefined}
              schoolLng={school.longitude ?? undefined}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ── Student Directions Tab ───────────────────────────────────────────

type StudentWithDir = StudentLocation & { direction: CompassDir; distance: number };

function StudentDirectionsTab({
  schoolId,
  schoolName,
  schoolLat,
  schoolLng,
}: {
  schoolId: string;
  schoolName: string;
  schoolLat?: number;
  schoolLng?: number;
}) {
  const { data: students = [], isLoading, error } = useSimpleQuery<StudentLocation[]>(
    () => getSchoolStudentLocations(schoolId),
    [schoolId],
    { enabled: !!schoolId }
  );

  const enriched = useMemo<StudentWithDir[]>(() => {
    if (!schoolLat || !schoolLng) return [];
    return students.map((s) => {
      const brng = calcBearing(schoolLat, schoolLng, s.pickup_latitude, s.pickup_longitude);
      return {
        ...s,
        direction: bearingToDirection(brng),
        distance: haversineKm(schoolLat, schoolLng, s.pickup_latitude, s.pickup_longitude),
      };
    });
  }, [students, schoolLat, schoolLng]);

  const grouped = useMemo(() => {
    const g: Record<CompassDir, StudentWithDir[]> = {
      N: [], NE: [], E: [], SE: [], S: [], SW: [], W: [], NW: [],
    };
    for (const s of enriched) g[s.direction].push(s);
    for (const dir of DIRECTIONS) g[dir].sort((a, b) => a.distance - b.distance);
    return g;
  }, [enriched]);

  // All points for fit bounds (school + students)
  const allPoints = useMemo<[number, number][]>(() => {
    if (!schoolLat || !schoolLng) return [];
    const pts: [number, number][] = [[schoolLat, schoolLng]];
    for (const s of enriched) pts.push([s.pickup_latitude, s.pickup_longitude]);
    return pts;
  }, [enriched, schoolLat, schoolLng]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-destructive">
          Failed to load student locations
        </CardContent>
      </Card>
    );
  }

  if (!schoolLat || !schoolLng) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2" />
          School coordinates not available. Edit the school to add latitude/longitude.
        </CardContent>
      </Card>
    );
  }

  if (enriched.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No students with location data found for this school.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Compass className="h-5 w-5" />
            Student Directions from {schoolName}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {enriched.length} students with location data
          </p>
        </CardHeader>
        <CardContent>
          {/* Direction summary badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {DIRECTIONS.filter((d) => grouped[d].length > 0).map((d) => (
              <Badge key={d} className={DIR_COLORS[d]}>
                {d} — {grouped[d].length}
              </Badge>
            ))}
          </div>

          {/* Leaflet map */}
          <div className="rounded-lg overflow-hidden border" style={{ height: 500 }}>
            <MapContainer
              center={[schoolLat, schoolLng]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitBounds points={allPoints} />

              {/* School marker */}
              <Marker position={[schoolLat, schoolLng]} icon={schoolIcon}>
                <Popup>
                  <strong>{schoolName}</strong>
                  <br />
                  <span className="text-xs">School (center)</span>
                </Popup>
              </Marker>

              {/* Student markers */}
              {enriched.map((s) => (
                <Marker
                  key={s.student_id}
                  position={[s.pickup_latitude, s.pickup_longitude]}
                  icon={studentIcon(s.direction)}
                >
                  <Popup>
                    <strong>{s.name}</strong>
                    <br />
                    <span className="text-xs">
                      {s.class}{s.section ? ` - ${s.section}` : ''} | {s.direction} | {s.distance.toFixed(1)} km
                    </span>
                    <br />
                    <span className="text-xs text-gray-500">{s.pickup_address}</span>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* Direction tables */}
      {DIRECTIONS.filter((dir) => grouped[dir].length > 0).map((dir) => (
        <Card key={dir}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge className={DIR_COLORS[dir]}>{dir}</Badge>
              {DIR_LABELS[dir]} — {grouped[dir].length} student{grouped[dir].length > 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Pickup Address</TableHead>
                  <TableHead className="text-right">Distance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped[dir].map((s) => (
                  <TableRow key={s.student_id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.class}{s.section ? ` - ${s.section}` : ''}</TableCell>
                    <TableCell className="max-w-[250px] truncate text-muted-foreground">
                      {s.pickup_address}
                    </TableCell>
                    <TableCell className="text-right font-mono">{s.distance.toFixed(1)} km</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
