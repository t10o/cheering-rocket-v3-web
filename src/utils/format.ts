import type { Timestamp } from 'firebase/firestore'

export function toDate(timestamp?: Timestamp | null): Date | null {
  if (!timestamp) return null
  return new Date(timestamp.seconds * 1000)
}

export function formatRelativeTime(timestamp?: Timestamp | null): string {
  const date = toDate(timestamp)
  if (!date) return ''
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'たった今'
  if (diffMin < 60) return `${diffMin}分前`
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}時間前`
  return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
}

export function formatTime(timestamp?: Timestamp | null): string {
  const date = toDate(timestamp)
  if (!date) return ''
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(timestamp?: Timestamp | null): string {
  const date = toDate(timestamp)
  if (!date) return ''
  return date.toLocaleString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDistance(meters?: number | null): string {
  if (!meters || meters <= 0) return '0.0km'
  return `${(meters / 1000).toFixed(1)}km`
}
