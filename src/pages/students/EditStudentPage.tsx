import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationPicker } from "@/components/ui/location-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Edit, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";

type School = {
  school_id: number;
  name: string;
  address: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  google_place_id: string | null;
};

export default function EditStudentPage() {
  return (
    <DashboardLayout>
      <EditStudentContent />
    </DashboardLayout>
  );
}

function EditStudentContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [schools, setSchools] = useState<School[]>([]);

  // Form state
  const [name, setName] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [section, setSection] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupPincode, setPickupPincode] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [dropAddress, setDropAddress] = useState("");
  const [dropPincode, setDropPincode] = useState("");
  const [dropTime, setDropTime] = useState("");

  // Location picker state
  const [pickupCoordinates, setPickupCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [pickupGooglePlaceId, setPickupGooglePlaceId] = useState<string | null>(null);
  const [dropCoordinates, setDropCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [dropGooglePlaceId, setDropGooglePlaceId] = useState<string | null>(null);

  // Load student and schools
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        // Fetch student
        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .select("*")
          .eq("student_id", parseInt(id))
          .single();

        if (studentError) throw studentError;

        setName(studentData.name);
        setSchoolId(studentData.school_id.toString());
        setStudentClass(studentData.class);
        setSection(studentData.section);
        setPhoneNumber(studentData.phone_number || "");
        setPickupAddress(studentData.pickup_address);
        setPickupPincode(studentData.pickup_pincode);
        setPickupTime(studentData.pickup_time);
        setDropAddress(studentData.drop_address);
        setDropPincode(studentData.drop_pincode);
        setDropTime(studentData.drop_time);

        // Set location coordinates if available
        if (studentData.pickup_latitude && studentData.pickup_longitude) {
          setPickupCoordinates({
            lat: studentData.pickup_latitude,
            lng: studentData.pickup_longitude,
          });
        }
        if (studentData.pickup_google_place_id) {
          setPickupGooglePlaceId(studentData.pickup_google_place_id);
        }
        if (studentData.drop_latitude && studentData.drop_longitude) {
          setDropCoordinates({
            lat: studentData.drop_latitude,
            lng: studentData.drop_longitude,
          });
        }
        if (studentData.drop_google_place_id) {
          setDropGooglePlaceId(studentData.drop_google_place_id);
        }

        // Fetch schools
        const { data: schoolsData, error: schoolsError } = await supabase
          .from("schools")
          .select("school_id, name, address, pincode, latitude, longitude, google_place_id")
          .order("name");

        if (schoolsError) throw schoolsError;
        setSchools(schoolsData || []);
      } catch (error: any) {
        toast.error("Failed to load data: " + error.message);
        navigate("/students");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  // When a school is selected, auto-fill drop location with school's data
  const handleSchoolChange = (selectedSchoolId: string) => {
    setSchoolId(selectedSchoolId);

    const school = schools.find(
      (s) => s.school_id.toString() === selectedSchoolId
    );
    if (!school) return;

    if (school.address) setDropAddress(school.address);
    if (school.pincode) setDropPincode(school.pincode);
    if (school.latitude && school.longitude) {
      setDropCoordinates({ lat: school.latitude, lng: school.longitude });
    }
    if (school.google_place_id) setDropGooglePlaceId(school.google_place_id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !schoolId || !studentClass || !section) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("students")
        .update({
          name,
          school_id: parseInt(schoolId),
          class: studentClass,
          section,
          phone_number: phoneNumber || null,
          pickup_address: pickupAddress,
          pickup_pincode: pickupPincode,
          pickup_time: pickupTime,
          pickup_latitude: pickupCoordinates?.lat ?? null,
          pickup_longitude: pickupCoordinates?.lng ?? null,
          pickup_google_place_id: pickupGooglePlaceId,
          drop_address: dropAddress,
          drop_pincode: dropPincode,
          drop_time: dropTime,
          drop_latitude: dropCoordinates?.lat ?? null,
          drop_longitude: dropCoordinates?.lng ?? null,
          drop_google_place_id: dropGooglePlaceId,
        })
        .eq("student_id", parseInt(id!));

      if (error) throw error;

      toast.success("Student updated successfully!");
      navigate(`/students/${id}`);
    } catch (error: any) {
      console.error("Error updating student:", error);
      toast.error("Failed to update student: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/students/${id}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Edit className="h-8 w-8" />
            Edit Student
          </h1>
          <p className="text-muted-foreground">Update student information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="name">Student Name *</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="school">School *</Label>
                <Select value={schoolId} onValueChange={handleSchoolChange} required>
                  <SelectTrigger id="school" className="mt-1">
                    <SelectValue placeholder="Select school" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((school) => (
                      <SelectItem
                        key={school.school_id}
                        value={school.school_id.toString()}
                      >
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="class">Class *</Label>
                <Input
                  id="class"
                  placeholder="10th"
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="section">Section *</Label>
                <Input
                  id="section"
                  placeholder="A"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 9876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Pickup Details */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Pickup Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pickupPincode">Pickup Pincode *</Label>
                  <Input
                    id="pickupPincode"
                    placeholder="110001"
                    value={pickupPincode}
                    onChange={(e) => setPickupPincode(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="pickupTime">Pickup Time *</Label>
                  <Input
                    id="pickupTime"
                    type="time"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Pickup Location on Map *</Label>
                <LocationPicker
                  value={pickupCoordinates}
                  onChange={setPickupCoordinates}
                  address={pickupAddress}
                  onAddressChange={setPickupAddress}
                  googlePlaceId={pickupGooglePlaceId}
                  onGooglePlaceIdChange={setPickupGooglePlaceId}
                  label="Search pickup location"
                  placeholder="Search for pickup address..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Drop Details */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Drop Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dropPincode">Drop Pincode *</Label>
                  <Input
                    id="dropPincode"
                    placeholder="110001"
                    value={dropPincode}
                    onChange={(e) => setDropPincode(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="dropTime">Drop Time *</Label>
                  <Input
                    id="dropTime"
                    type="time"
                    value={dropTime}
                    onChange={(e) => setDropTime(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Drop Location on Map (auto-filled from school)</Label>
                <LocationPicker
                  value={dropCoordinates}
                  onChange={setDropCoordinates}
                  address={dropAddress}
                  onAddressChange={setDropAddress}
                  googlePlaceId={dropGooglePlaceId}
                  onGooglePlaceIdChange={setDropGooglePlaceId}
                  label="Search drop location"
                  placeholder="Search for school or drop location..."
                  searchTypes={["school"]}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/students/${id}`)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating Student...
              </>
            ) : (
              <>
                <Edit className="mr-2 h-4 w-4" />
                Update Student
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
