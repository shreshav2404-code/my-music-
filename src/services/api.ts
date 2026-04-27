import axios, { AxiosInstance } from 'axios';
import { LyricsResponse, SearchResponse, StreamResponse, Track } from '../types';

// ─── Free public Piped API instances (YouTube frontend, no API key needed) ───
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://api.piped.projectsegfau.lt',
  'https://pipedapi.in.projectsegfau.lt',
];

// ─── Jamendo free public API (free client_id for non-commercial use) ───
const JAMENDO_CLIENT_ID = 'b6747d04';
const JAMENDO_BASE = 'https://api.jamendo.com/v3.0';

const http: AxiosInstance = axios.create({ timeout: 15_000 });

// ─── Helpers ─────────────────────────────────────────────────────────────────

let lastWorkingPiped = 0; // index of last working instance

async function pipedGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < PIPED_INSTANCES.length; i++) {
    const idx = (lastWorkingPiped + i) % PIPED_INSTANCES.length;
    const base = PIPED_INSTANCES[idx];

    try {
      const resp = await http.get<T>(`${base}${path}`, { params, timeout: 12_000 });
      lastWorkingPiped = idx;
      return resp.data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Piped request failed');
    }
  }

  throw lastError ?? new Error('All Piped instances failed');
}

function secondsToReadable(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

// ─── YouTube search via Piped ────────────────────────────────────────────────

interface PipedSearchItem {
  type: string;
  url: string;
  title: string;
  uploaderName: string;
  uploaderUrl: string;
  thumbnail: string;
  duration: number;
}

interface PipedSearchResponse {
  items: PipedSearchItem[];
  nextpage?: string;
}

async function searchYouTube(query: string): Promise<Track[]> {
  const data = await pipedGet<PipedSearchResponse>('/search', {
    q: query,
    filter: 'music_songs',
  });

  return (data.items || [])
    .filter((item) => item.type === 'stream' && item.duration > 0)
    .slice(0, 20)
    .map((item) => {
      const videoId = item.url?.replace('/watch?v=', '') ?? '';
      return {
        id: `yt_${videoId}`,
        title: item.title,
        artist: item.uploaderName?.replace(/ - Topic$/, '') || 'Unknown Artist',
        album: 'YouTube',
        duration: item.duration,
        thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        source: 'youtube' as const,
        sourceUrl: `https://www.youtube.com${item.url}`,
      };
    });
}

// ─── Jamendo search (fully free, no backend) ────────────────────────────────

interface JamendoTrackResult {
  id: string;
  name: string;
  artist_name: string;
  album_name: string;
  duration: number;
  image: string;
  audio: string;
  audiodownload: string;
  shareurl: string;
}

interface JamendoSearchResponse {
  results: JamendoTrackResult[];
}

async function searchJamendo(query: string): Promise<Track[]> {
  try {
    const resp = await http.get<JamendoSearchResponse>(`${JAMENDO_BASE}/tracks/`, {
      params: {
        client_id: JAMENDO_CLIENT_ID,
        format: 'json',
        limit: '15',
        search: query,
        include: 'musicinfo',
        audiodlformat: 'mp32',
      },
      timeout: 10_000,
    });

    return (resp.data.results || []).map((t) => ({
      id: `jam_${t.id}`,
      title: t.name,
      artist: t.artist_name,
      album: t.album_name || 'Jamendo',
      duration: t.duration,
      thumbnail: t.image,
      source: 'jamendo' as const,
      sourceUrl: t.shareurl,
      streamUrl: t.audio,  // Jamendo gives direct stream URLs!
    }));
  } catch {
    return [];
  }
}

// ─── SoundCloud search via Piped ─────────────────────────────────────────────

async function searchSoundCloud(query: string): Promise<Track[]> {
  // Piped doesn't support SoundCloud; we use a basic approach
  // For now, SoundCloud will show results from YouTube with "(SoundCloud)" note
  // This can be improved later with a proper SoundCloud proxy
  try {
    const data = await pipedGet<PipedSearchResponse>('/search', {
      q: `${query} soundcloud`,
      filter: 'music_songs',
    });

    return (data.items || [])
      .filter((item) => item.type === 'stream' && item.duration > 0)
      .slice(0, 10)
      .map((item) => {
        const videoId = item.url?.replace('/watch?v=', '') ?? '';
        return {
          id: `sc_${videoId}`,
          title: item.title,
          artist: item.uploaderName?.replace(/ - Topic$/, '') || 'Unknown',
          album: 'SoundCloud',
          duration: item.duration,
          thumbnail: item.thumbnail || '',
          source: 'soundcloud' as const,
          sourceUrl: `https://www.youtube.com${item.url}`,
        };
      });
  } catch {
    return [];
  }
}

// ─── Unified search (replaces old backend /search endpoint) ──────────────────

export async function searchTracks(query: string, source: string = 'all'): Promise<SearchResponse> {
  const promises: Promise<Track[]>[] = [];

  if (source === 'all' || source === 'youtube') {
    promises.push(searchYouTube(query));
  }
  if (source === 'all' || source === 'jamendo') {
    promises.push(searchJamendo(query));
  }
  if (source === 'all' || source === 'soundcloud') {
    promises.push(searchSoundCloud(query));
  }

  const settled = await Promise.allSettled(promises);
  const results: Track[] = [];

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      results.push(...result.value);
    }
  }

  return {
    query,
    source,
    count: results.length,
    results,
  };
}

