import type { Timestamp } from 'firebase/firestore'
import { formatRelativeTime } from '../../../utils/format'

interface PhotoItem {
  id: string
  url: string
  caption?: string | null
  runnerName?: string
  timestamp?: Timestamp | null
}

interface PhotoGalleryProps {
  photos: PhotoItem[]
  loading: boolean
}

/**
 * 写真ギャラリー
 */
export function PhotoGallery({ photos, loading }: PhotoGalleryProps) {
  if (loading) {
    return (
      <div className="bg-white/90 rounded-2xl shadow-sm p-4 border border-white/60">
        <div className="animate-pulse grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="bg-white/90 rounded-2xl shadow-sm p-6 text-center border border-white/60">
        <p className="text-slate-500 text-sm">写真はまだ届いていません</p>
        <p className="text-slate-400 text-xs mt-1">ランナーが写真を撮ると表示されます</p>
      </div>
    )
  }

  return (
    <div className="bg-white/90 rounded-2xl shadow-sm overflow-hidden border border-white/60">
      <div className="px-4 py-3 border-b border-slate-200/70 bg-gradient-to-r from-emerald-50 to-sky-50">
        <h2 className="text-sm font-semibold text-slate-900">ラン中の写真</h2>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3">
        {photos.slice(0, 8).map((photo) => (
          <a
            key={photo.id}
            href={photo.url}
            target="_blank"
            rel="noreferrer"
            className="relative group overflow-hidden rounded-xl"
          >
            <img
              src={photo.url}
              alt={photo.caption ?? 'ラン中の写真'}
              className="h-28 w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-2 left-2 text-white text-[11px] opacity-90">
              <div>{photo.runnerName ?? 'ランナー'}</div>
              <div>{formatRelativeTime(photo.timestamp ?? null)}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
