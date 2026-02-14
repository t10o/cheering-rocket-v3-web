import type { Timestamp } from 'firebase/firestore'

/**
 * 位置情報ログ（Firestore: runs/{runId}/locations）
 */
export interface RunLocation {
  id: string
  latitude: number
  longitude: number
  altitude?: number | null
  accuracy?: number | null
  speedMps?: number | null
  bearing?: number | null
  timestamp: Timestamp | null
  cumulativeDistance?: number | null
}

/**
 * メンバーごとのルート（表示用）
 */
export interface MemberRoute {
  runId: string
  userId: string
  displayName: string
  photoUrl?: string | null
  points: RunLocation[]
}