// ─── Stream URL resolution via Piped (replaces old /stream endpoint) ─────────

interface PipedStreamResponse {
  title: string;
  uploader: string;
  uploaderUrl: string;
  duration: number;
  thumbnailUrl: string;
  audioStreams: Array<{
    url: string;
    format: string;
    quality: string;
    mimeType: string;
    bitrate: number;
    contentLength: number;
  }>;
}

export async function getStreamUrl(videoId: string): Promise<PipedStreamResponse> {
  return pipedGet<PipedStreamResponse>(`/streams/${videoId}`);
}

export async function streamFromUrl(url: string, quality: string): Promise<StreamResponse> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  const data = await getStreamUrl(videoId);

  // Pick the best audio stream
  const audioStreams = (data.audioStreams || [])
    .filter((s) => s.mimeType?.includes('audio'))
    .sort((a, b) => b.bitrate - a.bitrate);

  const best = audioStreams[0];
  if (!best) {
    throw new Error('No audio stream found for this video');
  }

  return {
    streamUrl: best.url,
    quality: best.bitrate,
    duration: data.duration,
    title: data.title,
    thumbnail: data.thumbnailUrl,
    artist: data.uploader?.replace(/ - Topic$/, '') || 'Unknown Artist',
    source: 'youtube',
    sourceUrl: url,
  };
}

export async function resolveStreamByName(query: string, quality: string): Promise<StreamResponse> {
  // Search Piped and get the first result's stream
  const searchData = await pipedGet<PipedSearchResponse>('/search', {
    q: query,
    filter: 'music_songs',
  });

  const first = (searchData.items || []).find((item) => item.type === 'stream' && item.duration > 0);
  if (!first) {
    throw new Error('No results found for streaming');
  }

  const videoId = first.url?.replace('/watch?v=', '') ?? '';
  const streamData = await getStreamUrl(videoId);

  const audioStreams = (streamData.audioStreams || [])
    .filter((s) => s.mimeType?.includes('audio'))
    .sort((a, b) => b.bitrate - a.bitrate);

  const best = audioStreams[0];
  if (!best) {
    throw new Error('No audio stream available');
  }

  return {
    streamUrl: best.url,
    quality: best.bitrate,
    duration: streamData.duration,
    title: streamData.title,
    thumbnail: streamData.thumbnailUrl,
    artist: streamData.uploader?.replace(/ - Topic$/, '') || 'Unknown Artist',
    source: 'youtube',
    sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

// ─── Lyrics (free via lrclib.net — no API key required) ──────────────────────

export async function getLyrics(title: string, artist: string): Promise<LyricsResponse> {
  try {
    const resp = await http.get('https://lrclib.net/api/search', {
      params: { track_name: title, artist_name: artist },
      timeout: 8_000,
    });

    const results = resp.data;
    if (Array.isArray(results) && results.length > 0) {
      return {
        plain: results[0].plainLyrics || '',
        synced: results[0].syncedLyrics || '',
      };
    }
  } catch {
    // ignore
  }

  return { plain: '', synced: '' };
}

// ─── Metadata (resolve info about a URL) ─────────────────────────────────────

export async function getMetadata(url: string): Promise<any> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('Unsupported URL');
  }

  const data = await getStreamUrl(videoId);
  return {
    title: data.title,
    artist: data.uploader,
    duration: data.duration,
    thumbnail: data.thumbnailUrl,
  };
}

// Also export a dummy `api` for backward-compat with settings test-connection
const api = http;
export function getApiBaseUrl(): string {
  return PIPED_INSTANCES[lastWorkingPiped];
}
export default api;
