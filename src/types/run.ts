import type { Timestamp } from 'firebase/firestore'

export type RunStatus = 'RUNNING' | 'PAUSED' | 'FINISHED'

/**
 * 最新位置情報（Firestore: runs.latestLocation）
 */
export interface LatestLocation {
  latitude: number
  longitude: number
  timestamp: Timestamp | null
  speedMps?: number | null
}

/**
 * ランセッション（Firestore: runs）
 */
export interface RunSession {
  id: string
  eventId: string
  userId: string
  userName: string
  userPhotoUrl?: string | null
  status: RunStatus
  startedAt: Timestamp | null
  finishedAt: Timestamp | null
  latestLocation: LatestLocation | null
  totalDistanceMeters: number
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}
