import React, { useEffect, useRef, useState } from "react";
import { Stop } from "../types";
import { MapPin, ZoomIn, ZoomOut, Compass, RefreshCw } from "lucide-react";

interface InteractiveMapProps {
  stops: Stop[];
  startCity: string;
  token?: string | null;
}

// Pre-defined fallback coordinates for common Morocco logistics hubs to make rendering instant and reliable
const LOCAL_COORDINATES: Record<string, [number, number]> = {
  "casablanca": [33.5731, -7.5898],
  "maarif": [33.5898, -7.6322],
  "sidi maarouf": [33.5350, -7.6310],
  "ain sebaa": [33.6062, -7.5348],
  "derb ghallef": [33.5786, -7.6253],
  "anfa": [33.5892, -7.6596],
  "ghandi": [33.5855, -7.6610],
  "sidi belyout": [33.5950, -7.6180],
  "oulfa": [33.5580, -7.6740],
  "rabat": [34.0209, -6.8416],
  "hay riad": [33.9680, -6.8790],
  "tanger": [35.7595, -5.8340],
  "tanger free zone": [35.7190, -5.8920],
  "kenitra": [34.2610, -6.5800],
  "marrakech": [31.6295, -7.9811],
  "gueliz": [31.6340, -8.0120],
  "medina": [31.6250, -7.9890],
  "agadir": [30.4278, -9.5981],
  "fes": [34.0181, -5.0078],
  "oujda": [34.6867, -1.9114],
};

