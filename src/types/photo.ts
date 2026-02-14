import type { Timestamp } from 'firebase/firestore'

/**
 * ラン中の写真（Firestore: runs/{runId}/photos）
 */
export interface RunPhoto {
  id: string
  runId: string
  storagePath?: string
  downloadUrl: string
  latitude: number
  longitude: number
  timestamp: Timestamp | null
  caption?: string | null
}
