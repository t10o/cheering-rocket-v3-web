import type { Timestamp } from 'firebase/firestore'

/**
 * 応援メッセージ
 */
export interface CheerMessage {
  id: string
  text: string
  senderName: string
  senderPhotoUrl?: string | null
  createdAt: Timestamp | null
}

/**
 * メッセージ送信リクエスト
 */
export interface SendMessageRequest {
  shareToken: string
  text: string
  senderName: string
}
