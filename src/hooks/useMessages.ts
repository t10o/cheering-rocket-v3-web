import { useState, useEffect, useCallback } from 'react'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
} from 'firebase/firestore'
import { getFirestoreInstance } from '../services/firebase'
import { sendCheerMessage as sendCheerMessageApi } from '../services/api/cheer'
import type { CheerMessage } from '../types'

interface UseMessagesState {
  messages: CheerMessage[]
  loading: boolean
  error: Error | null
  sending: boolean
  sendError: Error | null
}

interface UseMessagesReturn extends UseMessagesState {
  sendMessage: (text: string, senderName: string) => Promise<void>
}

/**
 * 応援メッセージをリアルタイムで購読し、送信機能を提供するフック
 * @param shareToken 共有トークン（publicEvents/{shareToken}）
 * @param maxMessages 取得する最大メッセージ数
 */
export function useMessages(shareToken: string, maxMessages: number = 100): UseMessagesReturn {
  const [state, setState] = useState<UseMessagesState>({
    messages: [],
    loading: true,
    error: null,
    sending: false,
    sendError: null,
  })

  useEffect(() => {
    if (!shareToken) {
      setState((prev) => ({
        ...prev,
        messages: [],
        loading: false,
        error: null,
      }))
      return
    }

    const db = getFirestoreInstance()
    const messagesRef = collection(db, 'publicEvents', shareToken, 'messages')
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(maxMessages))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const messages: CheerMessage[] = snapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            senderName: (data.senderName as string) ?? '匿名',
            senderPhotoUrl: (data.senderPhotoUrl as string | null) ?? null,
            text: (data.text as string) ?? '',
            createdAt: (data.createdAt as CheerMessage['createdAt']) ?? null,
          }
        })

        setState((prev) => ({
          ...prev,
          messages,
          loading: false,
          error: null,
        }))
      },
      (error) => {
        setState((prev) => ({
          ...prev,
          messages: [],
          loading: false,
          error: error as Error,
        }))
      }
    )

    return () => unsubscribe()
  }, [shareToken, maxMessages])

  /**
   * 応援メッセージを送信
   */
  const sendMessage = useCallback(
    async (text: string, senderName: string) => {
      if (!shareToken) {
        throw new Error('共有トークンが指定されていません')
      }

      if (!text.trim()) {
        throw new Error('メッセージを入力してください')
      }

      if (!senderName.trim()) {
        throw new Error('名前を入力してください')
      }

      setState((prev) => ({ ...prev, sending: true, sendError: null }))

      try {
        await sendCheerMessageApi({
          shareToken,
          text: text.trim(),
          senderName: senderName.trim(),
        })

        setState((prev) => ({ ...prev, sending: false, sendError: null }))
      } catch (error) {
        setState((prev) => ({
          ...prev,
          sending: false,
          sendError: error as Error,
        }))
        throw error
      }
    },
    [shareToken]
  )

  return { ...state, sendMessage }
}
