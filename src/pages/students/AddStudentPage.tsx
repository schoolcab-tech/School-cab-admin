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
import { UserPlus, Loader2, ArrowLeft, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createUserAccount, markProfileCompleted } from "@/services/adminAuthService";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type School = {
  school_id: number;
  name: string;
  address: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  google_place_id: string | null;
};

export default function AddStudentPage() {
  return (
    <DashboardLayout>
      <AddStudentContent />
    </DashboardLayout>
  );
}

function AddStudentContent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [schools, setSchools] = useState<School[]>([]);

  // Form state
  const [name, setName] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [section, setSection] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupPincode, setPickupPincode] = useState("");
  const [pickupTime, setPickupTime] = useState("08:00");
  const [dropAddress, setDropAddress] = useState("");
  const [dropPincode, setDropPincode] = useState("");
  const [dropTime, setDropTime] = useState("14:00");

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

  // Load schools
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const { data, error } = await supabase
          .from("schools")
          .select("school_id, name, address, pincode, latitude, longitude, google_place_id")
          .order("name");

        if (error) throw error;
        setSchools(data || []);
      } catch (error: any) {
        toast.error("Failed to load schools: " + error.message);
      } finally {
        setLoadingSchools(false);
      }
    };

    fetchSchools();
  }, []);

  // When a school is selected, auto-fill drop location with school's data
  const handleSchoolChange = (selectedSchoolId: string) => {
    setSchoolId(selectedSchoolId);

    const school = schools.find(
      (s) => s.school_id.toString() === selectedSchoolId
    );
    if (!school) return;

    // Auto-fill drop details from school
    if (school.address) {
      setDropAddress(school.address);
    }
    if (school.pincode) {
      setDropPincode(school.pincode);
    }
    if (school.latitude && school.longitude) {
      setDropCoordinates({ lat: school.latitude, lng: school.longitude });
    }
    if (school.google_place_id) {
      setDropGooglePlaceId(school.google_place_id);
    }
  };

  const validatePhone = (phone: string): boolean => {
    const digits = phone.replace(/[\s\-\(\)\+]/g, "").replace(/^91/, "");
    return /^[6-9]\d{9}$/.test(digits);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !schoolId || !studentClass || !section) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!phoneNumber || !validatePhone(phoneNumber)) {
      toast.error("Please enter a valid 10-digit Indian mobile number (starting with 6-9)");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create auth account via Edge Function
      const authResult = await createUserAccount(phoneNumber, "user");

      // Step 2: Create student profile with the real user_id
      const { error: studentError } = await supabase
        .from("students")
        .insert({
          user_id: authResult.user_id,
          name,
          school_id: parseInt(schoolId),
          class: studentClass,
          section,
          phone_number: authResult.phone,
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
        .select()
        .single();

      if (studentError) throw studentError;

      // Step 3: Mark profile as completed
      await markProfileCompleted(phoneNumber);

      toast.success("Student account created! They can now login via the mobile app.");
      navigate("/students");
    } catch (error: any) {
      console.error("Error adding student:", error);
      toast.error("Failed to add student: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/students")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <UserPlus className="h-8 w-8" />
            Add New Student
          </h1>
          <p className="text-muted-foreground">
            Create a new student profile with a login account
          </p>
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
                    {loadingSchools ? (
                      <SelectItem value="loading" disabled>
                        Loading schools...
                      </SelectItem>
                    ) : (
                      schools.map((school) => (
                        <SelectItem
                          key={school.school_id}
                          value={school.school_id.toString()}
                        >
                          {school.name}
                        </SelectItem>
                      ))
                    )}
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
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="9876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="mt-1"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  10-digit Indian mobile number. A login account will be created for this number.
                </p>
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
                {schoolId && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-filled from selected school. You can adjust if needed.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/students")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding Student...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Student
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
