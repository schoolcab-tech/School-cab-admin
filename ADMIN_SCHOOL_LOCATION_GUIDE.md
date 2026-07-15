# Admin Panel - School Location Management

## Overview

This guide explains how to add a **School Location Editor** to your admin panel with Google Places API integration for automatically fetching school coordinates.

## Current Problem

- **10 schools** in database
- **Only 1** has GPS coordinates (Delhi Public School, R.K. Puram)
- **9 schools** have `null` for latitude/longitude
- Cannot start trips for these schools (no route data)

## Solution Architecture

### Option A: Quick SQL Update (Manual)

Use the `UPDATE_SCHOOL_LOCATIONS.sql` script to manually add coordinates.

### Option B: Admin Panel with Google Places API (Recommended)

Add a school editor to your admin dashboard with autocomplete location search.

---

## Implementation Guide

### 1. Google Places API Setup

#### 1.1 Enable Google Places API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create new one)
3. Enable these APIs:
   - **Places API**
   - **Geocoding API**
   - **Maps JavaScript API**

#### 1.2 Get API Key

```bash
# Go to: APIs & Services → Credentials
# Create API Key
# Restrict the key to:
- Places API
- Geocoding API
- Maps JavaScript API
```

#### 1.3 Set Restrictions

```
Application restrictions:
- HTTP referrers (for web)
- Add your admin panel domain

API restrictions:
- Restrict key to selected APIs
- Select: Places API, Geocoding API, Maps JavaScript API
```

---

### 2. Admin Panel Integration

#### 2.1 School List Page

**Features:**

- Display all schools in a table
- Show coordinate status (✅ Has / ❌ Missing)
- "Edit Location" button for each school
- Bulk "Add Locations" button

**SQL Query for School List:**

```sql
-- Get all schools with coordinate status
SELECT
    school_id,
    name,
    address,
    latitude,
    longitude,
    contact_number,
    email,
    CASE
        WHEN latitude IS NOT NULL AND longitude IS NOT NULL
        THEN 'complete'
        ELSE 'missing'
    END as location_status,
    created_at,
    updated_at
FROM schools
ORDER BY
    CASE
        WHEN latitude IS NULL OR longitude IS NULL THEN 0
        ELSE 1
    END,
    name;
```

#### 2.2 School Location Editor Modal

**UI Components:**

1. **School Name** (read-only display)
2. **Address** (editable text field)
3. **Location Search** (Google Places Autocomplete)
4. **Map Preview** (show selected location)
5. **Coordinates Display** (latitude, longitude)
6. **Save Button**

---

### 3. Google Places Autocomplete Implementation

#### 3.1 HTML/JavaScript Example

```html
<!DOCTYPE html>
<html>
  <head>
    <title>School Location Editor</title>
    <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places"></script>
    <style>
      #map {
        height: 400px;
        width: 100%;
      }
      #search-input {
        width: 400px;
        padding: 10px;
        font-size: 16px;
      }
      .coordinates {
        margin: 10px 0;
        font-family: monospace;
      }
    </style>
  </head>
  <body>
    <h2>Edit School Location</h2>

    <!-- School Info -->
    <div>
      <label>School Name:</label>
      <span id="school-name">Delhi Public School</span>
    </div>

    <!-- Address Input -->
    <div>
      <label>Address:</label>
      <input type="text" id="address-input" value="123 Main Road" />
    </div>

    <!-- Google Places Search -->
    <div>
      <label>Search Location:</label>
      <input
        id="search-input"
        type="text"
        placeholder="Search for school location..."
      />
    </div>

    <!-- Coordinates Display -->
    <div class="coordinates">
      <label>Latitude:</label> <span id="latitude">-</span><br />
      <label>Longitude:</label> <span id="longitude">-</span>
    </div>

    <!-- Map Preview -->
    <div id="map"></div>

    <!-- Action Buttons -->
    <button onclick="saveLocation()">Save Location</button>
    <button onclick="closeModal()">Cancel</button>

    <script>
      let map;
      let marker;
      let selectedLocation = null;

      function initMap() {
        // Default center (New Delhi)
        const defaultCenter = { lat: 28.6139, lng: 77.209 };

        // Initialize map
        map = new google.maps.Map(document.getElementById("map"), {
          center: defaultCenter,
          zoom: 13,
        });

        // Initialize marker
        marker = new google.maps.Marker({
          map: map,
          draggable: true,
        });

        // Marker drag event
        marker.addListener("dragend", function (event) {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          updateCoordinates(lat, lng);
        });

        // Initialize autocomplete
        const input = document.getElementById("search-input");
        const autocomplete = new google.maps.places.Autocomplete(input, {
          types: ["establishment", "school"],
          componentRestrictions: { country: "in" }, // Restrict to India
        });

        // Place changed event
        autocomplete.addListener("place_changed", function () {
          const place = autocomplete.getPlace();

          if (!place.geometry || !place.geometry.location) {
            alert("No location data available for this place");
            return;
          }

          // Get location
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();

          // Update map
          map.setCenter(place.geometry.location);
          map.setZoom(17);
          marker.setPosition(place.geometry.location);
          marker.setVisible(true);

          // Update address
          if (place.formatted_address) {
            document.getElementById("address-input").value =
              place.formatted_address;
          }

          // Update coordinates
          updateCoordinates(lat, lng);

          // Store selected location
          selectedLocation = {
            lat: lat,
            lng: lng,
            address: place.formatted_address,
            name: place.name,
          };
        });
      }

      function updateCoordinates(lat, lng) {
        document.getElementById("latitude").textContent = lat.toFixed(6);
        document.getElementById("longitude").textContent = lng.toFixed(6);
        selectedLocation = { lat, lng };
      }

      async function saveLocation() {
        if (!selectedLocation) {
          alert("Please select a location first");
          return;
        }

        const schoolId = getSchoolIdFromContext(); // Your implementation
        const address = document.getElementById("address-input").value;

        // Update Supabase
        const { data, error } = await supabase
          .from("schools")
          .update({
            latitude: selectedLocation.lat,
            longitude: selectedLocation.lng,
            address: address,
            updated_at: new Date().toISOString(),
          })
          .eq("school_id", schoolId);

        if (error) {
          alert("Error updating location: " + error.message);
        } else {
          alert("Location saved successfully!");
          closeModal();
          refreshSchoolList();
        }
      }

      function closeModal() {
        // Your modal close implementation
      }

      // Initialize map on load
      window.onload = initMap;
    </script>
  </body>
</html>
```

