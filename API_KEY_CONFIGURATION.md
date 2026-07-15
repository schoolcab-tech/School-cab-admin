# Google Places API Key Configuration Guide

## Quick Answer

**You can use the same API key for both React Native and your web application!**

You just need to configure the restrictions properly in Google Cloud Console.

## Step-by-Step Configuration

### 1. Go to Google Cloud Console

- Visit: https://console.cloud.google.com/
- Navigate to: **APIs & Services** → **Credentials**
- Click on your existing API key

### 2. Configure Application Restrictions

You have two options:

#### Option A: Allow All (Development Only)

- Select: **HTTP referrers (websites)**
- Click: **Add an item**
- Add these domains:
  - `localhost:8080/*` - For local development
  - `*.local/*` - For local network access
  - Your production domain (e.g., `*.yourdomain.com/*`)

#### Option B: IP Address Restrictions (Production)

- Select: **IP addresses (web servers)**
- Add the IP addresses of your servers

### 3. Configure API Restrictions

Make sure these APIs are enabled:

- ✅ Places API
- ✅ Geocoding API
- ✅ Maps JavaScript API

### 4. For React Native

For Android apps, you might also need to add:

- Package name restrictions
- Or use a separate API key for mobile with SHA-1 fingerprint restrictions

## Recommended Setup

### Single API Key for Both (Simple)

If you want to use one key for both web and React Native:

1. Set HTTP referrer restrictions for web
2. Don't add Android/iOS restrictions
3. This allows the key to work on web and mobile

### Separate API Keys (More Secure)

1. **Web API Key**: With HTTP referrer restrictions only
2. **Mobile API Key**: With Android/iOS package name restrictions

## Your Current Configuration

Since you're testing locally, add this to your restrictions:

```
localhost:8080/*
localhost:8080/*
*.local/*
```

This will allow:

- Your local development server
- Your React Native development setup
- Your production domain (when you add it)

## Troubleshooting

### Error: "establishment cannot be mixed with other types"

✅ Fixed by changing types from `["establishment", "school"]` to `["school"]`

### Error: "This API key is not authorized"

- Make sure you added `localhost:8080/*` to HTTP referrer restrictions
- Wait a few minutes for changes to propagate
- Check that you selected "HTTP referrers" in Application restrictions

### Error: "API key not valid"

- Verify the key is copied correctly (no extra spaces)
- Make sure the required APIs are enabled
- Check that you're using the correct key

## Test Your Configuration

1. Add your API key to `.env.local`:

```env
VITE_GOOGLE_PLACES_API_KEY=your_key_here
```

2. Start your dev server:

```bash
npm run dev
```

3. Go to Schools → Add School
4. Try searching for "school" in the location picker

If it works, you're all set! 🎉
