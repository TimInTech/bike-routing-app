"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Download, FileText, MapPin } from "lucide-react"

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

interface GPXExporterProps {
  routes: BikeRoute[]
  startCoords: [number, number] | null
}

export default function GPXExporter({ routes, startCoords }: GPXExporterProps) {
  const [trackName, setTrackName] = useState("Bike Route")
  const [description, setDescription] = useState("")
  const [isExporting, setIsExporting] = useState(false)

  const generateGPX = (routes: BikeRoute[], name: string, desc: string): string => {
    const now = new Date().toISOString()

    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Bike Route Planner" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${name}</name>
    <desc>${desc}</desc>
    <time>${now}</time>
  </metadata>
`

    // Add waypoints for start and end points
    if (startCoords) {
      gpx += `  <wpt lat="${startCoords[0]}" lon="${startCoords[1]}">
    <name>Start</name>
    <desc>Startpunkt der Fahrradtour</desc>
    <sym>Flag, Blue</sym>
  </wpt>
`
    }

    routes.forEach((route, routeIndex) => {
      const endCoords = route.coordinates[route.coordinates.length - 1]
      gpx += `  <wpt lat="${endCoords[0]}" lon="${endCoords[1]}">
    <name>Ziel ${routeIndex + 1}</name>
    <desc>${route.name} - ${route.distance}km, ${route.estimatedTime}</desc>
    <sym>Flag, Red</sym>
  </wpt>
`
    })

    // Add tracks
    routes.forEach((route, routeIndex) => {
      gpx += `  <trk>
    <name>${route.name}</name>
    <desc>Typ: ${route.type === "direct" ? "Luftlinie" : "Fahrradroute"}, Entfernung: ${route.distance}km, Zeit: ${route.estimatedTime}, Höhenmeter: ${route.elevation}m, Schwierigkeit: ${route.difficulty}</desc>
    <type>${route.type === "direct" ? "direct" : "cycling"}</type>
    <trkseg>
`

      route.coordinates.forEach((coord, pointIndex) => {
        // Simulate elevation data
        const elevation = 100 + Math.sin((pointIndex / route.coordinates.length) * Math.PI * 2) * 50
        gpx += `      <trkpt lat="${coord[0]}" lon="${coord[1]}">
        <ele>${elevation.toFixed(1)}</ele>
        <time>${new Date(Date.now() + pointIndex * 60000).toISOString()}</time>
      </trkpt>
`
      })

      gpx += `    </trkseg>
  </trk>
`
    })

    gpx += `</gpx>`
    return gpx
  }

  const exportGPX = async () => {
    if (routes.length === 0) return

    setIsExporting(true)

    try {
      const gpxContent = generateGPX(routes, trackName, description)

      // Create and download file
      const blob = new Blob([gpxContent], { type: "application/gpx+xml" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${trackName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.gpx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error) {
      console.error("Error exporting GPX:", error)
    } finally {
      setIsExporting(false)
    }
  }

  const exportSingleRoute = async (route: BikeRoute) => {
    setIsExporting(true)

    try {
      const gpxContent = generateGPX([route], route.name, `Einzelroute: ${route.name}`)

      const blob = new Blob([gpxContent], { type: "application/gpx+xml" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${route.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.gpx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch (error) {
      console.error("Error exporting single route GPX:", error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            GPX Export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="track-name">Track Name</Label>
            <Input
              id="track-name"
              value={trackName}
              onChange={(e) => setTrackName(e.target.value)}
              placeholder="Meine Fahrradtour"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschreibung der Tour..."
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4" />
            <span>{routes.length} ausgewählte Routen</span>
          </div>

          <Button onClick={exportGPX} disabled={routes.length === 0 || isExporting} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Exportiere..." : "Alle Routen als GPX exportieren"}
          </Button>
        </CardContent>
      </Card>

      {routes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Einzelexport
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {routes.map((route) => (
                <div key={route.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium text-sm">{route.name}</div>
                    <div className="text-xs text-gray-500">
                      {route.distance}km • {route.estimatedTime}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => exportSingleRoute(route)} disabled={isExporting}>
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {routes.length === 0 && (
        <Card>
          <CardContent className="text-center py-8 text-gray-500">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Wählen Sie Routen aus, um sie zu exportieren</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