#### 3.2 React/Next.js Example

```typescript
// components/SchoolLocationEditor.tsx
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

interface School {
  school_id: number;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

interface SchoolLocationEditorProps {
  school: School;
  onSave: () => void;
  onCancel: () => void;
}

export function SchoolLocationEditor({
  school,
  onSave,
  onCancel,
}: SchoolLocationEditorProps) {
  const [address, setAddress] = useState(school.address);
  const [coordinates, setCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(
    school.latitude && school.longitude
      ? { lat: school.latitude, lng: school.longitude }
      : null
  );
  const [saving, setSaving] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    // Initialize map
    const defaultCenter = coordinates || { lat: 28.6139, lng: 77.209 };

    const map = new google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: coordinates ? 17 : 13,
    });

    mapInstanceRef.current = map;

    // Initialize marker
    const marker = new google.maps.Marker({
      map,
      position: coordinates || undefined,
      draggable: true,
      visible: !!coordinates,
    });

    markerRef.current = marker;

    // Marker drag event
    marker.addListener("dragend", (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        setCoordinates({ lat, lng });
      }
    });

    // Initialize autocomplete
    if (searchInputRef.current) {
      const autocomplete = new google.maps.places.Autocomplete(
        searchInputRef.current,
        {
          types: ["establishment", "school"],
          componentRestrictions: { country: "in" },
        }
      );

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();

        if (!place.geometry?.location) {
          alert("No location data available");
          return;
        }

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        // Update map
        map.setCenter(place.geometry.location);
        map.setZoom(17);
        marker.setPosition(place.geometry.location);
        marker.setVisible(true);

        // Update state
        setCoordinates({ lat, lng });
        if (place.formatted_address) {
          setAddress(place.formatted_address);
        }
      });
    }
  }, []);

  const handleSave = async () => {
    if (!coordinates) {
      alert("Please select a location");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("schools")
        .update({
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          address,
          updated_at: new Date().toISOString(),
        })
        .eq("school_id", school.school_id);

      if (error) throw error;

      alert("Location saved successfully!");
      onSave();
    } catch (error) {
      console.error("Error saving location:", error);
      alert("Failed to save location");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="school-location-editor">
      <h2>Edit School Location</h2>

      <div className="form-field">
        <label>School Name:</label>
        <p>{school.name}</p>
      </div>

      <div className="form-field">
        <label>Address:</label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="address-input"
        />
      </div>

      <div className="form-field">
        <label>Search Location:</label>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search for school location..."
          className="search-input"
        />
      </div>

      {coordinates && (
        <div className="coordinates">
          <p>Latitude: {coordinates.lat.toFixed(6)}</p>
          <p>Longitude: {coordinates.lng.toFixed(6)}</p>
        </div>
      )}

      <div
        ref={mapRef}
        className="map"
        style={{ height: "400px", width: "100%" }}
      />

      <div className="actions">
        <button onClick={handleSave} disabled={saving || !coordinates}>
          {saving ? "Saving..." : "Save Location"}
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
```

