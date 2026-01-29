# Code Examples - GraphHopper Integration

## Table of Contents
1. [Basic Routing](#basic-routing)
2. [Geocoding](#geocoding)
3. [AI Queries](#ai-queries)
4. [Custom Map Features](#custom-map-features)
5. [Advanced Routing](#advanced-routing)

---

## Basic Routing

### Get a Simple Route

```typescript
import { getRoute, formatDistance, formatTime } from '@/lib/services/graphhopper';

// Get route from point A to point B
const route = await getRoute(
  { lat: -1.286389, lng: 36.817223 }, // Start (Nairobi)
  { lat: -1.292066, lng: 36.821946 }, // End (Farm)
  'car' // Vehicle type: 'car', 'bike', or 'foot'
);

if (route) {
  console.log(`Distance: ${formatDistance(route.distance)}`);
  console.log(`Time: ${formatTime(route.time)}`);
  console.log(`Points: ${route.points.length}`);
}
```

### Display Route on Map

```typescript
import { Polyline } from 'react-leaflet';

// In your component
{route && (
  <Polyline
    positions={route.points.map(p => [p.lat, p.lng])}
    pathOptions={{
      color: '#2563eb',
      weight: 4,
      opacity: 0.7,
    }}
  />
)}
```

### Show Turn-by-Turn Instructions

```typescript
// Display instructions
{route?.instructions.map((instruction, index) => (
  <div key={index} className="instruction-item">
    <span className="step-number">{index + 1}</span>
    <div>
      <p>{instruction.text}</p>
      <p className="text-sm text-gray-500">
        {formatDistance(instruction.distance)} • {formatTime(instruction.time)}
      </p>
    </div>
  </div>
))}
```

---

## Geocoding

### Convert Address to Coordinates

```typescript
import { geocodeAddress } from '@/lib/services/graphhopper';

// Search for a location
const result = await geocodeAddress("Nairobi, Kenya");

if (result) {
  console.log(`Coordinates: ${result.lat}, ${result.lng}`);
  console.log(`City: ${result.city}`);
  console.log(`Country: ${result.country}`);
  
  // Use coordinates to center map
  map.flyTo([result.lat, result.lng], 13);
}
```

### Convert Coordinates to Address

```typescript
import { reverseGeocode } from '@/lib/services/graphhopper';

// Get address from coordinates
const location = await reverseGeocode({ 
  lat: -1.286389, 
  lng: 36.817223 
});

if (location) {
  console.log(`Address: ${location.name}`);
  console.log(`Street: ${location.street}`);
  console.log(`City: ${location.city}`);
  console.log(`State: ${location.state}`);
}
```

### Auto-Complete Search

```typescript
const [searchQuery, setSearchQuery] = useState('');
const [suggestions, setSuggestions] = useState([]);

const handleSearch = async (query: string) => {
  setSearchQuery(query);
  
  if (query.length > 2) {
    const result = await geocodeAddress(query);
    if (result) {
      setSuggestions([result]);
    }
  }
};

// In your JSX
<input
  type="text"
  value={searchQuery}
  onChange={(e) => handleSearch(e.target.value)}
  placeholder="Search for a location..."
/>
```

---

## AI Queries

### Ask About Location

```typescript
const askLocationQuestion = async (field: Field) => {
  const response = await fetch('/api/farm-monitor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      field: field,
      question: 'Where is this farm located?',
      centroid: field.centroid,
      userLocation: null
    })
  });
  
  const data = await response.json();
  console.log(data.answer); // AI response with location details
  console.log(data.location); // Structured location data
};
```

### Ask for Directions

```typescript
const askDirections = async (field: Field, userLocation: Coordinate) => {
  const response = await fetch('/api/farm-monitor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      field: field,
      question: 'How do I get to this farm?',
      centroid: field.centroid,
      userLocation: userLocation
    })
  });
  
  const data = await response.json();
  console.log(data.answer); // AI navigation guidance
};
```

### Ask About Farm Conditions

```typescript
const askFarmQuestion = async (field: Field, question: string) => {
  const response = await fetch('/api/farm-monitor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      field: field,
      question: question,
      centroid: field.centroid
    })
  });
  
  const data = await response.json();
  return {
    answer: data.answer,
    fieldData: data.fieldData // Health, soil, weather, etc.
  };
};

// Example usage
const result = await askFarmQuestion(myField, "Should I water my crops?");
console.log(result.answer);
console.log(result.fieldData.waterAdvice);
```

---

## Custom Map Features

### Add Custom Marker

```typescript
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Create custom icon
const customIcon = L.icon({
  iconUrl: '/icons/farm-marker.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

// Use in component
<Marker 
  position={[lat, lng]} 
  icon={customIcon}
>
  <Popup>
    <h3>My Farm</h3>
    <p>Click for details</p>
  </Popup>
</Marker>
```

### Draw Custom Polygon

```typescript
import { Polygon } from 'react-leaflet';

const fieldBoundary = [
  { lat: -1.286, lng: 36.817 },
  { lat: -1.287, lng: 36.818 },
  { lat: -1.288, lng: 36.817 },
  { lat: -1.287, lng: 36.816 },
];

<Polygon
  positions={fieldBoundary.map(p => [p.lat, p.lng])}
  pathOptions={{
    color: '#4caf50',
    fillColor: '#4caf50',
    fillOpacity: 0.3,
    weight: 2
  }}
  eventHandlers={{
    click: () => console.log('Field clicked!'),
    mouseover: (e) => e.target.setStyle({ fillOpacity: 0.5 }),
    mouseout: (e) => e.target.setStyle({ fillOpacity: 0.3 })
  }}
/>
```

### Add Heatmap Layer

```typescript
import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet.heat';

const HeatmapLayer = ({ data, map }) => {
  useEffect(() => {
    if (!map || !data) return;
    
    // Convert data to heatmap format
    const heatData = data.map(point => [
      point.lat,
      point.lng,
      point.intensity // 0-1
    ]);
    
    // Create heatmap layer
    const heat = L.heatLayer(heatData, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
    }).addTo(map);
    
    return () => {
      map.removeLayer(heat);
    };
  }, [map, data]);
  
  return null;
};
```

---

## Advanced Routing

### Get Alternative Routes

```typescript
import { getAlternativeRoutes } from '@/lib/services/graphhopper';

// Get up to 3 alternative routes
const routes = await getAlternativeRoutes(
  startPoint,
  endPoint,
  'car',
  3 // max alternatives
);

// Display all routes
routes.forEach((route, index) => {
  console.log(`Route ${index + 1}:`);
  console.log(`  Distance: ${formatDistance(route.distance)}`);
  console.log(`  Time: ${formatTime(route.time)}`);
});

// Show on map with different colors
const colors = ['#2563eb', '#10b981', '#f59e0b'];
{routes.map((route, index) => (
  <Polyline
    key={index}
    positions={route.points.map(p => [p.lat, p.lng])}
    pathOptions={{
      color: colors[index],
      weight: index === 0 ? 4 : 2,
      opacity: index === 0 ? 0.8 : 0.5
    }}
  />
))}
```

### Calculate Distance Between Points

```typescript
import { calculateDistance, formatDistance } from '@/lib/services/graphhopper';

const point1 = { lat: -1.286389, lng: 36.817223 };
const point2 = { lat: -1.292066, lng: 36.821946 };

const distance = calculateDistance(point1, point2);
console.log(`Distance: ${formatDistance(distance)}`);
// Output: "Distance: 823 m" or "Distance: 5.2 km"
```

### Multi-Stop Route

```typescript
// Visit multiple farms in sequence
const calculateMultiStopRoute = async (stops: Coordinate[]) => {
  const routes = [];
  
  for (let i = 0; i < stops.length - 1; i++) {
    const route = await getRoute(stops[i], stops[i + 1], 'car');
    if (route) {
      routes.push(route);
    }
  }
  
  // Calculate total distance and time
  const totalDistance = routes.reduce((sum, r) => sum + r.distance, 0);
  const totalTime = routes.reduce((sum, r) => sum + r.time, 0);
  
  return {
    routes,
    totalDistance: formatDistance(totalDistance),
    totalTime: formatTime(totalTime)
  };
};

// Usage
const stops = [
  { lat: -1.286389, lng: 36.817223 }, // Start
  { lat: -1.292066, lng: 36.821946 }, // Farm 1
  { lat: -1.295000, lng: 36.825000 }, // Farm 2
  { lat: -1.300000, lng: 36.830000 }, // Farm 3
];

const multiRoute = await calculateMultiStopRoute(stops);
console.log(`Total: ${multiRoute.totalDistance}, ${multiRoute.totalTime}`);
```

### Isochrone (Reachability) Map

```typescript
import { getIsochrone } from '@/lib/services/graphhopper';

// Show area reachable within 30 minutes
const isochrone = await getIsochrone({
  point: { lat: -1.286389, lng: 36.817223 },
  time_limit: 1800, // 30 minutes in seconds
  buckets: 3, // 10, 20, 30 minute zones
  reverse_flow: false
});

// Display on map
if (isochrone && isochrone.polygons) {
  isochrone.polygons.forEach((polygon, index) => {
    const coords = polygon.geometry.coordinates[0].map(
      coord => [coord[1], coord[0]] // [lat, lng]
    );
    
    // Render polygon
    <Polygon
      positions={coords}
      pathOptions={{
        color: `rgba(37, 99, 235, ${0.8 - index * 0.2})`,
        fillOpacity: 0.2
      }}
    />
  });
}
```

### Route with Waypoints

```typescript
// Route that passes through specific waypoints
const getRouteWithWaypoints = async (
  start: Coordinate,
  waypoints: Coordinate[],
  end: Coordinate
) => {
  const allPoints = [start, ...waypoints, end];
  const routes = [];
  
  for (let i = 0; i < allPoints.length - 1; i++) {
    const segment = await getRoute(allPoints[i], allPoints[i + 1], 'car');
    if (segment) routes.push(segment);
  }
  
  return routes;
};

// Usage
const route = await getRouteWithWaypoints(
  { lat: -1.286389, lng: 36.817223 }, // Start
  [
    { lat: -1.290000, lng: 36.820000 }, // Waypoint 1
    { lat: -1.293000, lng: 36.823000 }, // Waypoint 2
  ],
  { lat: -1.295000, lng: 36.825000 } // End
);
```

---

## Utility Functions

### Format Coordinates for Display

```typescript
const formatCoordinate = (coord: Coordinate): string => {
  return `${coord.lat.toFixed(6)}, ${coord.lng.toFixed(6)}`;
};

// Usage
console.log(formatCoordinate({ lat: -1.286389, lng: 36.817223 }));
// Output: "-1.286389, 36.817223"
```

### Calculate Polygon Area

```typescript
const calculatePolygonArea = (coordinates: Coordinate[]): number => {
  let area = 0;
  for (let i = 0; i < coordinates.length; i++) {
    const j = (i + 1) % coordinates.length;
    area += coordinates[i].lng * coordinates[j].lat;
    area -= coordinates[j].lng * coordinates[i].lat;
  }
  return Math.abs(area / 2) * 111000 * 111000; // Convert to m²
};

// Convert to hectares
const areaInHectares = calculatePolygonArea(fieldCoords) / 10000;
console.log(`Area: ${areaInHectares.toFixed(2)} ha`);
```

### Calculate Polygon Centroid

```typescript
const calculateCentroid = (coordinates: Coordinate[]): Coordinate => {
  const sum = coordinates.reduce(
    (acc, c) => ({ 
      lat: acc.lat + c.lat, 
      lng: acc.lng + c.lng 
    }),
    { lat: 0, lng: 0 }
  );
  
  return { 
    lat: sum.lat / coordinates.length, 
    lng: sum.lng / coordinates.length 
  };
};
```

### Debounce Search Input

```typescript
import { useEffect, useState } from 'react';

const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
};

// Usage in search
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 500);

useEffect(() => {
  if (debouncedSearch) {
    geocodeAddress(debouncedSearch).then(result => {
      // Handle result
    });
  }
}, [debouncedSearch]);
```

---

## Error Handling

### Handle API Errors

```typescript
const safeGetRoute = async (from: Coordinate, to: Coordinate) => {
  try {
    const route = await getRoute(from, to, 'car');
    
    if (!route) {
      throw new Error('No route found');
    }
    
    return { success: true, route };
  } catch (error) {
    console.error('Route error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Usage
const result = await safeGetRoute(start, end);

if (result.success) {
  // Use result.route
} else {
  // Show error to user
  alert(`Could not calculate route: ${result.error}`);
}
```

### Retry Failed Requests

```typescript
const retryRequest = async <T,>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
};

// Usage
const route = await retryRequest(
  () => getRoute(start, end, 'car'),
  3,
  1000
);
```

---

## Complete Example: Farm Finder

```typescript
'use client';

import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import { 
  geocodeAddress, 
  getRoute, 
  formatDistance, 
  formatTime 
} from '@/lib/services/graphhopper';

export default function FarmFinder() {
  const [searchQuery, setSearchQuery] = useState('');
  const [farmLocation, setFarmLocation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [route, setRoute] = useState(null);
  
  const searchFarm = async () => {
    const result = await geocodeAddress(searchQuery);
    if (result) {
      setFarmLocation({ lat: result.lat, lng: result.lng });
    }
  };
  
  const getMyLocation = () => {
    navigator.geolocation.getCurrentPosition((position) => {
      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });
    });
  };
  
  const calculateRoute = async () => {
    if (!userLocation || !farmLocation) return;
    
    const routeData = await getRoute(userLocation, farmLocation, 'car');
    setRoute(routeData);
  };
  
  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 bg-white shadow">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for a farm..."
          className="border p-2 rounded mr-2"
        />
        <button onClick={searchFarm} className="bg-blue-500 text-white px-4 py-2 rounded">
          Search
        </button>
        <button onClick={getMyLocation} className="bg-green-500 text-white px-4 py-2 rounded ml-2">
          My Location
        </button>
        <button onClick={calculateRoute} className="bg-purple-500 text-white px-4 py-2 rounded ml-2">
          Get Directions
        </button>
        
        {route && (
          <div className="mt-2">
            <p>Distance: {formatDistance(route.distance)}</p>
            <p>Time: {formatTime(route.time)}</p>
          </div>
        )}
      </div>
      
      <MapContainer
        center={[-1.286389, 36.817223]}
        zoom={13}
        className="flex-1"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {userLocation && <Marker position={[userLocation.lat, userLocation.lng]} />}
        {farmLocation && <Marker position={[farmLocation.lat, farmLocation.lng]} />}
        
        {route && (
          <Polyline
            positions={route.points.map(p => [p.lat, p.lng])}
            pathOptions={{ color: 'blue', weight: 4 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
```

---

## Tips & Best Practices

1. **Cache Results**: Store geocoding results to avoid repeated API calls
2. **Debounce Search**: Wait for user to finish typing before searching
3. **Handle Errors**: Always provide fallback behavior
4. **Show Loading States**: Indicate when API calls are in progress
5. **Validate Coordinates**: Ensure lat/lng are within valid ranges
6. **Optimize Rendering**: Use React.memo for expensive components
7. **Monitor API Usage**: Track requests to stay within rate limits

---

For more examples, see:
- `GRAPHHOPPER_GUIDE.md` - Full documentation
- `IMPLEMENTATION_SUMMARY.md` - Architecture details
- `QUICK_START.md` - Getting started guide
