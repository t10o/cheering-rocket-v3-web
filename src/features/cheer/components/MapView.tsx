import { useEffect, useMemo, useRef, useState } from 'react'
import { GoogleMap, Marker, Polyline, useJsApiLoader } from '@react-google-maps/api'
import type { MemberRoute, RunLocation, RunPhoto } from '../../../types'

interface MapViewProps {
  memberRoutes: MemberRoute[]
  photos: RunPhoto[]
  selectedUserId?: string | null
  colorByUserId: Map<string, string>
  onSelectUser?: (userId: string) => void
  fitKey?: string
}

type LatLng = { lat: number; lng: number }
type RenderRoute = MemberRoute & {
  points: RunLocation[]
  displayPaths: LatLng[][]
}

const defaultCenter = { lat: 35.681, lng: 139.767 }
const defaultZoom = 12
const containerStyle = { width: '100%', height: '360px' }
const MAX_ROADS_POINTS_PER_REQUEST = 100
const ROADS_CHUNK_STEP = MAX_ROADS_POINTS_PER_REQUEST - 1

export function MapView({
  memberRoutes,
  photos,
  selectedUserId,
  colorByUserId,
  onSelectUser,
  fitKey,
}: MapViewProps) {
  const mapRef = useRef<google.maps.Map | null>(null)
  const hasFitRef = useRef(false)
  const snapCacheRef = useRef<Map<string, LatLng[][]>>(new Map())
  const [mapReady, setMapReady] = useState(false)
  const [snappedPathsByUserId, setSnappedPathsByUserId] = useState<Map<string, LatLng[][]>>(new Map())

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined
  const roadsApiKey = (import.meta.env.VITE_GOOGLE_ROADS_API_KEY as string | undefined) ?? apiKey

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey ?? '',
    mapIds: mapId ? [mapId] : undefined,
  })

  const normalizedRoutes = useMemo(
    () =>
      memberRoutes.map((route) => ({
        ...route,
        points: [...route.points]
          .filter((point) => !isZeroPoint(point))
          .sort(compareByTimestampAsc),
      })),
    [memberRoutes]
  )

  useEffect(() => {
    if (!roadsApiKey) {
      setSnappedPathsByUserId(new Map())
      return
    }

    const abortController = new AbortController()
    let active = true

    const run = async () => {
      const entries = await Promise.all(
        normalizedRoutes.map(async (route) => {
          const rawPaths = toRawPaths(route.points)
          if (rawPaths.length === 0) {
            return [route.userId, rawPaths] as const
          }

          const routeSignature = createRouteSignature(route)
          const cached = snapCacheRef.current.get(routeSignature)
          if (cached) {
            return [route.userId, cached] as const
          }

          try {
            const snapped = await snapPathsToRoads(rawPaths, roadsApiKey, abortController.signal)
            const displayPaths = snapped.length > 0 ? snapped : rawPaths
            snapCacheRef.current.set(routeSignature, displayPaths)
            return [route.userId, displayPaths] as const
          } catch {
            return [route.userId, rawPaths] as const
          }
        })
      )

      if (!active) return
      setSnappedPathsByUserId(new Map(entries))
    }

    void run()

    return () => {
      active = false
      abortController.abort()
    }
  }, [normalizedRoutes, roadsApiKey])

  const renderRoutes = useMemo<RenderRoute[]>(
    () =>
      normalizedRoutes.map((route) => ({
        ...route,
        displayPaths: snappedPathsByUserId.get(route.userId) ?? toRawPaths(route.points),
      })),
    [normalizedRoutes, snappedPathsByUserId]
  )

  const latestPoints = useMemo(() => {
    const points: Array<{ userId: string; position: LatLng }> = []
    renderRoutes.forEach((route) => {
      const last = route.points[route.points.length - 1]
      if (!last) return
      points.push({
        userId: route.userId,
        position: {
          lat: last.latitude,
          lng: last.longitude,
        },
      })
    })
    return points
  }, [renderRoutes])

  const photoPoints = useMemo(
    () =>
      photos
        .filter((photo) => !(photo.latitude === 0 && photo.longitude === 0))
        .map((photo) => ({
          id: photo.id,
          position: { lat: photo.latitude, lng: photo.longitude },
        })),
    [photos]
  )

  const hasAnyPoint = useMemo(
    () =>
      renderRoutes.some((route) => route.displayPaths.some((path) => path.length > 0)) ||
      photoPoints.length > 0,
    [renderRoutes, photoPoints]
  )

  useEffect(() => {
    hasFitRef.current = false
  }, [fitKey])

  useEffect(() => {
    if (!mapReady || !mapRef.current || !hasAnyPoint || hasFitRef.current) return

    const bounds = new google.maps.LatLngBounds()
    renderRoutes.forEach((route) => {
      route.displayPaths.forEach((path) => {
        path.forEach((point) => {
          bounds.extend(point)
        })
      })
    })
    photoPoints.forEach((photo) => bounds.extend(photo.position))

    if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, 40)
      hasFitRef.current = true
    }
  }, [mapReady, renderRoutes, photoPoints, hasAnyPoint])

  if (!apiKey) {
    return (
      <div className="bg-white/90 rounded-2xl shadow-sm border border-white/60 overflow-hidden relative">
        <div className="h-[360px] w-full flex items-center justify-center bg-gradient-to-br from-orange-50/70 to-sky-50/70">
          <div className="text-center text-slate-500">
            <div className="text-3xl mb-2">🗺️</div>
            <p className="text-sm">Google Maps APIキーが未設定です</p>
            <p className="text-xs text-slate-400 mt-1">`.env` に `VITE_GOOGLE_MAPS_API_KEY` を設定してください</p>
          </div>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="bg-white/90 rounded-2xl shadow-sm border border-white/60 overflow-hidden relative">
        <div className="h-[360px] w-full flex items-center justify-center bg-gradient-to-br from-orange-50/70 to-sky-50/70">
          <div className="text-center text-slate-500">
            <div className="text-3xl mb-2">🗺️</div>
            <p className="text-sm">地図の読み込みに失敗しました</p>
            <p className="text-xs text-slate-400 mt-1">APIキーやネットワークを確認してください</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/90 rounded-2xl shadow-sm border border-white/60 overflow-hidden relative">
      {isLoaded ? (
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={defaultCenter}
          zoom={defaultZoom}
          onLoad={(map) => {
            mapRef.current = map
            setMapReady(true)
          }}
          onUnmount={() => {
            mapRef.current = null
            setMapReady(false)
          }}
          options={{
            mapId,
            streetViewControl: false,
            fullscreenControl: false,
            mapTypeControl: false,
            zoomControl: true,
          }}
        >
          {renderRoutes.map((route) => {
            if (route.displayPaths.length === 0) return null
            const color = colorByUserId.get(route.userId) ?? '#FF6B35'
            const weight = selectedUserId === route.userId ? 5 : 3

            return route.displayPaths.map((path, index) => {
              if (path.length < 2) return null
              return (
                <Polyline
                  key={`${route.userId}-${index}`}
                  path={path}
                  options={{
                    strokeColor: color,
                    strokeOpacity: 0.9,
                    strokeWeight: weight,
                  }}
                  onClick={() => onSelectUser?.(route.userId)}
                />
              )
            })
          })}

          {latestPoints.map((point) => {
            const color = colorByUserId.get(point.userId) ?? '#FF6B35'
            const scale = selectedUserId === point.userId ? 7 : 5
            return (
              <Marker
                key={`latest-${point.userId}`}
                position={point.position}
                icon={circleIcon(color, scale)}
                onClick={() => onSelectUser?.(point.userId)}
              />
            )
          })}

          {photoPoints.map((photo) => (
            <Marker
              key={`photo-${photo.id}`}
              position={photo.position}
              icon={circleIcon('#14B8A6', 4)}
            />
          ))}
        </GoogleMap>
      ) : (
        <div className="h-[360px] w-full flex items-center justify-center bg-gradient-to-br from-orange-50/70 to-sky-50/70">
          <div className="text-center text-slate-500">
            <div className="text-3xl mb-2">🗺️</div>
            <p className="text-sm">地図を読み込み中...</p>
          </div>
        </div>
      )}

      {!hasAnyPoint && isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-orange-50/70 to-sky-50/70 pointer-events-none">
          <div className="text-center text-slate-500">
            <div className="text-3xl mb-2">🗺️</div>
            <p className="text-sm">位置情報を待っています</p>
            <p className="text-xs text-slate-400 mt-1">ラン開始後にルートが表示されます</p>
          </div>
        </div>
      )}
    </div>
  )
}

