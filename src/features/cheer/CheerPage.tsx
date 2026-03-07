import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  useEvent,
  useEventMembers,
  useMemberRoutes,
  useMessages,
  usePhotos,
  useRuns,
} from '../../hooks'
import {
  EventHeader,
  MapView,
  MemberList,
  MessageForm,
  MessageList,
  PhotoGallery,
  ConnectionStatus,
} from './components'
import type { Timestamp } from 'firebase/firestore'
import type { RunLocation, RunSession } from '../../types'
import { getColorForKey } from '../../utils/color'
import { toDate } from '../../utils/format'

/**
 * 応援ページ
 * /cheer/:shareToken でアクセス
 */
export function CheerPage() {
  const { shareToken: shareTokenParam } = useParams<{ shareToken: string }>()
  const shareToken = shareTokenParam ?? ''
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

  // データ購読
  const {
    event,
    loading: eventLoading,
    error: eventError,
  } = useEvent(shareToken)
  const {
    members: rawMembers,
    loading: membersLoading,
    error: membersError,
  } = useEventMembers(shareToken)
  const { runs, loading: runsLoading, error: runsError } = useRuns(shareToken)
  const latestRuns = useMemo(() => selectLatestRuns(runs), [runs])
  const {
    memberRoutes,
    loading: routesLoading,
    error: routesError,
  } = useMemberRoutes(shareToken, latestRuns)
  const { photos, loading: photosLoading, error: photosError } = usePhotos(shareToken, latestRuns)
  const {
    messages,
    loading: messagesLoading,
    error: messagesError,
    sending,
    sendError,
    sendMessage,
  } = useMessages(shareToken)

  const isLoading =
    eventLoading ||
    membersLoading ||
    runsLoading ||
    routesLoading ||
    photosLoading ||
    messagesLoading
  const hasError = eventError || membersError || runsError || routesError || photosError || messagesError

  const memberList = useMemo(() => {
    const memberMap = new Map<string, { userId: string; displayName: string; photoUrl?: string | null }>()

    if (event?.ownerName) {
      const ownerRun = runs.find((run) =>
        event.ownerId ? run.userId === event.ownerId : run.userName === event.ownerName
      )
      const ownerUserId = event.ownerId || ownerRun?.userId || `event-owner:${event.id}`

      memberMap.set(ownerUserId, {
        userId: ownerUserId,
        displayName: event.ownerName,
        photoUrl: ownerRun?.userPhotoUrl ?? null,
      })
    }

    rawMembers.forEach((member) => {
      memberMap.set(member.userId, {
        userId: member.userId,
        displayName: member.displayName,
        photoUrl: member.photoUrl ?? null,
      })
    })

    runs.forEach((run) => {
      if (!memberMap.has(run.userId)) {
        memberMap.set(run.userId, {
          userId: run.userId,
          displayName: run.userName,
          photoUrl: run.userPhotoUrl ?? null,
        })
      }
    })

    const colorMap = new Map<string, string>()
    memberMap.forEach((_, key) => {
      colorMap.set(key, getColorForKey(key))
    })

    return {
      members: Array.from(memberMap.values()).map((member) => {
        const run = latestRuns.find((item) => item.userId === member.userId)
        const route = memberRoutes.get(member.userId)
        const lastPoint = route?.points[route.points.length - 1]
        const lastUpdatedAt =
          lastPoint?.timestamp ?? run?.latestLocation?.timestamp ?? run?.updatedAt ?? null
        return {
          userId: member.userId,
          displayName: member.displayName,
          photoUrl: run?.userPhotoUrl ?? member.photoUrl ?? null,
          runStatus: run?.status,
          lastUpdatedAt,
          totalDistanceMeters: run?.totalDistanceMeters ?? 0,
          color: colorMap.get(member.userId),
        }
      }),
      colorMap,
    }
  }, [event, rawMembers, runs, latestRuns, memberRoutes])

  const mapRoutes = useMemo(() => {
    const routes = new Map(memberRoutes)
    const nameMap = new Map(memberList.members.map((member) => [member.userId, member.displayName]))
    const photoMap = new Map(memberList.members.map((member) => [member.userId, member.photoUrl]))

    latestRuns.forEach((run) => {
      const existing = routes.get(run.userId)
      if (existing) {
        routes.set(run.userId, {
          ...existing,
          displayName: nameMap.get(run.userId) ?? existing.displayName,
          photoUrl: photoMap.get(run.userId) ?? existing.photoUrl ?? null,
        })
        return
      }

      if (run.latestLocation) {
        const point: RunLocation = {
          id: `${run.id}-latest`,
          latitude: run.latestLocation.latitude,
          longitude: run.latestLocation.longitude,
          timestamp: run.latestLocation.timestamp,
        }
        routes.set(run.userId, {
          runId: run.id,
          userId: run.userId,
          displayName: nameMap.get(run.userId) ?? run.userName,
          photoUrl: photoMap.get(run.userId) ?? run.userPhotoUrl ?? null,
          points: [point],
        })
      }
    })

    return Array.from(routes.values())
  }, [memberRoutes, latestRuns, memberList.members])

  const photosForGallery = useMemo(() => {
    const runById = new Map<string, RunSession>()
    latestRuns.forEach((run) => runById.set(run.id, run))
    return photos
      .filter((photo) => photo.downloadUrl)
      .map((photo) => ({
        id: photo.id,
        url: photo.downloadUrl,
        caption: photo.caption ?? null,
        runnerName: runById.get(photo.runId)?.userName ?? 'ランナー',
        timestamp: photo.timestamp ?? null,
      }))
  }, [photos, latestRuns])

  const lastUpdatedTimestamp = useMemo(() => {
    const candidates: Array<Timestamp | null> = [
      event?.updatedAt ?? null,
      messages[0]?.createdAt ?? null,
      ...mapRoutes
        .map((route) => route.points[route.points.length - 1]?.timestamp ?? null)
        .filter(Boolean),
      ...photos.map((photo) => photo.timestamp ?? null),
    ]

    return candidates.reduce<Timestamp | null>((latest, current) => {
      if (!current) return latest
      if (!latest) return current
      return current.seconds > latest.seconds ? current : latest
    }, null)
  }, [event, messages, mapRoutes, photos])

  const lastUpdatedAtDate = lastUpdatedTimestamp ? toDate(lastUpdatedTimestamp) : null

  // イベントが見つからない場合
  if (!eventLoading && eventError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-sky-50 flex items-center justify-center p-4">
        <div className="bg-white/90 rounded-2xl shadow-sm p-6 max-w-md w-full text-center border border-white/60">
          <div className="text-4xl mb-4">😢</div>
          <h1 className="text-lg font-bold text-slate-900 mb-2">イベントを表示できません</h1>
          <p className="text-sm text-slate-600 mb-4">
            URLが正しいか確認してください。
            <br />
            イベントが終了または削除された可能性があります。
          </p>
          <p className="text-xs text-slate-500 mb-4 break-all">
            詳細: {eventError.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-orange-600 hover:text-orange-700 text-sm font-medium"
          >
            再読み込み
          </button>
        </div>
      </div>
    )
  }

  // ローディング中
  if (eventLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-sky-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent" />
          <p className="mt-3 text-sm text-slate-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!event) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-sky-50">
      {/* ヘッダー */}
      <EventHeader
        event={event}
        memberCount={memberList.members.length}
        lastUpdatedAt={lastUpdatedAtDate}
      />

      {/* メインコンテンツ */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* 左カラム: 地図 + メンバー + 写真 */}
          <div className="xl:col-span-2 space-y-6">
            <MapView
              memberRoutes={mapRoutes}
              photos={photos}
              selectedUserId={selectedMemberId}
              colorByUserId={memberList.colorMap}
              onSelectUser={setSelectedMemberId}
              fitKey={shareToken}
            />

            <MemberList
              members={memberList.members}
              selectedMemberId={selectedMemberId}
              onMemberSelect={setSelectedMemberId}
            />

            <PhotoGallery photos={photosForGallery} loading={photosLoading} />
          </div>

          {/* 右カラム: メッセージ送信 + メッセージ一覧 */}
          <div className="space-y-6">
            <MessageForm onSubmit={sendMessage} sending={sending} error={sendError} />
            <MessageList messages={messages} loading={messagesLoading} />
          </div>
        </div>
      </main>

      {/* 接続状態表示 */}
      <ConnectionStatus loading={isLoading} error={hasError} lastUpdatedAt={lastUpdatedTimestamp} />
    </div>
  )
}

function selectLatestRuns(runs: RunSession[]): RunSession[] {
  const map = new Map<string, RunSession>()
  runs.forEach((run) => {
    const existing = map.get(run.userId)
    if (!existing) {
      map.set(run.userId, run)
      return
    }
    const existingTime = existing.updatedAt?.seconds ?? existing.createdAt?.seconds ?? 0
    const runTime = run.updatedAt?.seconds ?? run.createdAt?.seconds ?? 0
    if (runTime > existingTime) {
      map.set(run.userId, run)
    }
  })
  return Array.from(map.values())
}
