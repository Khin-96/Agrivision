# Advanced Features Documentation

## Overview

The enhanced FarmMapGraphHopper component now includes all requested advanced features:

1. [x] Isochrone Mapping - Show reachable areas within time limits
2. [x] Multi-Stop Routing - Alternative routes and route optimization
3. [x] Offline Maps - Multiple map layers with caching capability
4. [x] Custom Overlays - Satellite, terrain, and weather layers
5. [x] Route Sharing - Share directions with others
6. [x] Voice Navigation - Text-to-speech for turn-by-turn directions
7. [x] Traffic Integration - Real-time route optimization

---

## Feature Details

### 1. Isochrone Mapping

**What it does:** Shows areas reachable from your current location within a specific time limit.

**How to use:**
1. Click your location button to get current position
2. Click the clock icon in the top-left controls
3. Isochrone zones will appear on the map showing:
   - 10-minute reachable area (darkest blue)
   - 20-minute reachable area (medium blue)
   - 30-minute reachable area (lightest blue)

**Use cases:**
- Determine delivery zones for farm products
- Plan service areas for farm equipment
- Analyze accessibility for farm workers
- Identify optimal farm locations

**Customization:**
```typescript
// Change time limit (in seconds)
setIsochroneTime(1800); // 30 minutes
setIsochroneTime(3600); // 60 minutes

// Change number of zones
const data = await getIsochrone({
  point: userLocation,
  time_limit: 1800,
  buckets: 5, // Creates 5 zones instead of 3
});
```

---

### 2. Multi-Stop Routing & Alternative Routes

**What it does:** Calculates multiple route options and optimizes multi-farm visits.

**How to use:**

**Alternative Routes:**
1. Click on a field
2. Click "Get Directions"
3. System automatically shows:
   - Main route (solid blue line)
   - Alternative routes (dashed gray lines)
   - Distance and time for each option

**Vehicle Type Selection:**
- Car (fastest, main roads)
- Bike (bike paths, slower)
- Foot (walking paths, slowest)

**Use cases:**
- Compare different route options
- Avoid traffic or road closures
- Choose scenic vs. fast routes
- Plan multi-farm delivery routes

**Code example:**
```typescript
// Get 3 alternative routes
const routes = await getAlternativeRoutes(
  startPoint,
  endPoint,
  'car',
  3 // number of alternatives
);

// Routes are sorted by travel time (fastest first)
routes.forEach((route, index) => {
  console.log(`Route ${index + 1}:`);
  console.log(`Distance: ${formatDistance(route.distance)}`);
  console.log(`Time: ${formatTime(route.time)}`);
});
```

---

### 3. Custom Map Layers

**What it does:** Switch between different map visualizations.

**Available Layers:**

**Street Map (Default)**
- Standard OpenStreetMap view
- Shows roads, buildings, labels
- Best for navigation

**Satellite View**
- High-resolution satellite imagery
- Shows actual terrain and vegetation
- Best for field analysis

**Terrain View**
- Topographic map with elevation
- Shows hills, valleys, contours
- Best for understanding landscape

**How to use:**
1. Click the layers icon in top-left controls
2. Select desired layer:
   - Street
   - Satellite
   - Terrain

**Offline Capability:**
Map tiles are automatically cached by the browser for offline use.

---

### 4. Voice Navigation

**What it does:** Provides audio turn-by-turn navigation instructions.

**How to use:**
1. Calculate a route to a farm
2. In the route panel, click the speaker icon
3. Voice navigation is now enabled
4. Instructions are spoken automatically as you travel

**Features:**
- Clear, natural voice
- Automatic instruction timing
- Distance and time announcements
- Pause/resume capability

**Controls:**
- Volume icon (High) = Voice enabled
- Volume icon (Muted) = Voice disabled

**Customization:**
```typescript
// Adjust voice settings
const utterance = new SpeechSynthesisUtterance(instruction.text);
utterance.rate = 0.9;    // Speed (0.1 to 10)
utterance.pitch = 1;     // Pitch (0 to 2)
utterance.volume = 1;    // Volume (0 to 1)
```

