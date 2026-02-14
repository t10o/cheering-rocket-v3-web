import type { CheerMessage } from '../../../types'
import { formatRelativeTime } from '../../../utils/format'

interface MessageListProps {
  messages: CheerMessage[]
  loading: boolean
}

/**
 * 応援メッセージ一覧を表示するコンポーネント
 */
export function MessageList({ messages, loading }: MessageListProps) {
  if (loading) {
    return (
      <div className="bg-white/90 rounded-2xl shadow-sm p-4 border border-white/60">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="bg-white/90 rounded-2xl shadow-sm p-6 text-center border border-white/60">
        <p className="text-slate-500 text-sm">まだ応援メッセージはありません</p>
        <p className="text-slate-400 text-xs mt-1">最初の応援を送りましょう！</p>
      </div>
    )
  }

  return (
    <div className="bg-white/90 rounded-2xl shadow-sm overflow-hidden border border-white/60">
      <div className="px-4 py-3 border-b border-slate-200/70 bg-gradient-to-r from-sky-50 to-orange-50">
        <h2 className="text-sm font-semibold text-slate-900">
          応援メッセージ ({messages.length})
        </h2>
      </div>
      <ul className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
        {messages.map((message) => (
          <li key={message.id} className="px-4 py-3">
            <div className="flex gap-3">
              {/* アバター */}
              <div className="flex-shrink-0">
                {message.senderPhotoUrl ? (
                  <img
                    src={message.senderPhotoUrl}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <span className="text-orange-600 font-medium text-xs">
                      {message.senderName.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              {/* メッセージ内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-slate-900">
                    {message.senderName}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatRelativeTime(message.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-700">{message.text}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
