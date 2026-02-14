import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { getFirestoreInstance } from '../services/firebase'
import type { LatestLocation, RunSession, RunStatus } from '../types'

interface UseRunsState {
  runs: RunSession[]
  loading: boolean
  error: Error | null
}

/**
 * イベント内のランセッションを監視する
 */
export function useRuns(shareToken: string): UseRunsState {
  const [state, setState] = useState<UseRunsState>({
    runs: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!shareToken) {
      setState({
        runs: [],
        loading: false,
        error: null,
      })
      return
    }

    const db = getFirestoreInstance()
    const runsRef = collection(db, 'publicEvents', shareToken, 'runs')

    const unsubscribe = onSnapshot(
      runsRef,
      (snapshot) => {
        const runs = snapshot.docs
          .map((doc) => parseRun(doc.id, doc.data()))
          .sort((a, b) => {
            const aTime = a.updatedAt?.seconds ?? a.createdAt?.seconds ?? 0
            const bTime = b.updatedAt?.seconds ?? b.createdAt?.seconds ?? 0
            return bTime - aTime
          })

        setState({ runs, loading: false, error: null })
      },
      (error) => {
        setState({ runs: [], loading: false, error: error as Error })
      }
    )

    return () => unsubscribe()
  }, [shareToken])

  return state
}

function parseRun(id: string, data: Record<string, unknown>): RunSession {
  const status = (data.status as RunStatus | undefined) ?? 'RUNNING'
  return {
    id,
    eventId: (data.eventId as string) ?? '',
    userId: (data.userId as string) ?? '',
    userName: (data.userName as string) ?? '名前なし',
    userPhotoUrl: (data.userPhotoUrl as string | null) ?? null,
    status: ['RUNNING', 'PAUSED', 'FINISHED'].includes(status) ? status : 'RUNNING',
    startedAt: (data.startedAt as RunSession['startedAt']) ?? null,
    finishedAt: (data.finishedAt as RunSession['finishedAt']) ?? null,
    latestLocation: parseLatestLocation(data.latestLocation as Record<string, unknown> | null),
    totalDistanceMeters: (data.totalDistanceMeters as number) ?? 0,
    createdAt: (data.createdAt as RunSession['createdAt']) ?? null,
    updatedAt: (data.updatedAt as RunSession['updatedAt']) ?? null,
  }
}

function parseLatestLocation(data: Record<string, unknown> | null): LatestLocation | null {
  if (!data) return null
  return {
    latitude: (data.latitude as number) ?? 0,
    longitude: (data.longitude as number) ?? 0,
    timestamp: (data.timestamp as LatestLocation['timestamp']) ?? null,
    speedMps: (data.speedMps as number | null) ?? null,
  }
}
