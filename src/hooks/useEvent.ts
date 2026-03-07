import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { getFirestoreInstance } from '../services/firebase'
import type { Event, EventStatus } from '../types'

interface UseEventState {
  event: Event | null
  eventId: string | null
  loading: boolean
  error: Error | null
}

/**
 * イベント情報をリアルタイムで購読するフック
 * @param eventIdOrToken 共有トークン（publicEvents/{shareToken}）
 */
export function useEvent(eventIdOrToken: string): UseEventState {
  const [state, setState] = useState<UseEventState>({
    event: null,
    eventId: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!eventIdOrToken) {
      setState({
        event: null,
        eventId: null,
        loading: false,
        error: new Error('共有トークンが指定されていません'),
      })
      return
    }

    const db = getFirestoreInstance()
    const publicEventRef = doc(db, 'publicEvents', eventIdOrToken)

    setState((prev) => ({
      ...prev,
      event: null,
      eventId: null,
      loading: true,
      error: null,
    }))

    const unsubscribe = onSnapshot(
      publicEventRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setState({
            event: null,
            eventId: null,
            loading: false,
            error: new Error(
              `公開イベントが見つかりません (publicEvents/${eventIdOrToken})`
            ),
          })
          return
        }

        const data = snapshot.data()
        const internalEventId = (data.eventId as string | undefined) ?? null
        setState({
          event: parseEvent(snapshot.id, data),
          eventId: internalEventId,
          loading: false,
          error: null,
        })
      },
      (error) => {
        setState({
          event: null,
          eventId: null,
          loading: false,
          error: error as Error,
        })
      }
    )

    return () => unsubscribe()
  }, [eventIdOrToken])

  return state
}

function parseEvent(id: string, data: Record<string, unknown>): Event {
  const status = (data.status as EventStatus | undefined) ?? 'UPCOMING'
  const eventId = (data.eventId as string | undefined) ?? id
  return {
    id: eventId,
    title: (data.title as string) ?? '',
    description: (data.description as string) ?? '',
    startDateTime: (data.startDateTime as Event['startDateTime']) ?? null,
    ownerId: (data.ownerId as string) ?? '',
    ownerName: (data.ownerName as string) ?? '',
    status: ['UPCOMING', 'RUNNING', 'FINISHED'].includes(status) ? status : 'UPCOMING',
    shareToken: id,
    createdAt: (data.createdAt as Event['createdAt']) ?? null,
    updatedAt: (data.updatedAt as Event['updatedAt']) ?? null,
  }
}
