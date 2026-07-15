import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { loadGoogleMaps } from "@/lib/loadGoogleMaps";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google: any;
  }
}

interface Coordinates {
  lat: number;
  lng: number;
}

interface LocationPickerProps {
  value?: Coordinates | null;
  onChange: (coordinates: Coordinates) => void;
  address: string;
  onAddressChange: (address: string) => void;
  googlePlaceId?: string | null;
  onGooglePlaceIdChange?: (placeId: string | null) => void;
  label?: string;
  required?: boolean;
  searchTypes?: string[];
  placeholder?: string;
  disabled?: boolean;
}

export function LocationPicker({
  value,
  onChange,
  address,
  onAddressChange,
  googlePlaceId,
  onGooglePlaceIdChange,
  label = "Location",
  required = false,
  searchTypes,
  placeholder = "Search for a location...",
  disabled = false,
}: LocationPickerProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(address);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Load Google Maps script
  useEffect(() => {
    loadGoogleMaps
      .load()
      .then(() => {
        setMounted(true);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load Google Maps:", error);
        toast({
          title: "Error",
          description:
            "Failed to load Google Maps. Please check your API key configuration.",
          variant: "destructive",
        });
        setIsLoading(false);
      });
  }, [toast]);

  // Initialize map
  useEffect(() => {
    if (!mounted || !mapRef.current || !window.google) return;

    // Default center (New Delhi, India)
    const defaultCenter = { lat: 28.6139, lng: 77.209 };
    const initialCenter = value
      ? { lat: value.lat, lng: value.lng }
      : defaultCenter;

    // Initialize map
    const map = new google.maps.Map(mapRef.current, {
      center: initialCenter,
      zoom: value ? 17 : 13,
      mapTypeId: "roadmap",
    });

    mapInstanceRef.current = map;

    const handlePositionUpdate = (lat: number, lng: number) => {
      onChange({ lat, lng });
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode(
        { location: { lat, lng } },
        (results: any[], status: string) => {
          if (status === "OK" && results && results[0]) {
            setSelectedAddress(results[0].formatted_address);
            onAddressChange(results[0].formatted_address);
          }
        }
      );
    };

    const ensureMarker = (position: google.maps.LatLng | google.maps.LatLngLiteral) => {
      if (markerRef.current) {
        markerRef.current.setPosition(position);
      } else {
        const marker = new google.maps.Marker({
          map,
          position,
          draggable: true,
        });
        marker.addListener("dragend", (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            handlePositionUpdate(event.latLng.lat(), event.latLng.lng());
          }
        });
        markerRef.current = marker;
      }
    };

    // Click on map to place/move marker
    map.addListener("click", (event: google.maps.MapMouseEvent) => {
      if (disabled || !event.latLng) return;
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      ensureMarker(event.latLng);
      handlePositionUpdate(lat, lng);
    });

    // Create marker if we have coordinates
    if (value) {
      ensureMarker(initialCenter);

      // Marker drag event
      markerRef.current!.addListener("dragend", (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          handlePositionUpdate(event.latLng.lat(), event.latLng.lng());
        }
      });
    }
  }, [mounted]);

  // Sync internal selectedAddress when parent address prop changes
  useEffect(() => {
    setSelectedAddress(address);
  }, [address]);

  // React to external value changes (e.g., school selection auto-fill)
  useEffect(() => {
    if (!mounted || !mapInstanceRef.current || !window.google) return;
    if (!value || (value.lat === 0 && value.lng === 0)) return;

    const position = { lat: value.lat, lng: value.lng };

    // Pan map to new position
    mapInstanceRef.current.setCenter(position);
    mapInstanceRef.current.setZoom(17);

    // Place or move marker
    if (markerRef.current) {
      markerRef.current.setPosition(position);
    } else {
      const marker = new google.maps.Marker({
        map: mapInstanceRef.current,
        position,
        draggable: true,
      });
      marker.addListener("dragend", (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          onChange({ lat: event.latLng.lat(), lng: event.latLng.lng() });
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode(
            { location: { lat: event.latLng.lat(), lng: event.latLng.lng() } },
            (results: any[], status: string) => {
              if (status === "OK" && results && results[0]) {
                setSelectedAddress(results[0].formatted_address);
                onAddressChange(results[0].formatted_address);
              }
            }
          );
        }
      });
      markerRef.current = marker;
    }
  }, [value?.lat, value?.lng, mounted]);

  // Initialize autocomplete
  useEffect(() => {
    if (!mounted || !searchInputRef.current || !window.google) return;

    const autocompleteOptions: google.maps.places.AutocompleteOptions = {
      componentRestrictions: { country: "in" },
    };
    if (searchTypes && searchTypes.length > 0) {
      autocompleteOptions.types = searchTypes;
    }

    const autocomplete = new google.maps.places.Autocomplete(
      searchInputRef.current,
      autocompleteOptions
    );

    autocompleteRef.current = autocomplete;

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      setIsSearching(true);

      if (!place.geometry || !place.geometry.location) {
        toast({
          title: "Error",
          description: "No location data available for this place",
          variant: "destructive",
        });
        setIsSearching(false);
        return;
      }

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const newCoordinates = { lat, lng };

      // Store Google Place ID if available
      if (place.place_id && onGooglePlaceIdChange) {
        onGooglePlaceIdChange(place.place_id);
      }

      // Update map center
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter(place.geometry.location);
        mapInstanceRef.current.setZoom(17);
      }

      // Update or create marker
      if (markerRef.current) {
        markerRef.current.setPosition(place.geometry.location);
      } else if (mapInstanceRef.current) {
        const marker = new google.maps.Marker({
          map: mapInstanceRef.current,
          position: place.geometry.location,
          draggable: true,
        });

        marker.addListener("dragend", (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            const lat = event.latLng.lat();
            const lng = event.latLng.lng();
            onChange({ lat, lng });
          }
        });

        markerRef.current = marker;
      }

      // Update address and coordinates
      if (place.formatted_address) {
        setSelectedAddress(place.formatted_address);
        onAddressChange(place.formatted_address);
      }

      onChange(newCoordinates);
      setIsSearching(false);
    });
  }, [mounted, onChange, onAddressChange, toast]);

  const handleManualAddressChange = (newAddress: string) => {
    setSelectedAddress(newAddress);
    onAddressChange(newAddress);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Label>
          {label} {required && "*"}
        </Label>
        <div className="flex items-center justify-center p-8 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            Loading Google Maps...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>
          {label} {required && "*"}
        </Label>
        <Input
          ref={searchInputRef}
          type="text"
          placeholder={placeholder}
          className="w-full"
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Type to search for a location, then select from the dropdown. You can also click on the map or drag the marker.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Selected Address</Label>
        <textarea
          value={selectedAddress}
          onChange={(e) => handleManualAddressChange(e.target.value)}
          className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {value && (
        <div className="space-y-2">
          <Label>Coordinates</Label>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Latitude: </span>
              <span className="font-mono">{value.lat.toFixed(6)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Longitude: </span>
              <span className="font-mono">{value.lng.toFixed(6)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Map Preview</Label>
        <div
          ref={mapRef}
          className="w-full h-[400px] rounded-lg border border-input overflow-hidden"
        />
        <p className="text-xs text-muted-foreground">
          {value
            ? "You can drag the marker to adjust the location"
            : "Search for a location to see it on the map"}
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          if (searchInputRef.current) {
            searchInputRef.current.value = "";
          }
          setSelectedAddress("");
          onAddressChange("");
          onChange({ lat: 0, lng: 0 });
        }}
        className="w-full"
      >
        Clear Location
      </Button>
    </div>
  );
}
