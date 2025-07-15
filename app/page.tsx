"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Route, Settings, Download, Bike, Mountain, Target, Github, ExternalLink } from "lucide-react"
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

  const geocodeLocation = async (location: string): Promise<[number, number]> => {
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const input = location.toLowerCase().trim()

    // Koordinaten-Eingabe erkennen (z.B. "52.52, 13.405" oder "52.52,13.405")
    const coordMatch = input.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/)
    if (coordMatch) {
      const lat = Number.parseFloat(coordMatch[1])
      const lng = Number.parseFloat(coordMatch[2])
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return [lat, lng]
      }
    }

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
      duisburg: [51.4344, 6.7623],
      bochum: [51.4818, 7.2162],
      wuppertal: [51.2562, 7.1508],
      bielefeld: [52.0302, 8.5325],
      bonn: [50.7374, 7.0982],
      münster: [51.9607, 7.6261],
      karlsruhe: [49.0069, 8.4037],
      mannheim: [49.4875, 8.466],
      augsburg: [48.3705, 10.8978],
      wiesbaden: [50.0782, 8.2398],
      gelsenkirchen: [51.5177, 7.0857],
      mönchengladbach: [51.1805, 6.4428],
      braunschweig: [52.2689, 10.5268],
      chemnitz: [50.8278, 12.9214],
      kiel: [54.3233, 10.1228],
      aachen: [50.7753, 6.0839],
      halle: [51.4969, 11.9695],
      magdeburg: [52.1205, 11.6276],
      freiburg: [47.999, 7.8421],
      krefeld: [51.3388, 6.5853],
      lübeck: [53.8655, 10.6866],
      oberhausen: [51.4963, 6.8516],
      erfurt: [50.9848, 11.0299],
      mainz: [49.9929, 8.2473],
      rostock: [54.0887, 12.1432],
      kassel: [51.3127, 9.4797],
      hagen: [51.367, 7.4637],
      potsdam: [52.3906, 13.0645],
      saarbrücken: [49.2401, 6.9969],
      hamm: [51.6806, 7.8142],
      mülheim: [51.4266, 6.8828],
      ludwigshafen: [49.4774, 8.4451],
      leverkusen: [51.0353, 6.9804],
      oldenburg: [53.1435, 8.2146],
      osnabrück: [52.2799, 8.0472],
      solingen: [51.1657, 7.0678],
      heidelberg: [49.3988, 8.6724],
      herne: [51.5386, 7.2221],
      neuss: [51.2048, 6.6963],
      darmstadt: [49.8728, 8.6512],
      paderborn: [51.7189, 8.7575],
      regensburg: [49.0134, 12.1016],
      ingolstadt: [48.7665, 11.4257],
      würzburg: [49.7913, 9.9534],
      fürth: [49.4771, 10.9886],
      wolfsburg: [52.4227, 10.7865],
      offenbach: [50.0955, 8.7761],
      ulm: [48.4011, 9.9876],
      heilbronn: [49.1427, 9.2109],
      pforzheim: [48.8944, 8.6954],
      göttingen: [51.5412, 9.9158],
      bottrop: [51.5216, 6.9289],
      trier: [49.7596, 6.6441],
      recklinghausen: [51.6142, 7.1969],
      reutlingen: [48.4919, 9.2041],
      bremerhaven: [53.5396, 8.5809],
      koblenz: [50.3569, 7.589],
      bergisch: [51.0315, 7.1403],
      jena: [50.9278, 11.589],
      remscheid: [51.1789, 7.1894],
      erlangen: [49.5897, 11.004],
      moers: [51.4508, 6.6407],
      siegen: [50.8749, 8.024],
      hildesheim: [52.1561, 9.9511],
      salzgitter: [52.1565, 10.4075],
    }

    // PLZ-Datenbank (Auswahl wichtiger PLZ)
    const plzMap: { [key: string]: [number, number] } = {
      // Berlin
      "10115": [52.5244, 13.4105],
      "10117": [52.5186, 13.3761],
      "10119": [52.5297, 13.4019],
      "10178": [52.517, 13.4124],
      "10179": [52.5123, 13.4107],
      "10243": [52.5065, 13.453],
      "10245": [52.5033, 13.4689],
      "10247": [52.5154, 13.4581],
      "10249": [52.5225, 13.4527],
      // München
      "80331": [48.1374, 11.5755],
      "80333": [48.1374, 11.5755],
      "80335": [48.1374, 11.5755],
      "80336": [48.1374, 11.5755],
      "80337": [48.1374, 11.5755],
      "80339": [48.1374, 11.5755],
      // Hamburg
      "20095": [53.5511, 9.9937],
      "20097": [53.5511, 9.9937],
      "20099": [53.5511, 9.9937],
      "20144": [53.5511, 9.9937],
      "20146": [53.5511, 9.9937],
      "20148": [53.5511, 9.9937],
      // Köln
      "50667": [50.9375, 6.9603],
      "50668": [50.9375, 6.9603],
      "50670": [50.9375, 6.9603],
      "50672": [50.9375, 6.9603],
      "50674": [50.9375, 6.9603],
      "50676": [50.9375, 6.9603],
      // Frankfurt
      "60306": [50.1109, 8.6821],
      "60308": [50.1109, 8.6821],
      "60311": [50.1109, 8.6821],
      "60313": [50.1109, 8.6821],
      "60314": [50.1109, 8.6821],
      "60316": [50.1109, 8.6821],
    }

    // Suche in Städten
    for (const [city, coords] of Object.entries(locationMap)) {
      if (input.includes(city)) {
        return coords
      }
    }

    // Suche in PLZ
    if (plzMap[input]) {
      return plzMap[input]
    }

    // Wenn nichts gefunden wurde
    throw new Error(
      `Ort "${location}" nicht gefunden. Versuchen Sie: Städte (Berlin, München), PLZ (10115, 80331) oder Koordinaten (52.52, 13.405)`,
    )
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
                      <div className="space-y-2">
                        <Label htmlFor="location">Manueller Startort</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="location"
                            placeholder="Stadt, PLZ oder Koordinaten (z.B. Berlin, 10115, 52.52,13.405)"
                            value={startLocation}
                            onChange={(e) => setStartLocation(e.target.value)}
                            className="pl-10"
                          />
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

        {/* Developer Footer */}
        <footer className="mt-12 border-t border-gray-200 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Entwickelt von TimInTech</span>
              </div>
              <a
                href="https://github.com/TimInTech"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
              >
                <Github className="h-4 w-4" />
                <span>GitHub</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>© 2024 Bike Route Planner</span>
              <span>•</span>
              <span>OpenStreetMap basiert</span>
              <span>•</span>
              <span>GPX Export</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
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
        </footer>
      </div>
    </div>
  )
}
