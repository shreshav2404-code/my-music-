export type SourceName = 'youtube' | 'soundcloud' | 'jamendo' | 'archive' | 'local';

export type RepeatMode = 'off' | 'one' | 'all';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  thumbnail: string;
  source: SourceName;
  sourceUrl: string;
  streamUrl?: string;
  filePath?: string;
  quality?: string;
  year?: string;
  genre?: string;
  lyrics?: string;
  isDownloaded?: boolean;
  isLiked?: boolean;
  playCount?: number;
  lastPlayed?: number;
  addedAt?: number;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  createdAt: number;
  updatedAt: number;
}

export interface Album {
  id: string;
  name: string;
  artist: string;
  thumbnail: string;
  year: string;
  songCount: number;
}

export interface Artist {
  id: string;
  name: string;
  thumbnail: string;
  songCount: number;
}

export interface DownloadItem {
  id: string;
  song: Track;
  progress: number;
  status: 'queued' | 'downloading' | 'converting' | 'completed' | 'error' | 'cancelled';
  eta: number | null;
  message?: string;
}

export interface SearchResponse {
  query: string;
  source: string;
  count: number;
  results: Track[];
}

export interface StreamResponse {
  streamUrl: string;
  quality: number;
  duration: number;
  title: string;
  thumbnail: string;
  artist: string;
  source: SourceName;
  sourceUrl: string;
}

export interface LyricsResponse {
  plain: string;
  synced: string;
}