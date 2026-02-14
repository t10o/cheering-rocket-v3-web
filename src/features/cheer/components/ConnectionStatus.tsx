import { useEffect, useState } from 'react'
import type { Timestamp } from 'firebase/firestore'
import { formatRelativeTime } from '../../../utils/format'

interface ConnectionStatusProps {
  loading: boolean
  error: Error | null
  lastUpdatedAt?: Timestamp | null
}

/**
 * 接続状態を表示するコンポーネント
 */
export function ConnectionStatus({ loading, error, lastUpdatedAt }: ConnectionStatusProps) {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (error || !isOnline) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-600 text-white text-sm px-3 py-2 rounded-xl shadow-lg">
        <p className="font-medium">接続不安定</p>
        <p className="text-xs opacity-90 mt-0.5">
          {error?.message ?? 'オフラインのため更新が止まっています'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-xs underline hover:no-underline"
        >
          再読み込み
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 bg-slate-900 text-white text-sm px-3 py-2 rounded-full shadow-lg flex items-center gap-2">
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          loading ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-400'
        }`}
      />
      <span>{loading ? '更新中' : '閲覧中'}</span>
      {!loading && lastUpdatedAt && (
        <span className="text-xs text-slate-300">
          {formatRelativeTime(lastUpdatedAt)}
        </span>
      )}
    </div>
  )
}
