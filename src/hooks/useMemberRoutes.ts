import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore'
import { getFirestoreInstance } from '../services/firebase'
import type { MemberRoute, RunLocation, RunSession } from '../types'

interface UseMemberRoutesState {
  memberRoutes: Map<string, MemberRoute>
  loading: boolean
  error: Error | null
}

/**
 * ランごとの位置情報をリアルタイムで購読するフック
 * @param runs 監視対象のランセッション（通常はメンバーごとの最新ラン）
 * @param maxPointsPerRun 取得する最大ポイント数（パフォーマンス考慮）
 */
export function useMemberRoutes(
  shareToken: string,
  runs: RunSession[],
  maxPointsPerRun: number = 300
): UseMemberRoutesState {
  const [state, setState] = useState<UseMemberRoutesState>({
    memberRoutes: new Map(),
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!shareToken || runs.length === 0) {
      setState({ memberRoutes: new Map(), loading: false, error: null })
      return
    }

    const db = getFirestoreInstance()
    const pending = new Set(runs.map((run) => run.id))
    const routesMap = new Map<string, MemberRoute>()
    let cancelled = false
    const unsubscribers: Array<() => void> = []

    setState({ memberRoutes: new Map(), loading: true, error: null })

    runs.forEach((run) => {
      const locationsRef = collection(
        db,
        'publicEvents',
        shareToken,
        'runs',
        run.id,
        'locations'
      )
      const q = query(locationsRef, orderBy('timestamp', 'desc'), limit(maxPointsPerRun))

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const points: RunLocation[] = snapshot.docs.map((doc) =>
            parseRunLocation(doc.id, doc.data())
          )
          points.sort((a, b) => {
            const aSec = a.timestamp?.seconds ?? 0
            const bSec = b.timestamp?.seconds ?? 0
            return aSec - bSec
          })

          routesMap.set(run.userId, {
            runId: run.id,
            userId: run.userId,
            displayName: run.userName,
            photoUrl: run.userPhotoUrl ?? null,
            points,
          })

          pending.delete(run.id)
          if (!cancelled) {
            setState({
              memberRoutes: new Map(routesMap),
              loading: pending.size > 0,
              error: null,
            })
          }
        },
        (error) => {
          if (!cancelled) {
            setState({
              memberRoutes: new Map(routesMap),
              loading: false,
              error: error as Error,
            })
          }
        }
      )

      unsubscribers.push(unsubscribe)
    })

    return () => {
      cancelled = true
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [shareToken, runs, maxPointsPerRun])

  return state
}

function parseRunLocation(id: string, data: Record<string, unknown>): RunLocation {
  return {
    id,
    latitude: (data.latitude as number) ?? 0,
    longitude: (data.longitude as number) ?? 0,
    altitude: (data.altitude as number | null) ?? null,
    accuracy: (data.accuracy as number | null) ?? null,
    speedMps: (data.speedMps as number | null) ?? null,
    bearing: (data.bearing as number | null) ?? null,
    timestamp: (data.timestamp as RunLocation['timestamp']) ?? null,
    cumulativeDistance: (data.cumulativeDistance as number | null) ?? null,
  }
}
