import { useEffect, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { getFirestoreInstance } from '../services/firebase'
import type { RunPhoto, RunSession } from '../types'

interface UsePhotosState {
  photos: RunPhoto[]
  loading: boolean
  error: Error | null
}

/**
 * ラン中の写真を監視する
 */
export function usePhotos(
  shareToken: string,
  runs: RunSession[],
  maxPhotosPerRun: number = 30
): UsePhotosState {
  const [state, setState] = useState<UsePhotosState>({
    photos: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!shareToken || runs.length === 0) {
      setState({ photos: [], loading: false, error: null })
      return
    }

    const db = getFirestoreInstance()
    const pending = new Set(runs.map((run) => run.id))
    const photosByRun = new Map<string, RunPhoto[]>()
    let cancelled = false
    const unsubscribers: Array<() => void> = []

    setState({ photos: [], loading: true, error: null })

    runs.forEach((run) => {
      const photosRef = collection(
        db,
        'publicEvents',
        shareToken,
        'runs',
        run.id,
        'photos'
      )
      const q = query(photosRef, orderBy('timestamp', 'desc'), limit(maxPhotosPerRun))

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const photos = snapshot.docs.map((doc) => parsePhoto(doc.id, run.id, doc.data()))
          photosByRun.set(run.id, photos)

          pending.delete(run.id)
          if (!cancelled) {
            const merged = Array.from(photosByRun.values()).flat()
            merged.sort((a, b) => {
              const aTime = a.timestamp?.seconds ?? 0
              const bTime = b.timestamp?.seconds ?? 0
              return bTime - aTime
            })
            setState({
              photos: merged,
              loading: pending.size > 0,
              error: null,
            })
          }
        },
        (error) => {
          if (!cancelled) {
            setState({
              photos: Array.from(photosByRun.values()).flat(),
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
  }, [shareToken, runs, maxPhotosPerRun])

  return state
}

function parsePhoto(id: string, runId: string, data: Record<string, unknown>): RunPhoto {
  return {
    id,
    runId,
    storagePath: (data.storagePath as string) ?? '',
    downloadUrl: (data.downloadUrl as string) ?? '',
    latitude: (data.latitude as number) ?? 0,
    longitude: (data.longitude as number) ?? 0,
    timestamp: (data.timestamp as RunPhoto['timestamp']) ?? null,
    caption: (data.caption as string | null) ?? null,
  }
}
