import type { Timestamp } from 'firebase/firestore'

export type EventStatus = 'UPCOMING' | 'RUNNING' | 'FINISHED'
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'

/**
 * イベント情報（Firestore: events）
 */
export interface Event {
  id: string
  title: string
  description?: string
  startDateTime: Timestamp | null
  ownerId: string
  ownerName: string
  status: EventStatus
  shareToken: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

/**
 * イベントの参加メンバー（Firestore: eventInvitations）
 */
export interface EventMember {
  userId: string
  displayName: string
  photoUrl?: string | null
  status: InvitationStatus
}