---

### 4. Supabase Integration

#### 4.1 Update School Location Function

```typescript
// Supabase Edge Function or API Route
export async function updateSchoolLocation(
  schoolId: number,
  latitude: number,
  longitude: number,
  address: string
) {
  const { data, error } = await supabase
    .from("schools")
    .update({
      latitude,
      longitude,
      address,
      updated_at: new Date().toISOString(),
    })
    .eq("school_id", schoolId)
    .select()
    .single();

  if (error) {
    console.error("Error updating school location:", error);
    throw error;
  }

  return data;
}
```

#### 4.2 Get Schools Without Coordinates

```typescript
export async function getSchoolsWithoutCoordinates() {
  const { data, error } = await supabase
    .from("schools")
    .select("*")
    .or("latitude.is.null,longitude.is.null")
    .order("name");

  if (error) {
    console.error("Error fetching schools:", error);
    throw error;
  }

  return data;
}
```

---

### 5. Alternative: Batch Geocoding Script

If you prefer to add coordinates in bulk, use this Node.js script:

```javascript
// scripts/geocode-schools.js
const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

async function geocodeAddress(address) {
  try {
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/geocode/json",
      {
        params: {
          address,
          key: GOOGLE_API_KEY,
        },
      }
    );

    if (response.data.results && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
        formatted_address: response.data.results[0].formatted_address,
      };
    }

    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

async function updateSchoolsWithCoordinates() {
  // Get schools without coordinates
  const { data: schools, error } = await supabase
    .from("schools")
    .select("*")
    .or("latitude.is.null,longitude.is.null");

  if (error) {
    console.error("Error fetching schools:", error);
    return;
  }

  console.log(`Found ${schools.length} schools without coordinates`);

  for (const school of schools) {
    console.log(`\nProcessing: ${school.name}`);
    console.log(`Address: ${school.address}`);

    const location = await geocodeAddress(
      `${school.name}, ${school.address}, India`
    );

    if (location) {
      console.log(`✅ Found coordinates: ${location.lat}, ${location.lng}`);

      const { error: updateError } = await supabase
        .from("schools")
        .update({
          latitude: location.lat,
          longitude: location.lng,
          address: location.formatted_address,
          updated_at: new Date().toISOString(),
        })
        .eq("school_id", school.school_id);

      if (updateError) {
        console.error(`❌ Error updating ${school.name}:`, updateError);
      } else {
        console.log(`✅ Updated ${school.name} successfully`);
      }
    } else {
      console.log(`❌ Could not geocode ${school.name}`);
    }

    // Delay to respect API rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\n✅ Batch geocoding completed!");
}

// Run the script
updateSchoolsWithCoordinates();
```

**Run the script:**

```bash
npm install @supabase/supabase-js axios
node scripts/geocode-schools.js
```

---

### 6. Testing the Integration

#### 6.1 Test Checklist

- [ ] Google Places API key is configured
- [ ] Autocomplete shows school suggestions
- [ ] Map displays selected location
- [ ] Marker is draggable
- [ ] Coordinates update correctly
- [ ] Save button updates Supabase
- [ ] Validation prevents null coordinates

#### 6.2 Test Data

Use these schools to test:

```sql
-- Test with schools that have addresses
SELECT school_id, name, address
FROM schools
WHERE latitude IS NULL
LIMIT 3;
```

---

### 7. Production Deployment

#### 7.1 Environment Variables

```env
GOOGLE_PLACES_API_KEY=your_api_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
```

#### 7.2 Security Checklist

- [ ] API key restrictions configured
- [ ] HTTPS only
- [ ] Rate limiting implemented
- [ ] Admin authentication required
- [ ] Input validation on server
- [ ] SQL injection protection

---

## Summary

### Quick Start (SQL Method)

1. Open `UPDATE_SCHOOL_LOCATIONS.sql`
2. Get coordinates from Google Maps for each school
3. Replace latitude/longitude values
4. Run in Supabase SQL Editor

### Full Solution (Admin Panel)

1. Enable Google Places API
2. Add School Location Editor to admin panel
3. Use Google Places Autocomplete
4. Save coordinates to Supabase

### Batch Processing (Script)

1. Run `geocode-schools.js` script
2. Automatically geocodes all schools
3. Updates Supabase in bulk

---

## Next Steps

1. **Choose your method**: SQL, Admin Panel, or Script
2. **Get Google API key** (for Admin Panel or Script)
3. **Update school coordinates**
4. **Test trip creation** with updated schools
5. **Verify route display** in student/driver apps

**All schools need coordinates before trips can show route-to-school!** 🗺️
