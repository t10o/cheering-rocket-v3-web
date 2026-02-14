import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { getFirestoreInstance } from '../services/firebase'
import type { EventMember, InvitationStatus } from '../types'

interface UseEventMembersState {
  members: EventMember[]
  loading: boolean
  error: Error | null
}

/**
 * イベントの参加メンバー（承認済み）を監視する
 */
export function useEventMembers(shareToken: string): UseEventMembersState {
  const [state, setState] = useState<UseEventMembersState>({
    members: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!shareToken) {
      setState({
        members: [],
        loading: false,
        error: null,
      })
      return
    }

    const db = getFirestoreInstance()
    const membersRef = collection(db, 'publicEvents', shareToken, 'members')

    const unsubscribe = onSnapshot(
      membersRef,
      (snapshot) => {
        const members = snapshot.docs
          .map((doc) => {
          const data = doc.data()
          const status = (data.status as InvitationStatus) ?? 'ACCEPTED'
          return {
            userId: (data.userId as string) ?? '',
            displayName: (data.displayName as string) ?? '名前なし',
            status: ['PENDING', 'ACCEPTED', 'REJECTED'].includes(status) ? status : 'ACCEPTED',
            photoUrl: null,
          } satisfies EventMember
        })
          .filter((member) => member.status === 'ACCEPTED')

        setState({ members, loading: false, error: null })
      },
      (error) => {
        setState({ members: [], loading: false, error: error as Error })
      }
    )

    return () => unsubscribe()
  }, [shareToken])

  return state
}