function circleIcon(color: string, scale: number): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeOpacity: 1,
    strokeWeight: 2,
  }
}

function toRawPaths(points: RunLocation[]): LatLng[][] {
  if (points.length === 0) return []
  return [
    points.map((point) => ({
      lat: point.latitude,
      lng: point.longitude,
    })),
  ]
}

async function snapPathsToRoads(paths: LatLng[][], apiKey: string, signal: AbortSignal): Promise<LatLng[][]> {
  const snapped = await Promise.all(paths.map((path) => snapPathToRoad(path, apiKey, signal)))
  return snapped.filter((path) => path.length > 0)
}

async function snapPathToRoad(path: LatLng[], apiKey: string, signal: AbortSignal): Promise<LatLng[]> {
  if (path.length <= 1) return path

  const chunks = chunkPathForRoads(path)
  const merged: LatLng[] = []

  for (const chunk of chunks) {
    const snappedChunk = await requestSnappedChunk(chunk, apiKey, signal)
    if (merged.length > 0 && snappedChunk.length > 0 && isSamePoint(merged[merged.length - 1], snappedChunk[0])) {
      merged.push(...snappedChunk.slice(1))
    } else {
      merged.push(...snappedChunk)
    }
  }

  return merged.length > 0 ? merged : path
}

function chunkPathForRoads(path: LatLng[]): LatLng[][] {
  if (path.length <= MAX_ROADS_POINTS_PER_REQUEST) {
    return [path]
  }

  const chunks: LatLng[][] = []
  for (let start = 0; start < path.length; start += ROADS_CHUNK_STEP) {
    const end = Math.min(start + MAX_ROADS_POINTS_PER_REQUEST, path.length)
    chunks.push(path.slice(start, end))
    if (end >= path.length) {
      break
    }
  }
  return chunks
}

