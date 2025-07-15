"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Navigation, MapPin, Plane, Car } from "lucide-react"

interface RouteData {
  id: string
  name: string
  distance: number
  bearing: number
  coordinates: [number, number][]
  estimatedTime: string
  type: "direct" | "realistic"
}

interface RouteListProps {
  routes: RouteData[]
}

export default function RouteList({ routes }: RouteListProps) {
  const getDirectionName = (bearing: number): string => {
    const directions = ["Nord", "Nordost", "Ost", "Südost", "Süd", "Südwest", "West", "Nordwest"]
    const index = Math.round(bearing / 45) % 8
    return directions[index]
  }

  const directRoutes = routes.filter((r) => r.type === "direct")
  const realisticRoutes = routes.filter((r) => r.type === "realistic")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="h-5 w-5" />
          Berechnete Routen ({routes.length})
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
                    className="flex items-center justify-between p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-0.5 bg-blue-600 border-t-2 border-dashed border-blue-600"></div>
                      <div>
                        <div className="font-medium text-sm">Route {index + 1}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {getDirectionName(route.bearing)} ({route.bearing}°)
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <Badge variant="secondary" className="mb-1 bg-blue-100 text-blue-800">
                        {route.distance} km
                      </Badge>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {route.estimatedTime}
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
                <Car className="h-4 w-4" />
                Realistische Routen ({realisticRoutes.length})
              </h4>
              <div className="space-y-2">
                {realisticRoutes.map((route, index) => (
                  <div
                    key={route.id}
                    className="flex items-center justify-between p-2 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-1 bg-green-600 rounded"></div>
                      <div>
                        <div className="font-medium text-sm">Route {index + 1}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {getDirectionName(route.bearing)} ({route.bearing}°)
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <Badge variant="secondary" className="mb-1 bg-green-100 text-green-800">
                        {route.distance} km
                      </Badge>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {route.estimatedTime}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {routes.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <Navigation className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Keine Routen berechnet</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
