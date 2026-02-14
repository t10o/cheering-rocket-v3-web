import type { Event } from '../../../types'
import { formatDateTime } from '../../../utils/format'

interface EventHeaderProps {
  event: Event
  memberCount: number
  lastUpdatedAt: Date | null
}

/**
 * イベントのヘッダー情報を表示するコンポーネント
 */
export function EventHeader({ event, memberCount, lastUpdatedAt }: EventHeaderProps) {
  const statusLabel = {
    UPCOMING: '開始前',
    RUNNING: '開催中',
    FINISHED: '終了',
  }[event.status]

  const statusColor = {
    UPCOMING: 'bg-amber-100 text-amber-800',
    RUNNING: 'bg-emerald-100 text-emerald-800',
    FINISHED: 'bg-slate-100 text-slate-700',
  }[event.status]

  return (
    <header className="bg-white/90 shadow-sm border-b border-white/60 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-orange-500 uppercase">
              Cheering Rocket
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              {event.title}
            </h1>
            {event.description && (
              <p className="mt-2 text-sm text-slate-600">{event.description}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className={`px-3 py-1 rounded-full font-semibold ${statusColor}`}>
                {statusLabel}
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600">
                開始 {formatDateTime(event.startDateTime) || '未設定'}
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600">
                参加 {memberCount}人
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-600 space-y-1">
            <div>主催: {event.ownerName || '—'}</div>
            <div>
              最新更新: {lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
              }) : '—'}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
