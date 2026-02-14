import { httpsCallable } from 'firebase/functions'
import { getFunctionsInstance } from '../firebase'

interface SendCheerMessageRequest {
  shareToken: string
  text: string
  senderName: string
}

interface SendCheerMessageResponse {
  ok: boolean
}

export async function sendCheerMessage(request: SendCheerMessageRequest): Promise<void> {
  const functions = getFunctionsInstance()
  const callable = httpsCallable<SendCheerMessageRequest, SendCheerMessageResponse>(
    functions,
    'sendCheerMessage'
  )
  await callable(request)
}
