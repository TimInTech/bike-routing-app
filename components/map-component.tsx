"use client"

import { useEffect, useRef } from "react"
import { MapPin, Loader2 } from "lucide-react"

interface RouteData {
  id: string
  name: string
  distance: number
  bearing: number
  coordinates: [number, number][]
  estimatedTime: string
  type: "direct" | "realistic"
}

interface MapComponentProps {
  startCoords: [number, number] | null
  routes: RouteData[]
  isLoading: boolean
}

declare global {
  interface Window {
    L: any
  }
}

export default function MapComponent({ startCoords, routes, isLoading }: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  useEffect(() => {
    // Load Leaflet CSS and JS
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
  }, [startCoords, routes])

  const initializeMap = () => {
    if (!mapRef.current || leafletMapRef.current) return

    leafletMapRef.current = window.L.map(mapRef.current).setView([52.52, 13.405], 6)

    // Add OpenStreetMap tiles
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(leafletMapRef.current)

    if (startCoords) {
      updateMap()
    }
  }

  const updateMap = () => {
    if (!leafletMapRef.current || !startCoords) return

    // Clear existing markers and routes
    markersRef.current.forEach((marker) => leafletMapRef.current.removeLayer(marker))
    markersRef.current = []

    // Center map on start location
    leafletMapRef.current.setView(startCoords, 8)

    // Add start marker
    const startMarker = window.L.marker(startCoords, {
      icon: window.L.divIcon({
        html: '<div style="background-color: #EF4444; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        className: "custom-marker",
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      }),
    }).addTo(leafletMapRef.current)

    startMarker.bindPopup("Startpunkt")
    markersRef.current.push(startMarker)

    // Add routes
    const colors = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16", "#EF4444"]

    routes.forEach((route, index) => {
      const color = colors[index % colors.length]

      if (route.type === "direct") {
        // Draw straight line for direct routes
        const polyline = window.L.polyline(route.coordinates, {
          color: color,
          weight: 3,
          opacity: 0.8,
          dashArray: "10, 10",
        }).addTo(leafletMapRef.current)

        polyline.bindPopup(`
          <div>
            <strong>${route.name}</strong><br>
            Typ: Luftlinie<br>
            Entfernung: ${route.distance} km<br>
            Geschätzte Zeit: ${route.estimatedTime}
          </div>
        `)
        markersRef.current.push(polyline)
      } else {
        // Draw curved/realistic route
        const polyline = window.L.polyline(route.coordinates, {
          color: color,
          weight: 4,
          opacity: 0.9,
        }).addTo(leafletMapRef.current)

        polyline.bindPopup(`
          <div>
            <strong>${route.name}</strong><br>
            Typ: Realistische Route<br>
            Entfernung: ${route.distance} km<br>
            Geschätzte Zeit: ${route.estimatedTime}
          </div>
        `)
        markersRef.current.push(polyline)
      }

      // Add end point marker
      const endCoords = route.coordinates[route.coordinates.length - 1]
      const endMarker = window.L.marker(endCoords, {
        icon: window.L.divIcon({
          html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          className: "custom-marker",
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        }),
      }).addTo(leafletMapRef.current)

      endMarker.bindPopup(`Ziel ${index + 1} (${route.distance} km)`)
      markersRef.current.push(endMarker)
    })

    // Fit map to show all routes
    if (routes.length > 0) {
      const group = new window.L.featureGroup(markersRef.current)
      leafletMapRef.current.fitBounds(group.getBounds().pad(0.1))
    }
  }

  return (
    <div className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-[1000]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-gray-600">Routen werden berechnet...</p>
          </div>
        </div>
      )}

      <div ref={mapRef} className="w-full h-full">
        {!startCoords && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-50">
            <div className="text-center text-gray-500">
              <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Geben Sie einen Startort ein, um die Karte zu laden</p>
            </div>
          </div>
        )}
      </div>

      {/* Route type legend */}
      {routes.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 max-w-xs z-[1000]">
          <h4 className="font-semibold text-sm mb-2">Legende</h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-blue-600" style={{ borderTop: "2px dashed" }}></div>
              <span>Luftlinie</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-green-600 rounded"></div>
              <span>Realistische Route</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
