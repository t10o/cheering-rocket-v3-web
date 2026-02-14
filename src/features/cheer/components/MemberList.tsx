import { Button } from 'react-aria-components'
import type { Timestamp } from 'firebase/firestore'
import type { RunStatus } from '../../../types'
import { formatDistance, formatRelativeTime } from '../../../utils/format'

interface MemberSummary {
  userId: string
  displayName: string
  photoUrl?: string | null
  runStatus?: RunStatus
  lastUpdatedAt?: Timestamp | null
  totalDistanceMeters?: number | null
  color?: string
}

interface MemberListProps {
  members: MemberSummary[]
  onMemberSelect?: (userId: string) => void
  selectedMemberId?: string | null
}

/**
 * イベント参加メンバー一覧を表示するコンポーネント
 */
export function MemberList({
  members,
  onMemberSelect,
  selectedMemberId,
}: MemberListProps) {
  if (members.length === 0) {
    return (
      <div className="bg-white/80 rounded-2xl shadow-sm p-5 border border-white/60">
        <p className="text-slate-500 text-sm text-center">参加ランナーがまだいません</p>
      </div>
    )
  }

  return (
    <div className="bg-white/90 rounded-2xl shadow-sm overflow-hidden border border-white/60">
      <div className="px-4 py-3 border-b border-slate-200/70 bg-gradient-to-r from-orange-50 to-amber-50">
        <h2 className="text-sm font-semibold text-slate-900">
          参加ランナー ({members.length}人)
        </h2>
      </div>
      <ul className="divide-y divide-slate-100">
        {members.map((member) => {
          const isSelected = selectedMemberId === member.userId
          const statusLabel = member.runStatus
            ? {
                RUNNING: '走行中',
                PAUSED: '一時停止',
                FINISHED: '終了',
              }[member.runStatus]
            : '待機中'

          return (
            <li key={member.userId}>
              <Button
                onPress={() => onMemberSelect?.(member.userId)}
                className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                  isSelected ? 'bg-orange-50/80' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex-shrink-0 relative">
                  {member.photoUrl ? (
                    <img
                      src={member.photoUrl}
                      alt=""
                      className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-orange-100 flex items-center justify-center border-2 border-white shadow-sm">
                      <span className="text-orange-600 font-semibold text-sm">
                        {member.displayName.charAt(0)}
                      </span>
                    </div>
                  )}
                  {member.color && (
                    <span
                      className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
                      style={{ backgroundColor: member.color }}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {member.displayName}
                    </p>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {statusLabel}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <span>
                      最終更新: {formatRelativeTime(member.lastUpdatedAt ?? null) || '—'}
                    </span>
                    <span>・</span>
                    <span>距離 {formatDistance(member.totalDistanceMeters ?? 0)}</span>
                  </div>
                </div>
              </Button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
