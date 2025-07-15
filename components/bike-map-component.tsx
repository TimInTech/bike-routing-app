"use client"

import { useEffect, useRef } from "react"
import { MapPin, Loader2 } from "lucide-react"
import { Bike } from "lucide-react" // Import Bike component

interface BikeRoute {
  id: string
  name: string
  distance: number
  bearing: number
  coordinates: [number, number][]
  estimatedTime: string
  elevation: number
  type: "direct" | "realistic"
  difficulty: "easy" | "medium" | "hard"
}

interface DistanceZone {
  distance: number
  enabled: boolean
  color: string
}

interface BikeMapComponentProps {
  startCoords: [number, number] | null
  routes: BikeRoute[]
  distanceZones: DistanceZone[]
  selectedRoutes: string[]
  isLoading: boolean
}

declare global {
  interface Window {
    L: any
  }
}

export default function BikeMapComponent({
  startCoords,
  routes,
  distanceZones,
  selectedRoutes,
  isLoading,
}: BikeMapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<any>(null)
  const layersRef = useRef<any[]>([])

  useEffect(() => {
    if (typeof window !== "undefined" && !window.L) {
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      document.head.appendChild(link)

      const script = document.createElement("script")
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      script.onload = initializeMap
      document.head.appendChild(script)
    } else if (window.L && mapRef.current && !leafletMapRef.current) {
      initializeMap()
    }
  }, [])

  useEffect(() => {
    if (leafletMapRef.current && startCoords) {
      updateMap()
    }
  }, [startCoords, routes, distanceZones, selectedRoutes])

  const initializeMap = () => {
    if (!mapRef.current || leafletMapRef.current) return

    leafletMapRef.current = window.L.map(mapRef.current).setView([52.52, 13.405], 10)

    // Add OpenStreetMap tiles optimized for cycling
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(leafletMapRef.current)

    // Add cycling layer as overlay
    const cyclingLayer = window.L.tileLayer("https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors, CyclOSM",
      opacity: 0.6,
    })

    // Layer control
    const baseLayers = {
      Standard: leafletMapRef.current._layers[Object.keys(leafletMapRef.current._layers)[0]],
    }

    const overlayLayers = {
      Fahrradwege: cyclingLayer,
    }

    window.L.control.layers(baseLayers, overlayLayers).addTo(leafletMapRef.current)

    if (startCoords) {
      updateMap()
    }
  }

  const updateMap = () => {
    if (!leafletMapRef.current || !startCoords) return

    // Clear existing layers
    layersRef.current.forEach((layer) => leafletMapRef.current.removeLayer(layer))
    layersRef.current = []

    // Center map on start location
    leafletMapRef.current.setView(startCoords, 12)

    // Add distance zone circles
    distanceZones.forEach((zone) => {
      if (zone.enabled) {
        const circle = window.L.circle(startCoords, {
          radius: zone.distance * 1000, // Convert km to meters
          color: zone.color,
          fillColor: zone.color,
          fillOpacity: 0.1,
          weight: 2,
          dashArray: "5, 5",
        }).addTo(leafletMapRef.current)

        circle.bindPopup(`Entfernungszone: ${zone.distance} km`)
        layersRef.current.push(circle)
      }
    })

    // Add start marker
    const startMarker = window.L.marker(startCoords, {
      icon: window.L.divIcon({
        html: '<div style="background-color: #EF4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;"><div style="color: white; font-size: 12px; font-weight: bold;">S</div></div>',
        className: "custom-marker",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
    }).addTo(leafletMapRef.current)

    startMarker.bindPopup(`
      <div>
        <strong>🚴 Startpunkt</strong><br>
        Koordinaten: ${startCoords[0].toFixed(4)}, ${startCoords[1].toFixed(4)}
      </div>
    `)
    layersRef.current.push(startMarker)

    // Add routes
    const colors = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16", "#EF4444"]

    routes.forEach((route, index) => {
      const color = colors[index % colors.length]
      const isSelected = selectedRoutes.includes(route.id)
      const opacity = isSelected ? 1.0 : 0.6
      const weight = isSelected ? 5 : 3

      if (route.type === "direct") {
        // Draw straight line for direct routes
        const polyline = window.L.polyline(route.coordinates, {
          color: color,
          weight: weight,
          opacity: opacity,
          dashArray: "10, 10",
        }).addTo(leafletMapRef.current)

        polyline.bindPopup(`
          <div>
            <strong>🚴 ${route.name}</strong><br>
            <div style="margin: 8px 0;">
              <span style="background: #E3F2FD; padding: 2px 6px; border-radius: 4px; font-size: 12px;">Luftlinie</span>
            </div>
            📏 Entfernung: ${route.distance} km<br>
            ⏱️ Zeit: ${route.estimatedTime}<br>
            📈 Höhenmeter: ~${route.elevation}m<br>
            🎯 Schwierigkeit: ${getDifficultyText(route.difficulty)}
          </div>
        `)
        layersRef.current.push(polyline)
      } else {
        // Draw realistic bike route
        const polyline = window.L.polyline(route.coordinates, {
          color: color,
          weight: weight,
          opacity: opacity,
        }).addTo(leafletMapRef.current)

        polyline.bindPopup(`
          <div>
            <strong>🚴 ${route.name}</strong><br>
            <div style="margin: 8px 0;">
              <span style="background: #E8F5E8; padding: 2px 6px; border-radius: 4px; font-size: 12px;">Fahrradroute</span>
            </div>
            📏 Entfernung: ${route.distance} km<br>
            ⏱️ Zeit: ${route.estimatedTime}<br>
            📈 Höhenmeter: ${route.elevation}m<br>
            🎯 Schwierigkeit: ${getDifficultyText(route.difficulty)}
          </div>
        `)
        layersRef.current.push(polyline)
      }

      // Add end point marker
      const endCoords = route.coordinates[route.coordinates.length - 1]
      const endMarker = window.L.marker(endCoords, {
        icon: window.L.divIcon({
          html: `<div style="background-color: ${color}; width: 18px; height: 18px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><div style="color: white; font-size: 10px; font-weight: bold;">${index + 1}</div></div>`,
          className: "custom-marker",
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
      }).addTo(leafletMapRef.current)

      endMarker.bindPopup(`
        <div>
          <strong>🎯 Ziel ${index + 1}</strong><br>
          ${route.distance} km vom Start<br>
          ${route.estimatedTime} Fahrzeit
        </div>
      `)
      layersRef.current.push(endMarker)
    })

    // Fit map to show all content
    if (layersRef.current.length > 1) {
      const group = new window.L.featureGroup(layersRef.current)
      leafletMapRef.current.fitBounds(group.getBounds().pad(0.1))
    }
  }

  const getDifficultyText = (difficulty: string): string => {
    switch (difficulty) {
      case "easy":
        return "🟢 Leicht"
      case "medium":
        return "🟡 Mittel"
      case "hard":
        return "🔴 Schwer"
      default:
        return difficulty
    }
  }

  return (
    <div className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-[1000]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-green-600" />
            <p className="text-gray-600">Fahrradrouten werden berechnet...</p>
          </div>
        </div>
      )}

      <div ref={mapRef} className="w-full h-full">
        {!startCoords && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-50">
            <div className="text-center text-gray-500">
              <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Setzen Sie einen Startpunkt oder aktivieren Sie GPS</p>
            </div>
          </div>
        )}
      </div>

      {/* Map Legend */}
      {routes.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 max-w-xs z-[1000]">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
            <Bike className="h-4 w-4" />
            Legende
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-blue-600 border-t-2 border-dashed border-blue-600"></div>
              <span>Luftlinie</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-green-600 rounded"></div>
              <span>Fahrradroute</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 border border-gray-400 rounded" style={{ borderStyle: "dashed" }}></div>
              <span>Entfernungszone</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t text-xs text-gray-500">Klicken Sie auf Routen für Details</div>
        </div>
      )}

      {/* Distance zones info */}
      {distanceZones.some((z) => z.enabled) && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 z-[1000]">
          <h4 className="font-semibold text-sm mb-2">Aktive Zonen</h4>
          <div className="space-y-1">
            {distanceZones
              .filter((z) => z.enabled)
              .map((zone, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-3 h-3 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: zone.color }}
                  />
                  <span>{zone.distance} km</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
