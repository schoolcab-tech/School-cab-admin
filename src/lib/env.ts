/**
 * Environment configuration
 * This file centralizes environment variable access
 */

// Google Places API configuration
export const GOOGLE_PLACES_API_KEY =
  import.meta.env.VITE_GOOGLE_PLACES_API_KEY || "";

// Check if API key is configured
export const isGooglePlacesConfigured = () => {
  return GOOGLE_PLACES_API_KEY !== "" && GOOGLE_PLACES_API_KEY !== undefined;
};

// Google Maps script URL
export const getGoogleMapsScriptUrl = () => {
  return `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_PLACES_API_KEY}&libraries=places`;
};
