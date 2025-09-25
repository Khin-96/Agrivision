import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MapPin, Navigation, AlertTriangle, Droplets, Bug, Thermometer, Eye } from 'lucide-react';

interface FarmField {
  id: string;
  name: string;
  coordinates: google.maps.LatLngLiteral[];
  area: number;
  center: google.maps.LatLngLiteral;
  ndvi?: number;
  ndwi?: number;
  temperature?: number;
  health?: 'excellent' | 'good' | 'fair' | 'poor';
  issues?: Array<{
    type: 'irrigation' | 'pests' | 'disease' | 'stress' | 'temperature';
    severity: 'low' | 'medium' | 'high';
    description: string;
    location: google.maps.LatLngLiteral;
  }>;
}

interface AnalysisResult {
  tileUrl: string;
}

const FIELD_COLORS = {
  excellent: '#22c55e',
  good: '#84cc16',
  fair: '#eab308',
  poor: '#ef4444',
  default: '#3b82f6',
};

const MAP_CENTER = { lat: -1.2921, lng: 36.8219 };
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'your-api-key-here';

// Singleton loader with stable configuration
const getGoogleMapsLoader = () => {
  if (typeof window === 'undefined') return null; // SSR safety
  
  if (!(window as any).__googleMapsLoader) {
    (window as any).__googleMapsLoader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: 'weekly',
      libraries: ['drawing', 'geometry', 'places'],
    });
  }
  return (window as any).__googleMapsLoader as Loader;
};

