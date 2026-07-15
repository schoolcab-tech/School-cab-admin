-- Add latitude and longitude columns to schools table for geocoding functionality
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS google_place_id TEXT;

-- Add indexes for faster geospatial queries
CREATE INDEX IF NOT EXISTS idx_schools_latitude_longitude ON schools (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_schools_google_place_id ON schools (google_place_id);

-- Add comments to document the purpose of these fields
COMMENT ON COLUMN schools.latitude IS 'GPS latitude coordinate for school location';
COMMENT ON COLUMN schools.longitude IS 'GPS longitude coordinate for school location';
COMMENT ON COLUMN schools.google_place_id IS 'Google Places API place ID for the school location';

