"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Route,
  Settings,
  Download,
  Bike,
  Mountain,
  Target,
  Github,
  ExternalLink,
  Twitter,
  Linkedin,
  Youtube,
  Mail,
  Globe,
  Search,
  Loader2,
} from "lucide-react"
import BikeMapComponent from "@/components/bike-map-component"
import RoutePanel from "@/components/route-panel"
import GPXExporter from "@/components/gpx-exporter"

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

interface NominatimResult {
  lat: string
  lon: string
  display_name: string
  place_id: string
  type: string
  importance: number
}

interface GeocodingCache {
  [key: string]: {
    coords: [number, number]
    displayName: string
    timestamp: number
  }
}

interface AutocompleteSuggestion {
  display_name: string
  lat: string
  lon: string
  place_id: string
  type: string
}

export default function BikeTrackingApp() {
  const [startLocation, setStartLocation] = useState("")
  const [startCoords, setStartCoords] = useState<[number, number] | null>(null)
  const [useGPS, setUseGPS] = useState(false)
  const [distanceZones, setDistanceZones] = useState<DistanceZone[]>([
    { distance: 10, enabled: true, color: "#22C55E" },
    { distance: 25, enabled: true, color: "#3B82F6" },
    { distance: 50, enabled: false, color: "#EF4444" },
  ])
  const [customDistance, setCustomDistance] = useState("")
  const [showDirectRoutes, setShowDirectRoutes] = useState(true)
  const [showRealisticRoutes, setShowRealisticRoutes] = useState(true)
  const [showElevation, setShowElevation] = useState(true)
  const [routes, setRoutes] = useState<BikeRoute[]>([])
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [gpsError, setGpsError] = useState("")

  // Autocomplete states
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)

  // Refs
  const geocodingCacheRef = useRef<GeocodingCache>({})
  const lastRequestTimeRef = useRef<number>(0)
  const autocompleteTimeoutRef = useRef<NodeJS.Timeout>()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (useGPS) {
      getCurrentLocation()
    }
  }, [useGPS])

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError("GPS wird von diesem Browser nicht unterstützt")
      return
    }

    setIsLoading(true)
    setGpsError("")

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [position.coords.latitude, position.coords.longitude]
        setStartCoords(coords)
        setStartLocation(`GPS: ${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}`)
        setIsLoading(false)
      },
      (error) => {
        setGpsError("GPS-Position konnte nicht ermittelt werden")
        setIsLoading(false)
        setUseGPS(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  // Rate limiting für Nominatim API (max 1 request/second)
  const rateLimitedFetch = async (url: string): Promise<Response> => {
    const now = Date.now()
    const timeSinceLastRequest = now - lastRequestTimeRef.current

    if (timeSinceLastRequest < 1000) {
      await new Promise((resolve) => setTimeout(resolve, 1000 - timeSinceLastRequest))
    }

    lastRequestTimeRef.current = Date.now()

    return fetch(url, {
      headers: {
        "User-Agent": "BikeRoutePlanner/1.0 (timintech.de)",
      },
    })
  }

  // Erweiterte Geocoding-Funktion mit Nominatim API
  const geocodeLocation = async (location: string): Promise<[number, number]> => {
    const input = location.toLowerCase().trim()

    // Cache prüfen
    const cacheKey = input
    const cached = geocodingCacheRef.current[cacheKey]
    if (cached && Date.now() - cached.timestamp < 3600000) {
      // 1 Stunde Cache
      return cached.coords
    }

    // Koordinaten-Eingabe erkennen (z.B. "52.52, 13.405" oder "52.52,13.405")
    const coordMatch = input.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/)
    if (coordMatch) {
      const lat = Number.parseFloat(coordMatch[1])
      const lng = Number.parseFloat(coordMatch[2])
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return [lat, lng]
      }
    }

    try {
      // Nominatim API Anfrage
      const encodedQuery = encodeURIComponent(location)
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=1&countrycodes=de&addressdetails=1`

      const response = await rateLimitedFetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const results: NominatimResult[] = await response.json()

      if (results.length > 0) {
        const result = results[0]
        const coords: [number, number] = [Number.parseFloat(result.lat), Number.parseFloat(result.lon)]

        // Cache speichern
        geocodingCacheRef.current[cacheKey] = {
          coords,
          displayName: result.display_name,
          timestamp: Date.now(),
        }

        return coords
      }

      // Fallback auf statische Datenbank
      return await geocodeLocationFallback(location)
    } catch (error) {
      console.warn("Nominatim API Fehler:", error)

      // Fallback auf statische Datenbank
      try {
        return await geocodeLocationFallback(location)
      } catch (fallbackError) {
        throw new Error(
          `Ort "${location}" konnte nicht gefunden werden. Bitte überprüfen Sie die Eingabe oder versuchen Sie es mit einer anderen Schreibweise.`,
        )
      }
    }
  }

  // Fallback Geocoding mit statischer Datenbank
  const geocodeLocationFallback = async (location: string): Promise<[number, number]> => {
    const input = location.toLowerCase().trim()

    // Erweiterte Städte-Datenbank
    const locationMap: { [key: string]: [number, number] } = {
      // Großstädte
      berlin: [52.52, 13.405],
      münchen: [48.1351, 11.582],
      hamburg: [53.5511, 9.9937],
      köln: [50.9375, 6.9603],
      frankfurt: [50.1109, 8.6821],
      stuttgart: [48.7758, 9.1829],
      düsseldorf: [51.2277, 6.7735],
      dortmund: [51.5136, 7.4653],
      essen: [51.4556, 7.0116],
      leipzig: [51.3397, 12.3731],
      bremen: [53.0793, 8.8017],
      dresden: [51.0504, 13.7373],
      hannover: [52.3759, 9.732],
      nürnberg: [49.4521, 11.0767],
      bielefeld: [52.0302, 8.5325],
      münster: [51.9607, 7.6261],
      paderborn: [51.7189, 8.7575],
      lemgo: [52.0286, 8.8998],
      detmold: [51.9387, 8.8794],
      "bad salzuflen": [52.0864, 8.7491],
      lage: [51.9929, 8.7886],
      blomberg: [51.9439, 9.0906],
      horn: [51.8644, 8.9736],
      leopoldshöhe: [52.0167, 8.7],
      oerlinghausen: [51.9667, 8.6667],
      schieder: [51.9167, 9.1667],
      schlangen: [51.7833, 8.8333],
      augustdorf: [51.9, 8.7333],
      // Weitere Städte...
    }

    // PLZ-Datenbank (erweitert)
    const plzMap: { [key: string]: [number, number] } = {
      // Bielefeld/OWL Region
      "33602": [52.0302, 8.5325], // Bielefeld
      "33604": [52.0302, 8.5325],
      "33605": [52.0302, 8.5325],
      "33607": [52.0302, 8.5325],
      "33609": [52.0302, 8.5325],
      "33611": [52.0302, 8.5325],
      "33613": [52.0302, 8.5325],
      "33615": [52.0302, 8.5325],
      "33617": [52.0302, 8.5325],
      "33619": [52.0302, 8.5325],
      "33818": [52.0167, 8.7], // Leopoldshöhe
      "32657": [52.0286, 8.8998], // Lemgo
      "32756": [51.9387, 8.8794], // Detmold
      "32105": [52.0864, 8.7491], // Bad Salzuflen
      "32791": [51.9929, 8.7886], // Lage
      "32825": [51.9439, 9.0906], // Blomberg
      "32805": [51.8644, 8.9736], // Horn-Bad Meinberg
      "33813": [51.9667, 8.6667], // Oerlinghausen
      "32816": [51.9167, 9.1667], // Schieder-Schwalenberg
      "33189": [51.7833, 8.8333], // Schlangen
      "32832": [51.9, 8.7333], // Augustdorf

      // Berlin
      "10115": [52.5244, 13.4105],
      "10117": [52.5186, 13.3761],
      "10119": [52.5297, 13.4019],

      // München
      "80331": [48.1374, 11.5755],
      "80333": [48.1374, 11.5755],
      "80335": [48.1374, 11.5755],

      // Hamburg
      "20095": [53.5511, 9.9937],
      "20097": [53.5511, 9.9937],
      "20099": [53.5511, 9.9937],

      // Köln
      "50667": [50.9375, 6.9603],
      "50668": [50.9375, 6.9603],
      "50670": [50.9375, 6.9603],

      // Frankfurt
      "60306": [50.1109, 8.6821],
      "60308": [50.1109, 8.6821],
      "60311": [50.1109, 8.6821],
    }

    // Suche in PLZ (exakte Übereinstimmung)
    if (plzMap[input]) {
      return plzMap[input]
    }

    // Suche in Städten (Teilstring-Matching)
    for (const [city, coords] of Object.entries(locationMap)) {
      if (input.includes(city) || city.includes(input)) {
        return coords
      }
    }

    // Wenn nichts gefunden wurde
    throw new Error(`Ort "${location}" nicht in der lokalen Datenbank gefunden.`)
  }

  // Autocomplete-Funktion
  const fetchAutocompleteSuggestions = async (query: string): Promise<AutocompleteSuggestion[]> => {
    if (query.length < 3) return []

    try {
      const encodedQuery = encodeURIComponent(query)
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=5&countrycodes=de&addressdetails=1`

      const response = await rateLimitedFetch(url)

      if (!response.ok) {
        return []
      }

      const results: NominatimResult[] = await response.json()

      return results.map((result) => ({
        display_name: result.display_name,
        lat: result.lat,
        lon: result.lon,
        place_id: result.place_id,
        type: result.type,
      }))
    } catch (error) {
      console.warn("Autocomplete API Fehler:", error)
      return []
    }
  }

  // Autocomplete Handler mit Throttling
  const handleLocationInputChange = (value: string) => {
    setStartLocation(value)
    setSelectedSuggestionIndex(-1)

    // Clear existing timeout
    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current)
    }

    if (value.length >= 3) {
      setIsLoadingSuggestions(true)

      // Throttle API calls
      autocompleteTimeoutRef.current = setTimeout(async () => {
        const suggestions = await fetchAutocompleteSuggestions(value)
        setSuggestions(suggestions)
        setShowSuggestions(suggestions.length > 0)
        setIsLoadingSuggestions(false)
      }, 500) // 500ms delay
    } else {
      setSuggestions([])
      setShowSuggestions(false)
      setIsLoadingSuggestions(false)
    }
  }

  // Suggestion auswählen
  const selectSuggestion = (suggestion: AutocompleteSuggestion) => {
    setStartLocation(suggestion.display_name)
    setStartCoords([Number.parseFloat(suggestion.lat), Number.parseFloat(suggestion.lon)])
    setShowSuggestions(false)
    setSuggestions([])

    // Cache speichern
    geocodingCacheRef.current[suggestion.display_name.toLowerCase()] = {
      coords: [Number.parseFloat(suggestion.lat), Number.parseFloat(suggestion.lon)],
      displayName: suggestion.display_name,
      timestamp: Date.now(),
    }
  }

  // Keyboard Navigation für Suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
        break
      case "Enter":
        e.preventDefault()
        if (selectedSuggestionIndex >= 0) {
          selectSuggestion(suggestions[selectedSuggestionIndex])
        }
        break
      case "Escape":
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
        break
    }
  }

  const addCustomDistance = () => {
    const distance = Number.parseInt(customDistance)
    if (distance > 0 && distance <= 200) {
      const colors = ["#8B5CF6", "#EC4899", "#F59E0B", "#06B6D4"]
      const newZone: DistanceZone = {
        distance,
        enabled: true,
        color: colors[distanceZones.length % colors.length],
      }
      setDistanceZones([...distanceZones, newZone])
      setCustomDistance("")
    }
  }

  const toggleDistanceZone = (index: number) => {
    const updated = [...distanceZones]
    updated[index].enabled = !updated[index].enabled
    setDistanceZones(updated)
  }

  const removeDistanceZone = (index: number) => {
    setDistanceZones(distanceZones.filter((_, i) => i !== index))
  }

  const generateRoutes = async () => {
    if (!startCoords) {
      if (!startLocation.trim()) {
        setError("Bitte geben Sie einen Startort ein oder aktivieren Sie GPS")
        return
      }

      try {
        const coords = await geocodeLocation(startLocation)
        setStartCoords(coords)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Startort konnte nicht gefunden werden")
        return
      }
    }

    setIsLoading(true)
    setError("")

    try {
      const allRoutes: BikeRoute[] = []
      const enabledZones = distanceZones.filter((zone) => zone.enabled)

      for (const zone of enabledZones) {
        // Generate direct routes (Luftlinie)
        if (showDirectRoutes) {
          const directRoutes = await calculateDirectBikeRoutes(startCoords!, zone.distance, 8)
          allRoutes.push(...directRoutes)
        }

        // Generate realistic bike routes
        if (showRealisticRoutes) {
          const realisticRoutes = await calculateRealisticBikeRoutes(startCoords!, zone.distance, 8)
          allRoutes.push(...realisticRoutes)
        }
      }

      setRoutes(allRoutes)
    } catch (err) {
      setError("Fehler beim Berechnen der Routen. Bitte versuchen Sie es erneut.")
    } finally {
      setIsLoading(false)
    }
  }

  const calculateDirectBikeRoutes = async (
    center: [number, number],
    radius: number,
    numPoints: number,
  ): Promise<BikeRoute[]> => {
    await new Promise((resolve) => setTimeout(resolve, 800))

    const routes: BikeRoute[] = []

    for (let i = 0; i < numPoints; i++) {
      const bearing = i * (360 / numPoints)
      const endCoords = calculateDestination(center, radius, bearing)

      routes.push({
        id: `direct-bike-${radius}-${i}`,
        name: `Luftlinie ${radius}km (${bearing}°)`,
        distance: radius,
        bearing,
        coordinates: [center, endCoords],
        estimatedTime: calculateBikeTime(radius, "direct"),
        elevation: Math.round(Math.random() * 200),
        type: "direct",
        difficulty: radius < 15 ? "easy" : radius < 35 ? "medium" : "hard",
      })
    }

    return routes
  }

  const calculateRealisticBikeRoutes = async (
    center: [number, number],
    radius: number,
    numPoints: number,
  ): Promise<BikeRoute[]> => {
    await new Promise((resolve) => setTimeout(resolve, 1200))

    const routes: BikeRoute[] = []

    for (let i = 0; i < numPoints; i++) {
      const bearing = i * (360 / numPoints)
      const routeCoords = generateRealisticBikeRoute(center, radius, bearing)
      const actualDistance = Math.round(radius * (1.3 + Math.random() * 0.5)) // 30-80% longer

      routes.push({
        id: `realistic-bike-${radius}-${i}`,
        name: `Fahrradroute ${radius}km (${bearing}°)`,
        distance: actualDistance,
        bearing,
        coordinates: routeCoords,
        estimatedTime: calculateBikeTime(actualDistance, "realistic"),
        elevation: Math.round(actualDistance * (5 + Math.random() * 15)), // 5-20m per km
        type: "realistic",
        difficulty: getDifficulty(actualDistance, Math.round(actualDistance * (5 + Math.random() * 15))),
      })
    }

    return routes
  }

  const calculateDestination = (start: [number, number], distance: number, bearing: number): [number, number] => {
    const R = 6371
    const lat1 = (start[0] * Math.PI) / 180
    const lon1 = (start[1] * Math.PI) / 180
    const bearingRad = (bearing * Math.PI) / 180

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(distance / R) + Math.cos(lat1) * Math.sin(distance / R) * Math.cos(bearingRad),
    )

    const lon2 =
      lon1 +
      Math.atan2(
        Math.sin(bearingRad) * Math.sin(distance / R) * Math.cos(lat1),
        Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2),
      )

    return [(lat2 * 180) / Math.PI, (lon2 * 180) / Math.PI]
  }

  const generateRealisticBikeRoute = (
    start: [number, number],
    distance: number,
    bearing: number,
  ): [number, number][] => {
    const coords: [number, number][] = [start]
    const steps = 20 + Math.floor(Math.random() * 15)

    const endCoords = calculateDestination(start, distance, bearing)

    for (let i = 1; i < steps; i++) {
      const progress = i / steps
      const variation = 0.02 + Math.random() * 0.03 // More variation for bike routes
      const lat = start[0] + (endCoords[0] - start[0]) * progress + (Math.random() - 0.5) * variation
      const lng = start[1] + (endCoords[1] - start[1]) * progress + (Math.random() - 0.5) * variation
      coords.push([lat, lng])
    }

    coords.push(endCoords)
    return coords
  }

  const calculateBikeTime = (distance: number, type: "direct" | "realistic"): string => {
    const avgSpeed = type === "direct" ? 25 : 18 // km/h
    const hours = distance / avgSpeed

    if (hours < 1) {
      return `${Math.round(hours * 60)} Min`
    } else {
      const h = Math.floor(hours)
      const m = Math.round((hours - h) * 60)
      return `${h}h ${m}m`
    }
  }

  const getDifficulty = (distance: number, elevation: number): "easy" | "medium" | "hard" => {
    const elevationPerKm = elevation / distance
    if (distance < 20 && elevationPerKm < 10) return "easy"
    if (distance < 40 && elevationPerKm < 20) return "medium"
    return "hard"
  }

  const toggleRouteSelection = (routeId: string) => {
    setSelectedRoutes((prev) => (prev.includes(routeId) ? prev.filter((id) => id !== routeId) : [...prev, routeId]))
  }

  const filteredRoutes = routes.filter((route) => {
    if (route.type === "direct" && !showDirectRoutes) return false
    if (route.type === "realistic" && !showRealisticRoutes) return false
    return true
  })

  // Social Media Links für TimInTech
  const socialLinks = [
    {
      name: "GitHub",
      url: "https://github.com/TimInTech",
      icon: Github,
      color: "hover:bg-gray-800",
      bgColor: "bg-gray-900",
    },
    {
      name: "LinkedIn",
      url: "https://linkedin.com/in/timintech",
      icon: Linkedin,
      color: "hover:bg-blue-700",
      bgColor: "bg-blue-600",
    },
    {
      name: "Twitter",
      url: "https://twitter.com/TimInTech",
      icon: Twitter,
      color: "hover:bg-sky-600",
      bgColor: "bg-sky-500",
    },
    {
      name: "YouTube",
      url: "https://youtube.com/@TimInTech",
      icon: Youtube,
      color: "hover:bg-red-700",
      bgColor: "bg-red-600",
    },
    {
      name: "Website",
      url: "https://timintech.dev",
      icon: Globe,
      color: "hover:bg-green-700",
      bgColor: "bg-green-600",
    },
    {
      name: "E-Mail",
      url: "mailto:contact@timintech.dev",
      icon: Mail,
      color: "hover:bg-orange-700",
      bgColor: "bg-orange-600",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
            <Bike className="h-8 w-8 text-green-600" />
            Bike Route Planner
          </h1>
          <p className="text-lg text-gray-600">Entdecke Fahrradrouten mit Luftlinie und realistischer Wegberechnung</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Control Panel */}
          <div className="lg:col-span-1">
            <Tabs defaultValue="settings" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="settings">
                  <Settings className="h-4 w-4 mr-1" />
                  Einstellungen
                </TabsTrigger>
                <TabsTrigger value="export">
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </TabsTrigger>
              </TabsList>

              <TabsContent value="settings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Startpunkt
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="gps">GPS verwenden</Label>
                      <Switch id="gps" checked={useGPS} onCheckedChange={setUseGPS} />
                    </div>

                    {!useGPS && (
                      <div className="space-y-2 relative">
                        <Label htmlFor="location">Startort eingeben</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            ref={inputRef}
                            id="location"
                            placeholder="z.B. 33818 Leopoldshöhe, Lemgo, Bielefeld Oldentruper Str. 15"
                            value={startLocation}
                            onChange={(e) => handleLocationInputChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            className="pl-10 pr-10"
                          />
                          {isLoadingSuggestions && (
                            <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />
                          )}
                        </div>

                        {/* Autocomplete Suggestions */}
                        {showSuggestions && suggestions.length > 0 && (
                          <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {suggestions.map((suggestion, index) => (
                              <div
                                key={suggestion.place_id}
                                className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                                  index === selectedSuggestionIndex ? "bg-blue-50 border-l-2 border-blue-500" : ""
                                }`}
                                onClick={() => selectSuggestion(suggestion)}
                              >
                                <div className="font-medium text-sm text-gray-900 truncate">
                                  {suggestion.display_name.split(",")[0]}
                                </div>
                                <div className="text-xs text-gray-500 truncate">{suggestion.display_name}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="text-xs text-gray-500">
                          💡 Tipp: Geben Sie Städte, PLZ oder Adressen ein (z.B. "33818", "Lemgo", "Bielefeld
                          Hauptbahnhof")
                        </div>
                      </div>
                    )}

                    {gpsError && <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{gpsError}</div>}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Entfernungszonen</CardTitle>
                    <CardDescription>Mehrere Distanzen gleichzeitig anzeigen</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {distanceZones.map((zone, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: zone.color }} />
                            <span className="text-sm font-medium">{zone.distance} km</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={zone.enabled}
                              onCheckedChange={() => toggleDistanceZone(index)}
                              size="sm"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDistanceZone(index)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        placeholder="km"
                        value={customDistance}
                        onChange={(e) => setCustomDistance(e.target.value)}
                        type="number"
                        min="1"
                        max="200"
                        className="flex-1"
                      />
                      <Button onClick={addCustomDistance} size="sm">
                        +
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Routenoptionen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-0.5 bg-blue-600 border-t-2 border-dashed border-blue-600"></div>
                          <span className="text-sm">Luftlinie</span>
                        </div>
                        <Switch checked={showDirectRoutes} onCheckedChange={setShowDirectRoutes} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-1 bg-green-600 rounded"></div>
                          <span className="text-sm">Fahrradrouten</span>
                        </div>
                        <Switch checked={showRealisticRoutes} onCheckedChange={setShowRealisticRoutes} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mountain className="h-4 w-4 text-gray-600" />
                          <span className="text-sm">Höhenmeter anzeigen</span>
                        </div>
                        <Switch checked={showElevation} onCheckedChange={setShowElevation} />
                      </div>
                    </div>

                    <Button onClick={generateRoutes} disabled={isLoading} className="w-full" size="lg">
                      <Route className="mr-2 h-4 w-4" />
                      {isLoading ? "Berechne Routen..." : "Routen Generieren"}
                    </Button>

                    {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">{error}</div>}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="export">
                <GPXExporter routes={routes.filter((r) => selectedRoutes.includes(r.id))} startCoords={startCoords} />
              </TabsContent>
            </Tabs>

            {filteredRoutes.length > 0 && (
              <div className="mt-4">
                <RoutePanel
                  routes={filteredRoutes}
                  selectedRoutes={selectedRoutes}
                  onToggleSelection={toggleRouteSelection}
                  showElevation={showElevation}
                />
              </div>
            )}
          </div>

          {/* Map */}
          <div className="lg:col-span-3">
            <Card className="h-[700px]">
              <CardContent className="p-0 h-full">
                <BikeMapComponent
                  startCoords={startCoords}
                  routes={filteredRoutes}
                  distanceZones={distanceZones}
                  selectedRoutes={selectedRoutes}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Enhanced Developer Footer with Social Media */}
        <footer className="mt-12 border-t border-gray-200 pt-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* Developer Info */}
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="text-center md:text-left">
                <div className="text-lg font-semibold text-gray-900 mb-1">Entwickelt von TimInTech</div>
                <div className="text-sm text-gray-600">Full-Stack Developer & Tech Enthusiast</div>
              </div>
            </div>

            {/* Social Media Links */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {socialLinks.map((social) => {
                const IconComponent = social.icon
                return (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 px-3 py-2 ${social.bgColor} text-white rounded-lg ${social.color} transition-colors text-sm group`}
                    title={`${social.name} - TimInTech`}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span className="hidden sm:inline">{social.name}</span>
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                )
              })}
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>© 2024 Bike Route Planner</span>
                <span>•</span>
                <span>OpenStreetMap basiert</span>
                <span>•</span>
                <span>Nominatim API</span>
                <span>•</span>
                <span>GPX Export</span>
                <span>•</span>
                <span>Open Source</span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-gray-400">
                <span>🚴 Fahrradrouten</span>
                <span>•</span>
                <span>🗺️ OpenStreetMap</span>
                <span>•</span>
                <span>📍 GPS Integration</span>
                <span>•</span>
                <span>📁 GPX Export</span>
                <span>•</span>
                <span>🎯 Luftlinie & Realistische Routen</span>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <div className="text-xs text-gray-500">
              <span>Fragen oder Feedback? </span>
              <a href="mailto:contact@timintech.dev" className="text-blue-600 hover:text-blue-800 underline">
                Kontaktiere TimInTech
              </a>
              <span> oder besuche das </span>
              <a
                href="https://github.com/TimInTech"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                GitHub Profil
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
