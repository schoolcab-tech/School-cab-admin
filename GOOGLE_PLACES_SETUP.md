# Google Places API Setup Guide

This guide will help you set up Google Places API integration for the school location picker in the admin panel.

## Step 1: Get Google Places API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Places API**
   - **Geocoding API**
   - **Maps JavaScript API**

### Enable APIs:

```bash
# Navigate to: APIs & Services → Enable APIs
# Search and enable each API:
# 1. Places API
# 2. Geocoding API
# 3. Maps JavaScript API
```

4. Create an API Key:
   - Go to: **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **API Key**
   - Copy the generated API key

## Step 2: Configure API Key Restrictions

### Application Restrictions:

- Click on your API key to edit it
- Under "Application restrictions":
  - Select **HTTP referrers (web sites)**
  - Add your domains:
    - `http://localhost:8080/*` (for local development)
    - `https://yourdomain.com/*` (for production)

### API Restrictions:

- Under "API restrictions":
  - Select **Restrict key**
  - Choose only these APIs:
    - Places API
    - Geocoding API
    - Maps JavaScript API

**Save the restrictions!**

## Step 3: Add API Key to Your Project

Create a `.env.local` file in the project root (or `.env` for production):

```env
VITE_GOOGLE_PLACES_API_KEY=your_api_key_here
```

**Important**:

- The `.env.local` file is already in `.gitignore` and won't be committed to git
- Don't commit your actual API key to version control
- For production, add this environment variable to your hosting platform (Vercel, Netlify, etc.)

## Step 4: Apply Database Migration

Run the migration to add latitude/longitude columns to the schools table:

```sql
-- Run this in your Supabase SQL Editor or via CLI
-- File: supabase/migrations/20250101000000_add_coordinates_to_schools.sql
```

Or use Supabase CLI:

```bash
supabase db push
```

## Step 5: Test the Integration

1. Start your development server:

   ```bash
   npm run dev
   ```

2. Navigate to the Schools section:

   - Go to `/schools`
   - Click "Add New School" or edit an existing school

3. You should see a "Location on Map" section with:
   - A search input for Google Places autocomplete
   - A textarea showing the selected address
   - Coordinate display (latitude/longitude)
   - A draggable marker on an interactive map

## Step 6: Using the Location Picker

### Adding Location to a New School:

1. Click on the "Search Location" input
2. Start typing a school name or address (e.g., "Delhi Public School")
3. Select a location from the dropdown
4. The map will automatically zoom to the location
5. The marker will appear on the map
6. You can drag the marker to fine-tune the position
7. The coordinates will update automatically

### Editing Location:

1. The map will load with the existing location if available
2. Search for a new location or drag the marker
3. Save the school to update the coordinates

## Troubleshooting

### Error: "Failed to load Google Maps"

- Check that your API key is correctly set in `.env.local`
- Verify that the API key has the necessary permissions
- Check the browser console for specific error messages

### API Key Not Working:

1. Check API key restrictions in Google Cloud Console
2. Ensure the domain is added to HTTP referrer restrictions
3. Check that the required APIs are enabled

### Map Not Showing:

- Check browser console for JavaScript errors
- Verify that the Google Maps script is loading (check Network tab)
- Ensure you have internet connection

### Coordinates Not Saving:

- Check that the migration was applied successfully
- Verify the database schema has latitude/longitude columns
- Check browser console for Supabase errors

## Environment Variables

### Required Variables:

- `VITE_GOOGLE_PLACES_API_KEY` - Your Google Places API key

### Optional Variables (already configured):

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

## Cost Information

Google Places API pricing (as of 2025):

- **Places API (New)**: $17 per 1,000 requests for autocomplete
- **Geocoding API**: $5 per 1,000 requests
- **Maps JavaScript API**: Free for 28,000 map loads per month

**Important**: Monitor your usage in [Google Cloud Console](https://console.cloud.google.com/billing)

## Security Best Practices

1. **Never commit API keys** to version control
2. **Restrict your API key** to specific domains
3. **Use separate keys** for development and production
4. **Monitor usage** to prevent unexpected charges
5. **Set up billing alerts** in Google Cloud Console

## Support

If you encounter any issues:

1. Check the browser console for errors
2. Check Network tab for failed API calls
3. Verify API key configuration in Google Cloud Console
4. Check Supabase logs for database errors

## Next Steps

Once the location picker is working:

1. Update existing schools with coordinates
2. Verify that the coordinates are saved to the database
3. Test the location display in your school listing pages
4. Consider adding a map view of all schools
