/**
 * Utility to dynamically load Google Maps API
 */

interface GoogleMapsLoader {
  load: () => Promise<void>;
  isLoaded: () => boolean;
}

const GOOGLE_PLACES_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || "";
let mapsLoaded = false;
let loadPromise: Promise<void> | null = null;

export const loadGoogleMaps: GoogleMapsLoader = {
  isLoaded: () =>
    mapsLoaded ||
    (typeof window !== "undefined" &&
      "google" in window &&
      "maps" in (window as any).google),

  load: () => {
    if (loadGoogleMaps.isLoaded()) {
      return Promise.resolve();
    }

    if (loadPromise) {
      return loadPromise;
    }

    if (!GOOGLE_PLACES_API_KEY) {
      console.warn(
        "Google Places API key is not configured. Set VITE_GOOGLE_PLACES_API_KEY in your .env file."
      );
      return Promise.reject(
        new Error("Google Places API key is not configured")
      );
    }

    loadPromise = new Promise((resolve, reject) => {
      // Check if already loaded
      if (
        typeof window !== "undefined" &&
        "google" in window &&
        "maps" in (window as any).google
      ) {
        mapsLoaded = true;
        resolve();
        return;
      }

      // Create script element
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_PLACES_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        mapsLoaded = true;
        resolve();
      };

      script.onerror = () => {
        reject(new Error("Failed to load Google Maps script"));
      };

      document.head.appendChild(script);
    });

    return loadPromise;
  },
};
