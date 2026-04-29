import {
  isSupabaseConfigured as checkSupabaseConfigured,
  recordDownload as statsRecordDownload,
  recordView as statsRecordView,
} from '@/services/statsService'
import { usePopularityStore } from '@/stores/popularity'

export function isSupabaseConfigured() {
  return checkSupabaseConfigured()
}

export function recordView(wallpaper, series) {
  statsRecordView(wallpaper, series)

  if (wallpaper?.filename) {
    const popularityStore = usePopularityStore()
    popularityStore.adjustViewCount(wallpaper.filename, 1)
  }
}

export function recordDownload(wallpaper, series) {
  statsRecordDownload(wallpaper, series)

  if (wallpaper?.filename) {
    const popularityStore = usePopularityStore()
    popularityStore.adjustDownloadCount(wallpaper.filename, 1)
  }
}