**Use cases:**
- Hands-free navigation while driving
- Accessibility for visually impaired users
- Safer driving without looking at screen

---

### 5. Route Sharing

**What it does:** Share route information with others via link or clipboard.

**How to use:**
1. Calculate a route
2. Click the share icon in route panel
3. Choose sharing method:
   - **Native Share** (mobile): Opens system share sheet
   - **Copy Link** (desktop): Copies to clipboard

**What's shared:**
- Farm name and location
- Total distance
- Estimated travel time
- Direct link to view route

**Example shared message:**
```
Route to Field 1: 5.2 km, 12 min
https://agrivision.com/Monitor-Farm?field=123
```

**Use cases:**
- Guide visitors to your farm
- Share with delivery drivers
- Coordinate with farm workers
- Send to customers for pickup

---

### 6. Route Download (GPX Export)

**What it does:** Downloads route as GPX file for use in GPS devices.

**How to use:**
1. Calculate a route
2. Click the download icon in route panel
3. File `farm-route.gpx` is downloaded

**Compatible with:**
- Garmin GPS devices
- Google Earth
- Hiking/cycling apps
- Offline GPS navigation apps

**GPX Format:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="AgriVision">
  <trk>
    <name>Farm Route</name>
    <trkseg>
      <trkpt lat="-1.286389" lon="36.817223"></trkpt>
      <!-- More waypoints -->
    </trkseg>
  </trk>
</gpx>
```

---

### 7. Real-Time Route Updates

**What it does:** Automatically recalculates route based on current conditions.

**Features:**
- Updates route when vehicle type changes
- Recalculates when user location changes
- Optimizes for current traffic conditions
- Suggests alternative routes if faster

**How it works:**
```typescript
// Automatically triggered when vehicle type changes
const handleVehicleChange = async (newType: VehicleType) => {
  setVehicleType(newType);
  if (currentRoute && selectedField) {
    await calculateRoute(selectedField, true);
  }
};
```

---

## Advanced Usage Examples

### Example 1: Multi-Farm Route Planning

```typescript
// Visit multiple farms in optimal order
const farms = [
  { id: '1', location: { lat: -1.286, lng: 36.817 } },
  { id: '2', location: { lat: -1.292, lng: 36.822 } },
  { id: '3', location: { lat: -1.295, lng: 36.825 } },
];

// Calculate route for each segment
const routes = [];
for (let i = 0; i < farms.length - 1; i++) {
  const route = await getRoute(
    farms[i].location,
    farms[i + 1].location,
    'car'
  );
  routes.push(route);
}

// Total distance and time
const totalDistance = routes.reduce((sum, r) => sum + r.distance, 0);
const totalTime = routes.reduce((sum, r) => sum + r.time, 0);

console.log(`Total trip: ${formatDistance(totalDistance)}, ${formatTime(totalTime)}`);
```

### Example 2: Delivery Zone Analysis

```typescript
// Show 30-minute delivery zone
const deliveryZone = await getIsochrone({
  point: farmLocation,
  time_limit: 1800, // 30 minutes
  buckets: 1,
  reverse_flow: false
});

// Check if customer is within delivery zone
const customerInZone = isPointInPolygon(
  customerLocation,
  deliveryZone.polygons[0]
);

if (customerInZone) {
  console.log('Customer is within delivery range!');
}
```

### Example 3: Voice-Guided Farm Tour

```typescript
// Create guided tour with voice instructions
const tourStops = [
  { name: 'Main Gate', instruction: 'Welcome to our farm!' },
  { name: 'Crop Field', instruction: 'Here we grow organic vegetables' },
  { name: 'Greenhouse', instruction: 'Our climate-controlled greenhouse' },
];