interface RoadsApiResponse {
  snappedPoints?: Array<{
    location?: {
      latitude?: number
      longitude?: number
    }
  }>
}

async function requestSnappedChunk(chunk: LatLng[], apiKey: string, signal: AbortSignal): Promise<LatLng[]> {
  const pathValue = chunk.map((point) => `${point.lat},${point.lng}`).join('|')
  const url =
    `https://roads.googleapis.com/v1/snapToRoads?interpolate=true&path=${encodeURIComponent(pathValue)}` +
    `&key=${encodeURIComponent(apiKey)}`

  const response = await fetch(url, { method: 'GET', signal })
  if (!response.ok) {
    throw new Error(`Roads API request failed: ${response.status}`)
  }

  const payload = (await response.json()) as RoadsApiResponse
  const snapped = (payload.snappedPoints ?? [])
    .map((point) => {
      const latitude = point.location?.latitude
      const longitude = point.location?.longitude
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        return null
      }
      return { lat: latitude, lng: longitude }
    })
    .filter((point): point is LatLng => point != null)

  return snapped.length > 0 ? snapped : chunk
}

function createRouteSignature(route: MemberRoute): string {
  const last = route.points[route.points.length - 1]
  const lastSeconds = toEpochSeconds(last?.timestamp ?? null) ?? 0
  return `${route.runId}:${route.points.length}:${lastSeconds}`
}

function compareByTimestampAsc(a: RunLocation, b: RunLocation): number {
  const aTime = toEpochSeconds(a.timestamp) ?? 0
  const bTime = toEpochSeconds(b.timestamp) ?? 0
  return aTime - bTime
}

function toEpochSeconds(timestamp: RunLocation['timestamp']): number | null {
  if (!timestamp) return null
  return timestamp.seconds + timestamp.nanoseconds / 1_000_000_000
}

function isZeroPoint(point: { latitude: number; longitude: number }) {
  return point.latitude === 0 && point.longitude === 0
}

function isSamePoint(a: LatLng, b: LatLng): boolean {
  return Math.abs(a.lat - b.lat) < 0.000001 && Math.abs(a.lng - b.lng) < 0.000001
}
