# GraphHopper Integration Guide

## Overview

This project now uses **GraphHopper** for mapping, routing, and geocoding instead of Google Maps. GraphHopper provides powerful routing capabilities with turn-by-turn navigation, alternative routes, and isochrone mapping.

## Setup Instructions

### 1. Get Your GraphHopper API Key

1. Visit [https://www.graphhopper.com/](https://www.graphhopper.com/)
2. Click "Sign Up" to create a free account
3. Navigate to your Dashboard
4. Create a new API key
5. Copy your API key

### 2. Configure Environment Variables

Open your `.env` file and replace the placeholder with your actual API key:

```bash
NEXT_PUBLIC_GRAPHHOPPER_API_KEY=your_actual_api_key_here
GRAPHHOPPER_API_KEY=your_actual_api_key_here
```

### 3. Install Required Dependencies

The project already includes the necessary dependencies:
- `leaflet` - Open-source mapping library
- `react-leaflet` - React components for Leaflet
- `leaflet-draw` - Drawing tools for Leaflet

If you need to reinstall:

```bash
npm install leaflet react-leaflet leaflet-draw
npm install -D @types/leaflet
```

## Features

### 1. Interactive Map with Leaflet

- **OpenStreetMap tiles** - Free, open-source map tiles
- **Field drawing** - Draw polygons to define farm boundaries
- **Field visualization** - Color-coded by health status (green/orange/red)

### 2. Routing with GraphHopper

#### Get Directions
Ask the AI assistant:
- "How do I get to this farm?"
- "Show me directions to the field"
- "What's the best route?"

The system will:
1. Request your current location
2. Calculate the optimal route using GraphHopper
3. Display the route on the map
4. Show turn-by-turn directions with distance and time

#### Features:
- **Distance calculation** - Accurate distance in km/m
- **Time estimation** - Expected travel time
- **Turn-by-turn instructions** - Step-by-step navigation
- **Visual route** - Blue line showing the path on the map
- **Multiple vehicle types** - Car, bike, or foot

### 3. Location Services

#### Reverse Geocoding
- Automatically converts farm coordinates to readable addresses
- Shows street, locality, region, and country information

#### Geocoding
- Convert addresses to coordinates
- Search for locations by name

### 4. AI-Powered Assistance with GROQ

The system uses GROQ AI to answer questions about:

#### Location Questions:
- "Where is this farm located?"
- "What's the address of this field?"
- "Tell me about this location"

Response includes:
- Full address
- Landmarks nearby
- Coordinates
- Elevation
- Navigation guidance

#### Direction Questions:
- "How do I get there?"
- "Give me directions to the farm"
- "What's the route?"

Response includes:
- Navigation advice
- Reference to turn-by-turn directions
- Distance and time information

#### Farm Questions:
- "How are my crops doing?"
- "What's the weather like?"
- "Should I water my crops?"

Response includes:
- Crop health analysis
- Soil conditions
- Weather information
- Recommendations

## Usage Guide

### Drawing a Field

1. Click the polygon drawing tool on the map
2. Click on the map to create points
3. Complete the polygon by clicking the first point again
4. The system will automatically:
   - Calculate the area
   - Analyze the field
   - Get location information
   - Display field data

### Getting Directions

**Method 1: Using the AI Chat**
1. Draw or select a field
2. Ask: "How do I get to this farm?"
3. Allow location access when prompted
4. View the route and turn-by-turn directions

**Method 2: Using the Map**
1. Click on a field polygon
2. In the popup, click "Get Directions"
3. Allow location access when prompted
4. View the route panel with detailed instructions

### Asking Location Questions

Simply ask the AI assistant:
- "Where is this farm?"
- "What's the exact location?"
- "Tell me about this area"

The AI will provide comprehensive location information including address, coordinates, and nearby landmarks.

## API Reference

### GraphHopper Service (`lib/services/graphhopper.ts`)

#### `getRoute(from, to, vehicle)`
Get a route between two points.

```typescript
const route = await getRoute(
  { lat: -1.286389, lng: 36.817223 },
  { lat: -1.292066, lng: 36.821946 },
  "car" // or "bike" or "foot"
);
```

#### `getAlternativeRoutes(from, to, vehicle, maxAlternatives)`
Get multiple route options.

```typescript
const routes = await getAlternativeRoutes(
  startPoint,
  endPoint,
  "car",
  3 // number of alternatives
);
```

#### `geocodeAddress(address)`
Convert an address to coordinates.

```typescript
const result = await geocodeAddress("Nairobi, Kenya");
// Returns: { lat, lng, name, city, country, ... }
```

#### `reverseGeocode(coord)`
Convert coordinates to an address.

```typescript
const result = await reverseGeocode({ lat: -1.286389, lng: 36.817223 });
// Returns: { lat, lng, name, street, city, state, country, ... }
```

#### `getIsochrone(options)`
Get reachable area within a time limit.

```typescript
const isochrone = await getIsochrone({
  point: { lat: -1.286389, lng: 36.817223 },
  time_limit: 1800, // 30 minutes in seconds
  buckets: 3
});
```

## Advanced Features (Future Enhancements)

### 1. Isochrone Mapping
Show areas reachable within X minutes from the farm:
- 15-minute drive radius
- 30-minute walk radius
- Delivery zone visualization

### 2. Route Optimization
Visit multiple farms in optimal order:
- Multi-stop routing
- Traveling salesman problem solver
- Delivery route planning

### 3. Offline Maps
Cache map tiles for offline use:
- Download specific regions
- Work without internet connection
- Automatic cache management

### 4. Custom Map Styles
Personalize the map appearance:
- Satellite imagery
- Terrain view
- Custom color schemes
- Farm-specific overlays

### 5. Real-time Traffic
Integrate traffic data:
- Live traffic conditions
- Route adjustments
- ETA updates

## Troubleshooting

### Map Not Loading
- Check that Leaflet CSS is imported
- Verify the component is client-side only (`"use client"`)
- Check browser console for errors

### Routing Not Working
- Verify GraphHopper API key is set correctly
- Check API key has routing permissions
- Ensure coordinates are valid (lat/lng format)

### Location Access Denied
- User must allow location access in browser
- Check browser location permissions
- Try HTTPS (required for geolocation API)

### API Rate Limits
Free tier limits:
- GraphHopper: 500 requests/day
- Consider upgrading for production use

## Migration from Google Maps

The new implementation:
- ✅ Replaces Google Maps with Leaflet + OpenStreetMap
- ✅ Uses GraphHopper for routing instead of Google Directions API
- ✅ Maintains all existing functionality
- ✅ Adds enhanced routing features
- ✅ Integrates with GROQ AI for intelligent responses
- ✅ No Google Maps API key required for mapping

## Support

For issues or questions:
1. Check GraphHopper documentation: https://docs.graphhopper.com/
2. Review Leaflet documentation: https://leafletjs.com/
3. Check the project issues on GitHub

## License

GraphHopper API is free for development with rate limits. For production use, review their pricing at https://www.graphhopper.com/pricing/
