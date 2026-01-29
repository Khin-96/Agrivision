# Quick Start Guide - GraphHopper Integration

## Setup (5 minutes)

### Step 1: Get Your GraphHopper API Key

1. Go to https://www.graphhopper.com/
2. Click "Sign Up" (free account)
3. Verify your email
4. Go to Dashboard → API Keys
5. Create a new API key
6. Copy the key

### Step 2: Update Environment Variables

Open `.env` file and replace:

```bash
NEXT_PUBLIC_GRAPHHOPPER_API_KEY=your_graphhopper_api_key_here
GRAPHHOPPER_API_KEY=your_graphhopper_api_key_here
```

With your actual key:

```bash
NEXT_PUBLIC_GRAPHHOPPER_API_KEY=paste_your_key_here
GRAPHHOPPER_API_KEY=paste_your_key_here
```

### Step 3: Install Dependencies (if needed)

```bash
npm install
```

The required packages are already in package.json:
- leaflet
- react-leaflet
- leaflet-draw

### Step 4: Run the Application

```bash
npm run dev
```

Visit: http://localhost:3000/Monitor-Farm

## Using the Map

### 1. Draw a Field

1. Click the polygon tool at the top of the map
2. Click on the map to create points
3. Complete the polygon by clicking the first point
4. The system automatically analyzes the field

### 2. Ask About Location

Open the AI chat (right side) and ask:

**Examples:**
- "Where is this farm located?"
- "What's the address of this field?"
- "Tell me about this location"

**Response includes:**
- Full address
- Coordinates
- Elevation
- Nearby landmarks

### 3. Get Directions

**Method 1: Ask the AI**
- "How do I get to this farm?"
- "Show me directions"
- "What's the best route?"

**Method 2: Use the Map**
- Click on a field polygon
- Click "Get Directions" in the popup

**What happens:**
1. Browser asks for location permission (allow it)
2. Route is calculated
3. Blue line shows the route on map
4. Side panel shows turn-by-turn directions

### 4. View Route Details

The route panel shows:
- Total distance (e.g., "5.2 km")
- Estimated time (e.g., "12 min")
- Step-by-step instructions
- Distance and time for each step

## Common Questions

### Q: Map not loading?
**A:** Make sure you're using a modern browser and have internet connection. Leaflet requires online access for map tiles.

### Q: Location not working?
**A:** 
1. Allow location access when browser prompts
2. Make sure you're on HTTPS (or localhost)
3. Check browser location settings

### Q: Routing not working?
**A:** 
1. Verify GraphHopper API key is set correctly
2. Check you have internet connection
3. Make sure coordinates are valid

### Q: API rate limit exceeded?
**A:** Free tier allows 500 requests/day. For production, consider upgrading at https://www.graphhopper.com/pricing/

## Features Overview

### Map Features
- [x] Interactive map with zoom/pan
- [x] Draw farm field boundaries
- [x] Color-coded field health
- [x] Click fields for details
- [x] User location marker

### Routing Features
- [x] Turn-by-turn navigation
- [x] Distance calculation
- [x] Time estimation
- [x] Visual route display
- [x] Multiple vehicle types

### AI Features
- [x] Location information
- [x] Direction guidance
- [x] Farm analysis
- [x] Crop recommendations
- [x] Weather information
- [x] Swahili support

## Example Conversations

### Location Query
```
You: Where is this farm located?

AI: This farm is located at [Full Address], 
near [Landmark]. The coordinates are 
[lat, lng] at an elevation of [X]m above 
sea level. The farm is situated in [Region], 
[Country]. To reach this location, you can 
use the map's routing feature to get 
turn-by-turn directions from your current 
position.
```

### Direction Query
```
You: How do I get to this farm?

AI: I can help you navigate to the farm! 
I've calculated a route from your current 
location. The distance is approximately 
5.2 km and will take about 12 minutes by 
car. You can see the detailed turn-by-turn 
directions in the route panel on the left 
side of the map. The route is displayed 
as a blue line on the map.
```

### Farm Query
```
You: How are my crops doing?

AI: Based on the analysis of your field:
- Crop Type: Maize
- Health Status: Healthy
- Soil Moisture: 32%
- pH Level: Optimal (6.5)
- Temperature: 24°C

Recommendations:
1. Continue current irrigation schedule
2. pH levels are optimal, no adjustment needed
3. Weather is favorable for growth
4. Monitor for any signs of stress

Your crops are in excellent condition!
```

## Troubleshooting

### Issue: "Please draw a field first"
**Solution:** You need to draw at least one field polygon on the map before asking questions.

### Issue: "Unable to get your location"
**Solution:** 
1. Click "Allow" when browser asks for location
2. Check browser settings → Site permissions
3. Try refreshing the page

### Issue: "Could not calculate route"
**Solution:**
1. Make sure both start and end points are valid
2. Check internet connection
3. Verify GraphHopper API key is correct

### Issue: Map tiles not loading
**Solution:**
1. Check internet connection
2. Try refreshing the page
3. Clear browser cache
4. Check browser console for errors

## Next Steps

### Customize the Map
Edit `src/app/Monitor-Farm/component/FarmMapGraphHopper.tsx`:

**Change map center:**
```typescript
const [mapCenter, setMapCenter] = useState<Coordinate>({ 
  lat: YOUR_LAT, 
  lng: YOUR_LNG 
});
```

**Change default zoom:**
```typescript
<MapContainer
  center={[mapCenter.lat, mapCenter.lng]}
  zoom={15} // Change this value
  ...
>
```

**Use different map tiles:**
```typescript
<TileLayer
  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  // Try: satellite, terrain, etc.
/>
```

### Add More Features

See `IMPLEMENTATION_SUMMARY.md` for:
- Isochrone mapping
- Multi-stop routing
- Offline maps
- Custom overlays
- Voice navigation

## Support

Need help? Check:
1. `GRAPHHOPPER_GUIDE.md` - Detailed documentation
2. `IMPLEMENTATION_SUMMARY.md` - Technical details
3. GraphHopper docs: https://docs.graphhopper.com/
4. Leaflet docs: https://leafletjs.com/

## Success Checklist

- [ ] GraphHopper API key obtained
- [ ] Environment variables updated
- [ ] Dependencies installed
- [ ] Development server running
- [ ] Map loads successfully
- [ ] Can draw fields
- [ ] Location permission granted
- [ ] Routing works
- [ ] AI responds to questions

Once all items are checked, you're ready to go!

---

**Enjoy your new GraphHopper-powered farm monitoring system!**