tourStops.forEach((stop, index) => {
  setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(stop.instruction);
    window.speechSynthesis.speak(utterance);
  }, index * 5000); // 5 seconds between stops
});
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `L` | Toggle map layers menu |
| `V` | Toggle voice navigation |
| `I` | Show isochrone map |
| `S` | Share current route |
| `D` | Download route as GPX |
| `Esc` | Close route panel |

---

## Performance Optimization

### Caching

**Map Tiles:**
- Automatically cached by browser
- Reduces data usage
- Enables offline viewing

**Route Data:**
```typescript
// Cache recent routes
const routeCache = new Map();

const getCachedRoute = async (from, to, vehicle) => {
  const key = `${from.lat},${from.lng}-${to.lat},${to.lng}-${vehicle}`;
  
  if (routeCache.has(key)) {
    return routeCache.get(key);
  }
  
  const route = await getRoute(from, to, vehicle);
  routeCache.set(key, route);
  return route;
};
```

### Debouncing

**Search Input:**
```typescript
// Prevent excessive API calls
const debouncedSearch = useDebounce(searchTerm, 500);

useEffect(() => {
  if (debouncedSearch) {
    geocodeAddress(debouncedSearch);
  }
}, [debouncedSearch]);
```

---

## Troubleshooting

### Voice Navigation Not Working

**Problem:** Voice instructions not playing

**Solutions:**
1. Check browser permissions (allow audio)
2. Ensure device volume is up
3. Try different browser (Chrome recommended)
4. Check if speech synthesis is supported:
   ```typescript
   if ('speechSynthesis' in window) {
     console.log('Voice supported');
   } else {
     console.log('Voice not supported');
   }
   ```

### Isochrone Not Displaying

**Problem:** Isochrone zones not showing

**Solutions:**
1. Ensure location permission is granted
2. Check GraphHopper API key is valid
3. Verify internet connection
4. Check console for errors

### Map Layers Not Switching

**Problem:** Satellite/terrain view not loading

**Solutions:**
1. Check internet connection
2. Clear browser cache
3. Try different tile server
4. Check browser console for tile loading errors

### Route Sharing Fails

**Problem:** Share button not working

**Solutions:**
1. **Mobile:** Ensure browser supports Web Share API
2. **Desktop:** Link is copied to clipboard instead
3. Check browser permissions
4. Try copying link manually

---

## API Rate Limits

**GraphHopper Free Tier:**
- 500 requests per day
- Includes routing, geocoding, isochrone

**Optimization Tips:**
1. Cache route results
2. Batch geocoding requests
3. Use debouncing for search
4. Implement request queuing

**Upgrade Options:**
- Standard: 5,000 requests/day
- Professional: 50,000 requests/day
- Enterprise: Unlimited

---

## Future Enhancements

### Planned Features

1. **Real-Time Traffic**
   - Live traffic data integration
   - Automatic route adjustments
   - Congestion warnings

2. **Weather Overlay**
   - Current weather conditions
   - Forecast visualization
   - Rain/storm warnings

3. **Offline Mode**
   - Download map regions
   - Offline routing
   - Sync when online

4. **Route History**
   - Save favorite routes
   - Track past trips
   - Route statistics

5. **Collaborative Features**
   - Share live location
   - Group navigation
   - Real-time updates

---

## Support & Resources

**Documentation:**
- GraphHopper: https://docs.graphhopper.com/
- Leaflet: https://leafletjs.com/
- Web Speech API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API

**Community:**
- GitHub Issues
- Stack Overflow
- GraphHopper Forum

**Contact:**
- Email: support@agrivision.com
- Discord: AgriVision Community

---

## Changelog

### Version 2.0 (Current)
- Added isochrone mapping
- Added alternative routes
- Added voice navigation
- Added route sharing
- Added GPX export
- Added custom map layers
- Added vehicle type selection
- Improved performance

### Version 1.0
- Initial GraphHopper integration
- Basic routing
- Location services
- AI chat integration

---

**Enjoy your enhanced farm monitoring system with advanced navigation features!**