export default function InteractiveMap({ stops, startCity, token }: InteractiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  
  // Dynamic resolved coordinates for stops
  const [resolvedStops, setResolvedStops] = useState<Array<Stop & { lat: number; lng: number }>>([]);

  // 1. Inject Leaflet CDN Assets cleanly
  useEffect(() => {
    // Check if Leaflet is already loaded globally
    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    // Embed stylesheet
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    link.crossOrigin = "";
    document.head.appendChild(link);

    // Embed javascript
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
    script.crossOrigin = "";
    script.onload = () => {
      setLeafletLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      // Keep style & script alive to avoid repeat download flashes, standard in multi-view
    };
  }, []);

  // 2. Resolve coordinates using static lookup with high accuracy Nominatim OSM API fallback
  useEffect(() => {
    let active = true;

    async function geocodeStops() {
      if (stops.length === 0) {
        setResolvedStops([]);
        return;
      }

      setIsGeocoding(true);
      const outputList: Array<Stop & { lat: number; lng: number }> = [];

      for (const stop of stops) {
        const stopClean = stop.stop.toLowerCase().trim();
        let matchedCoords: [number, number] | undefined;

        // Perfect match dictionary attempt
        for (const [key, value] of Object.entries(LOCAL_COORDINATES)) {
          if (stopClean.includes(key) || key.includes(stopClean)) {
            matchedCoords = value;
            break;
          }
        }

        if (matchedCoords) {
          outputList.push({ ...stop, lat: matchedCoords[0], lng: matchedCoords[1] });
        } else {
          try {
            // Protected lookup via our backend proxy for OpenStreetMap Nominatim API
            const response = await fetch(
              `/api/geocode?q=${encodeURIComponent(
                stop.stop + ", " + (startCity || "Morocco")
              )}`,
              {
                headers: {
                  ...(token ? { "Authorization": `Bearer ${token}` } : {})
                }
              }
            );
            if (response.ok) {
              const resData = await response.json();
              if (resData && resData[0]) {
                const lat = parseFloat(resData[0].lat);
                const lon = parseFloat(resData[0].lon);
                outputList.push({ ...stop, lat, lng: lon });
                continue;
              }
            }
          } catch (e) {
            console.warn("Nominatim Geocoding proxy error, using local fallback:", e);
          }

          // Total fallback so the marker doesn't vanish: startCity coordinate base with minor deterministic offset
          const cityBase = LOCAL_COORDINATES[startCity.toLowerCase()] || LOCAL_COORDINATES["casablanca"];
          const deterministicOffsetLat = (outputList.length * 0.008) - 0.015;
          const deterministicOffsetLng = (outputList.length * 0.006) - 0.012;
          outputList.push({
            ...stop,
            lat: cityBase[0] + deterministicOffsetLat,
            lng: cityBase[1] + deterministicOffsetLng,
          });
        }
      }

      if (active) {
        setResolvedStops(outputList);
        setIsGeocoding(false);
      }
    }

    geocodeStops();
    return () => {
      active = false;
    };
  }, [stops, startCity]);

  // 3. Initialize Map & Render Markers + Polylines chronologically representing driver routes
  useEffect(() => {
    if (!leafletLoaded || !mapElementRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Get center coordinate base from start city
    const initialCenter = LOCAL_COORDINATES[startCity.toLowerCase()] || LOCAL_COORDINATES["casablanca"];

    // Destroy existing map instance to cleanly rebuild container
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Re-initialize Leaflet Map
    const map = L.map(mapElementRef.current, {
      zoomControl: false, // custom triggers or default style
      attributionControl: false,
    }).setView(initialCenter, 12);

    mapInstanceRef.current = map;

    // Use OpenStreetMap hot, beautiful cartography tiles (CartoDB Positron - elegant for Bento Grid)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 20,
    }).addTo(map);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletLoaded, startCity]);

  // 4. Update Markers & Polylines dynamically when resolvedStops changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = (window as any).L;
    if (!map || !L || resolvedStops.length === 0) return;

    // Clear old elements
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    polylinesRef.current.forEach(p => p.remove());
    polylinesRef.current = [];

    // Colors assigned per driver to distinguish vectors visually
    const driverPalette = ["#4338ca", "#b45309", "#0369a1", "#0f766e", "#6d28d9"];
    const uniqueDrivers = Array.from(new Set(resolvedStops.map(s => s.driver_name)));
    
    // Group resolved stops by driver to draw lines
    uniqueDrivers.forEach((driverName, dIdx) => {
      const driverStops = resolvedStops.filter(s => s.driver_name === driverName);
      const color = driverPalette[dIdx % driverPalette.length];

      // Build coordinates sequence
      const lineCoordinates: Array<[number, number]> = [];

      driverStops.forEach((stop, idx) => {
        lineCoordinates.push([stop.lat, stop.lng]);

        // Define a custom, high-contrast HTML marker matching bento-grid colors
        const customDivIcon = L.divIcon({
          html: `
            <div style="
              background-color: ${color};
              color: white;
              border: 2px solid white;
              border-radius: 8px;
              font-family: inherit;
              font-weight: 800;
              font-size: 11px;
              width: 24px;
              height: 24px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 10px rgba(0,0,0,0.15);
              transition: transform 0.2s ease-in-out;
            " class="hover:scale-125">
              ${idx + 1}
            </div>
          `,
          className: "",
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        // Add Leaflet Marker
        const marker = L.marker([stop.lat, stop.lng], { icon: customDivIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; padding: 4px; color: #1e293b;">
              <strong style="color: ${color}; display: block; font-size: 13px;">${stop.stop}</strong>
              <div style="margin-top: 4px;"><strong>Chauffeur:</strong> ${stop.driver_name}</div>
              <div><strong>Client:</strong> ${stop.customer_name}</div>
              <div><strong>Heure Est:</strong> ${stop.estimated_time}</div>
              <div style="margin-top: 4px; display: inline-block; padding: 2px 6px; border-radius: 4px; background: #e2e8f0; font-size: 10px; font-weight: bold;">Priority: ${stop.priority}</div>
            </div>
          `);

        markersRef.current.push(marker);
      });

      // Draw chronological route path line for the driver
      if (lineCoordinates.length > 1) {
        const polyline = L.polyline(lineCoordinates, {
          color: color,
          weight: 3,
          dashArray: "6, 6",
          opacity: 0.8,
        }).addTo(map);

        polylinesRef.current.push(polyline);
      }
    });

    // Automatically zoom and pan to encapsulate all markers with nice padding
    if (resolvedStops.length > 0) {
      const bounds = L.latLngBounds(resolvedStops.map(s => [s.lat, s.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [resolvedStops, leafletLoaded]);

  // Adjust canvas size to parent container
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    
    const resizeObserver = new ResizeObserver(() => {
      mapInstanceRef.current.invalidateSize();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [leafletLoaded]);

  return (
    <div 
      ref={containerRef}
      className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 relative flex flex-col h-[585px] overflow-hidden" 
      id="bento-osm-map"
    >
      <div className="flex items-center justify-between mb-3 z-10">
        <div>
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block flex items-center gap-1">
            <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            Cartographie OpenStreetMap
          </span>
          <h3 className="text-sm font-bold text-slate-900">Axe de Route Actif (Maroc)</h3>
        </div>
        
        {isGeocoding && (
          <div className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1.5">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>Résolution GPS...</span>
          </div>
        )}
      </div>

      <div className="flex-1 rounded-2xl overflow-hidden relative border border-slate-100 bg-slate-50 min-h-[460px]">
        {!leafletLoaded ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-xs font-semibold">Initialisation de la carte OpenStreetMap...</p>
          </div>
        ) : (
          <div ref={mapElementRef} className="w-full h-full" />
        )}
      </div>

      {resolvedStops.length === 0 && leafletLoaded && (
        <div className="absolute inset-x-5 bottom-8 z-10 bg-slate-950/95 text-white/90 text-[10.5px] p-3 rounded-xl border border-slate-800 text-center flex items-center justify-center gap-2">
          <Compass className="h-4 w-4 text-amber-400" />
          <span>Veuillez générer un plan logistique pour tracer les axes routiers en temps réel!</span>
        </div>
      )}
    </div>
  );
}
