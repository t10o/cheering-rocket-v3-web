import { useEffect, useMemo, useRef, useState } from 'react'
import { GoogleMap, Marker, Polyline, useJsApiLoader } from '@react-google-maps/api'
import type { MemberRoute, RunPhoto } from '../../../types'

interface MapViewProps {
  memberRoutes: MemberRoute[]
  photos: RunPhoto[]
  selectedUserId?: string | null
  colorByUserId: Map<string, string>
  onSelectUser?: (userId: string) => void
  fitKey?: string
}

const defaultCenter = { lat: 35.681, lng: 139.767 }
const defaultZoom = 12
const containerStyle = { width: '100%', height: '360px' }

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
  const [mapReady, setMapReady] = useState(false)

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey ?? '',
    mapIds: mapId ? [mapId] : undefined,
  })

  const validRoutes = useMemo(
    () =>
      memberRoutes.map((route) => ({
        ...route,
        points: route.points.filter((point) => !isZeroPoint(point)),
      })),
    [memberRoutes]
  )

  const latestPoints = useMemo(
    () =>
      validRoutes
        .map((route) => {
          const last = route.points[route.points.length - 1]
          if (!last) return null
          return {
            userId: route.userId,
            position: { lat: last.latitude, lng: last.longitude },
          }
        })
        .filter(Boolean),
    [validRoutes]
  )

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
      validRoutes.some((route) => route.points.length > 0) || photoPoints.length > 0,
    [validRoutes, photoPoints]
  )

  useEffect(() => {
    hasFitRef.current = false
  }, [fitKey])

  useEffect(() => {
    if (!mapReady || !mapRef.current || !hasAnyPoint || hasFitRef.current) return

    const bounds = new google.maps.LatLngBounds()
    validRoutes.forEach((route) => {
      route.points.forEach((point) => {
        bounds.extend({ lat: point.latitude, lng: point.longitude })
      })
    })
    photoPoints.forEach((photo) => bounds.extend(photo.position))

    if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, 40)
      hasFitRef.current = true
    }
  }, [mapReady, validRoutes, photoPoints, hasAnyPoint])

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
          {validRoutes.map((route) => {
            if (route.points.length === 0) return null
            const color = colorByUserId.get(route.userId) ?? '#FF6B35'
            const weight = selectedUserId === route.userId ? 5 : 3
            return (
              <Polyline
                key={route.userId}
                path={route.points.map((point) => ({
                  lat: point.latitude,
                  lng: point.longitude,
                }))}
                options={{
                  strokeColor: color,
                  strokeOpacity: 0.9,
                  strokeWeight: weight,
                }}
                onClick={() => onSelectUser?.(route.userId)}
              />
            )
          })}

          {latestPoints.map((point) => {
            if (!point) return null
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

function isZeroPoint(point: { latitude: number; longitude: number }) {
  return point.latitude === 0 && point.longitude === 0
}