export default function FarmMonitor() {
  const mapRef = useRef<google.maps.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const polygonsRef = useRef<google.maps.Polygon[]>([]);
  const overlayRef = useRef<google.maps.GroundOverlay | null>(null);
  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null);
  
  const [fields, setFields] = useState<FarmField[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<'ndvi' | 'ndwi' | 'temperature' | 'rgb'>('ndvi');
  const [chatResponse, setChatResponse] = useState<string>('');
  const [highlightedFields, setHighlightedFields] = useState<string[]>([]);

  // Initialize Google Maps
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const googleMapsLoader = getGoogleMapsLoader();
    if (!googleMapsLoader) return;

    googleMapsLoader.load().then(() => {
      if (!mapContainerRef.current) return;

      const map = new google.maps.Map(mapContainerRef.current, {
        center: MAP_CENTER,
        zoom: 12,
        mapTypeId: 'satellite',
        gestureHandling: 'greedy',
      });

      mapRef.current = map;
      setMapLoaded(true);
      infoWindowRef.current = new google.maps.InfoWindow();

      // Initialize search box for city search
      const searchBoxInput = document.createElement('input');
      searchBoxInput.type = 'text';
      searchBoxInput.placeholder = 'Search for cities...';
      searchBoxInput.className = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500';
      
      searchBoxRef.current = new google.maps.places.SearchBox(searchBoxInput);
      
      // Bias the SearchBox results towards current map's viewport.
      map.addListener('bounds_changed', () => {
        if (searchBoxRef.current) {
          searchBoxRef.current.setBounds(map.getBounds() as google.maps.LatLngBounds);
        }
      });

      // Listen for the event fired when the user selects a prediction and retrieve more details
      searchBoxRef.current.addListener('places_changed', () => {
        const places = searchBoxRef.current?.getPlaces();

        if (!places || places.length === 0 || !mapRef.current) {
          return;
        }

        // For each place, get the name and location.
        const bounds = new google.maps.LatLngBounds();
        
        places.forEach(place => {
          if (!place.geometry || !place.geometry.location) {
            console.log("Returned place contains no geometry");
            return;
          }

          if (place.geometry.viewport) {
            bounds.union(place.geometry.viewport);
          } else {
            bounds.extend(place.geometry.location);
          }
        });
        
        mapRef.current.fitBounds(bounds);
        setSearchInput('');
      });

      const drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: google.maps.drawing.OverlayType.POLYGON,
        drawingControl: true,
        drawingControlOptions: {
          position: google.maps.ControlPosition.TOP_CENTER,
          drawingModes: [google.maps.drawing.OverlayType.POLYGON],
        },
        polygonOptions: {
          fillColor: FIELD_COLORS.default,
          fillOpacity: 0.3,
          strokeWeight: 2,
          strokeColor: FIELD_COLORS.default,
          clickable: true,
          editable: true,
        },
      });

      drawingManager.setMap(map);
      drawingManager.addListener('polygoncomplete', handlePolygonComplete);
    });
  }, []);

  // Handle polygon completion
  const handlePolygonComplete = useCallback((polygon: google.maps.Polygon) => {
    const path = polygon.getPath();
    const coordinates: google.maps.LatLngLiteral[] = [];
    
    for (let i = 0; i < path.getLength(); i++) {
      coordinates.push(path.getAt(i).toJSON());
    }

    // Calculate area using spherical geometry
    const area = google.maps.geometry.spherical.computeArea(path) / 10000; // Convert to hectares
    
    // Calculate center
    const bounds = new google.maps.LatLngBounds();
    coordinates.forEach(coord => bounds.extend(coord));
    const center = bounds.getCenter().toJSON();

    const newField: FarmField = {
      id: `field-${Date.now()}`,
      name: `Field ${fields.length + 1}`,
      coordinates,
      area,
      center,
    };

    setFields(prev => [...prev, newField]);
    polygonsRef.current.push(polygon);

    // Add click listener to show info
    polygon.addListener('click', (event: google.maps.PolyMouseEvent) => {
      showFieldInfo(newField, event.latLng!);
    });
  }, [fields.length]);

  // Show field information in info window
  const showFieldInfo = useCallback((field: FarmField, position: google.maps.LatLng) => {
    if (!infoWindowRef.current || !mapRef.current) return;

    const content = `
      <div class="p-2 min-w-48">
        <h3 class="font-bold text-lg">${field.name}</h3>
        <p class="text-sm">Area: ${field.area.toFixed(2)} ha</p>
        ${field.ndvi ? `<p class="text-sm">NDVI: ${field.ndvi.toFixed(3)}</p>` : ''}
        ${field.ndwi ? `<p class="text-sm">NDWI: ${field.ndwi.toFixed(3)}</p>` : ''}
        ${field.temperature ? `<p class="text-sm">Temperature: ${field.temperature.toFixed(1)}°C</p>` : ''}
        ${field.health ? `<p class="text-sm">Health: ${field.health}</p>` : ''}
      </div>
    `;

    infoWindowRef.current.setContent(content);
    infoWindowRef.current.setPosition(position);
    infoWindowRef.current.open(mapRef.current);
  }, []);

  // Run farm analysis
  const runFarmAnalysis = useCallback(async () => {
    if (!mapRef.current || fields.length === 0) return;

    setIsAnalyzing(true);
    setChatResponse('');

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate mock analysis results
      const updatedFields = fields.map(field => ({
        ...field,
        ndvi: Math.random() * 0.8, // 0-0.8
        ndwi: Math.random() * 0.6, // 0-0.6
        temperature: 20 + Math.random() * 15, // 20-35°C
        health: (() => {
          const rand = Math.random();
          if (rand > 0.7) return 'excellent';
          if (rand > 0.5) return 'good';
          if (rand > 0.3) return 'fair';
          return 'poor';
        })(),
        issues: Math.random() > 0.3 ? [] : [
          {
            type: ['irrigation', 'pests', 'disease', 'stress', 'temperature'][Math.floor(Math.random() * 5)] as any,
            severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
            description: 'Issue detected in this area',
            location: field.center,
          }
        ]
      }));

      setFields(updatedFields);

      // Update polygon colors based on health
      polygonsRef.current.forEach((polygon, index) => {
        const field = updatedFields[index];
        if (field && field.health) {
          polygon.setOptions({
            fillColor: FIELD_COLORS[field.health],
            strokeColor: FIELD_COLORS[field.health],
          });
        }
      });

      setChatResponse(`Analysis complete! Found ${updatedFields.filter(f => f.issues && f.issues.length > 0).length} fields with issues.`);
    } catch (error) {
      console.error('Analysis failed:', error);
      setChatResponse('Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [fields]);

  // Handle search
  const handleSearch = useCallback(() => {
    if (!searchInput.trim()) return;

    // Check if it's a @vision command
    if (searchInput.toLowerCase().startsWith('@vision')) {
      // Simple keyword matching for farm analysis
      const query = searchInput.toLowerCase().replace('@vision', '').trim();
      let response = '';
      let highlighted: string[] = [];

      if (query.includes('irrigation') || query.includes('water')) {
        highlighted = fields.filter(f => 
          f.issues?.some(i => i.type === 'irrigation')
        ).map(f => f.id);
        response = `Found ${highlighted.length} fields with irrigation issues.`;
        
        // Navigate to first field with irrigation issues
        if (highlighted.length > 0 && mapRef.current) {
          const firstField = fields.find(f => f.id === highlighted[0]);
          if (firstField) {
            mapRef.current.panTo(firstField.center);
            mapRef.current.setZoom(15);
            showFieldInfo(firstField, new google.maps.LatLng(firstField.center.lat, firstField.center.lng));
          }
        }
      } else if (query.includes('pest') || query.includes('infestation')) {
        highlighted = fields.filter(f => 
          f.issues?.some(i => i.type === 'pests')
        ).map(f => f.id);
        response = `Found ${highlighted.length} fields with pest issues.`;
        
        // Navigate to first field with pest issues
        if (highlighted.length > 0 && mapRef.current) {
          const firstField = fields.find(f => f.id === highlighted[0]);
          if (firstField) {
            mapRef.current.panTo(firstField.center);
            mapRef.current.setZoom(15);
            showFieldInfo(firstField, new google.maps.LatLng(firstField.center.lat, firstField.center.lng));
          }
        }
      } else if (query.includes('disease')) {
        highlighted = fields.filter(f => 
          f.issues?.some(i => i.type === 'disease')
        ).map(f => f.id);
        response = `Found ${highlighted.length} fields with disease issues.`;
        
        // Navigate to first field with disease issues
        if (highlighted.length > 0 && mapRef.current) {
          const firstField = fields.find(f => f.id === highlighted[0]);
          if (firstField) {
            mapRef.current.panTo(firstField.center);
            mapRef.current.setZoom(15);
            showFieldInfo(firstField, new google.maps.LatLng(firstField.center.lat, firstField.center.lng));
          }
        }
      } else if (query.includes('temperature')) {
        highlighted = fields.filter(f => 
          f.issues?.some(i => i.type === 'temperature') || (f.temperature && f.temperature > 30)
        ).map(f => f.id);
        response = `Found ${highlighted.length} fields with temperature issues.`;
        
        // Navigate to first field with temperature issues
        if (highlighted.length > 0 && mapRef.current) {
          const firstField = fields.find(f => f.id === highlighted[0]);
          if (firstField) {
            mapRef.current.panTo(firstField.center);
            mapRef.current.setZoom(15);
            showFieldInfo(firstField, new google.maps.LatLng(firstField.center.lat, firstField.center.lng));
          }
        }
      } else if (query.includes('poor') || query.includes('bad')) {
        highlighted = fields.filter(f => f.health === 'poor').map(f => f.id);
        response = `Found ${highlighted.length} fields in poor health.`;
        
        // Navigate to first field with poor health
        if (highlighted.length > 0 && mapRef.current) {
          const firstField = fields.find(f => f.id === highlighted[0]);
          if (firstField) {
            mapRef.current.panTo(firstField.center);
            mapRef.current.setZoom(15);
            showFieldInfo(firstField, new google.maps.LatLng(firstField.center.lat, firstField.center.lng));
          }
        }
      } else {
        response = "I can help you find fields with specific issues. Try asking about irrigation, pests, temperature, or poor health areas.";
      }

      setChatResponse(response);
      setHighlightedFields(highlighted);

      // Clear highlights after 5 seconds
      setTimeout(() => setHighlightedFields([]), 5000);
    } else {
      // Regular city search using Google Places API
      if (searchBoxRef.current) {
        searchBoxRef.current.set('query', searchInput);
        
        // Trigger search programmatically
        const places = searchBoxRef.current.getPlaces();
        if (places && places.length > 0 && mapRef.current) {
          const bounds = new google.maps.LatLngBounds();
          
          places.forEach(place => {
            if (!place.geometry || !place.geometry.location) return;
            
            if (place.geometry.viewport) {
              bounds.union(place.geometry.viewport);
            } else {
              bounds.extend(place.geometry.location);
            }
          });
          
          mapRef.current.fitBounds(bounds);
        }
      }
    }
  }, [searchInput, fields, showFieldInfo]);

  // Show satellite overlay
  const showSatelliteOverlay = useCallback((fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field || !mapRef.current) return;

    // Clear existing overlay
    if (overlayRef.current) {
      overlayRef.current.setMap(null);
    }

    // Create bounds from field coordinates
    const bounds = new google.maps.LatLngBounds();
    field.coordinates.forEach(coord => bounds.extend(coord));

    // For demo purposes, using a transparent overlay
    // In real implementation, this would be your analysis tile URL
    overlayRef.current = new google.maps.GroundOverlay(
      'https://developers.google.com/maps/documentation/javascript/examples/full/images/talkeetna.png',
      bounds,
      { opacity: 0.5 }
    );

    overlayRef.current.setMap(mapRef.current);

    // Center map on field
    mapRef.current.fitBounds(bounds);
  }, [fields]);

  return (
    <div className="w-full h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Eye className="text-green-600" size={28} />
            AI Farm Monitor
          </h1>
          <div className="flex items-center gap-2">
            <select 
              value={analysisMode}
              onChange={(e) => setAnalysisMode(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              <option value="ndvi">NDVI (Vegetation)</option>
              <option value="ndwi">NDWI (Water)</option>
              <option value="temperature">Temperature</option>
              <option value="rgb">True Color</option>
            </select>
            <button
              onClick={runFarmAnalysis}
              disabled={isAnalyzing || fields.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Thermometer size={16} />
                  Analyze Farm
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Map */}
        <div className="flex-1 relative">
          {!mapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
                <p className="text-gray-600">Loading Farm Map...</p>
              </div>
            </div>
          )}
          <div ref={mapContainerRef} className="w-full h-full" />
          
          {/* Search Bar */}
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-96 z-20">
            <div className="bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-600">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search for cities or type '@vision' to ask about your farm"
                  className="flex-1 px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-700 text-white placeholder-gray-400"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button
                  onClick={handleSearch}
                  disabled={!searchInput.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-600 flex items-center gap-2"
                >
                  Search
                </button>
              </div>
              
              {chatResponse && (
                <div className="mt-3 p-3 bg-gray-900 rounded-lg border-l-4 border-green-500">
                  <div className="flex items-start gap-2">
                    <Eye className="text-green-400 mt-0.5" size={16} />
                    <div className="flex-1">
                      <div className="text-sm text-gray-200 whitespace-pre-line">
                        {chatResponse}
                      </div>
                      {highlightedFields.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {highlightedFields.map(fieldId => {
                            const field = fields.find(f => f.id === fieldId);
                            return field ? (
                              <span key={fieldId} className="inline-flex items-center gap-1 px-2 py-1 bg-red-900 text-red-200 text-xs rounded-full">
                                <MapPin size={12} />
                                {field.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}