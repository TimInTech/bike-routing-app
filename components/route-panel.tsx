"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Clock, Navigation, MapPin, Mountain, Bike, Plane } from "lucide-react"

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

interface RoutePanelProps {
  routes: BikeRoute[]
  selectedRoutes: string[]
  onToggleSelection: (routeId: string) => void
  showElevation: boolean
}

export default function RoutePanel({ routes, selectedRoutes, onToggleSelection, showElevation }: RoutePanelProps) {
  const getDirectionName = (bearing: number): string => {
    const directions = ["Nord", "Nordost", "Ost", "Südost", "Süd", "Südwest", "West", "Nordwest"]
    const index = Math.round(bearing / 45) % 8
    return directions[index]
  }

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "hard":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getDifficultyText = (difficulty: string): string => {
    switch (difficulty) {
      case "easy":
        return "Leicht"
      case "medium":
        return "Mittel"
      case "hard":
        return "Schwer"
      default:
        return difficulty
    }
  }

  const directRoutes = routes.filter((r) => r.type === "direct")
  const realisticRoutes = routes.filter((r) => r.type === "realistic")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="h-5 w-5" />
          Fahrradrouten ({routes.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {directRoutes.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-blue-600 mb-2 flex items-center gap-1">
                <Plane className="h-4 w-4" />
                Luftlinie ({directRoutes.length})
              </h4>
              <div className="space-y-2">
                {directRoutes.map((route, index) => (
                  <div
                    key={route.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      selectedRoutes.includes(route.id)
                        ? "bg-blue-50 border-blue-200"
                        : "bg-gray-50 border-gray-200 hover:bg-blue-50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          checked={selectedRoutes.includes(route.id)}
                          onCheckedChange={() => onToggleSelection(route.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-3 h-0.5 bg-blue-600 border-t-2 border-dashed border-blue-600"></div>
                            <span className="font-medium text-sm">Route {index + 1}</span>
                            <Badge variant="secondary" className={getDifficultyColor(route.difficulty)}>
                              {getDifficultyText(route.difficulty)}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                            <MapPin className="h-3 w-3" />
                            {getDirectionName(route.bearing)} ({route.bearing}°)
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1">
                              <Navigation className="h-3 w-3" />
                              {route.distance} km
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {route.estimatedTime}
                            </div>
                            {showElevation && (
                              <div className="flex items-center gap-1">
                                <Mountain className="h-3 w-3" />~{route.elevation}m
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {realisticRoutes.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-green-600 mb-2 flex items-center gap-1">
                <Bike className="h-4 w-4" />
                Fahrradrouten ({realisticRoutes.length})
              </h4>
              <div className="space-y-2">
                {realisticRoutes.map((route, index) => (
                  <div
                    key={route.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      selectedRoutes.includes(route.id)
                        ? "bg-green-50 border-green-200"
                        : "bg-gray-50 border-gray-200 hover:bg-green-50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          checked={selectedRoutes.includes(route.id)}
                          onCheckedChange={() => onToggleSelection(route.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-3 h-1 bg-green-600 rounded"></div>
                            <span className="font-medium text-sm">Route {index + 1}</span>
                            <Badge variant="secondary" className={getDifficultyColor(route.difficulty)}>
                              {getDifficultyText(route.difficulty)}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                            <MapPin className="h-3 w-3" />
                            {getDirectionName(route.bearing)} ({route.bearing}°)
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1">
                              <Navigation className="h-3 w-3" />
                              {route.distance} km
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {route.estimatedTime}
                            </div>
                            {showElevation && (
                              <div className="flex items-center gap-1">
                                <Mountain className="h-3 w-3" />
                                {route.elevation}m
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {routes.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <Bike className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Keine Routen berechnet</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
