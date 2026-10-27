import axios, { AxiosInstance } from 'axios';
import { CONFIG } from '../constants/config';
import { LyricsResponse, SearchResponse, StreamResponse, Track } from '../types';

// ─── Free public Invidious API instances (12+ with fallbacks) ───
let INVIDIOUS_INSTANCES = [
  'https://invidious.kavin.rocks',
  'https://inv.thepixora.com',
  'https://yt.chocolatemoo53.com',
  'https://invidious.nerdvpn.de',
  'https://inv.nadeko.net',
  'https://invidious.snopyta.org',
  'https://iv.ggtyler.dev',
  'https://yewtu.be',
  'https://invidious.epicsite.xyz',
  'https://inv.riverside.rocks',
  'https://invidious.jing.rocks',
  'https://inv.bp.projectsegfau.lt'
];

// ─── Jamendo free public API (free client_id for non-commercial use) ───
const JAMENDO_CLIENT_ID = 'b6747d04';
const JAMENDO_BASE = 'https://api.jamendo.com/v3.0';

const http: AxiosInstance = axios.create({ timeout: 15_000 });

// ─── Helpers ─────────────────────────────────────────────────────────────────

let lastWorkingInstance = 0; // index of last working instance
let instanceHealthCheckDone = false;

/**
 * Health check: Test all instances and remove dead ones
 * This runs once on app startup to find working instances
 */
export async function healthCheckInvidiousInstances(): Promise<void> {
  if (instanceHealthCheckDone) return; // Only run once per session
  
  console.log('🔍 Checking Invidious instance health...');
  
  const checks = await Promise.allSettled(
    INVIDIOUS_INSTANCES.map(async (instance) => {
      try {
        await http.get(`${instance}/api/v1/stats`, { timeout: 5_000 });
        return { instance, alive: true };
      } catch {
        return { instance, alive: false };
      }
    })
  );

  const alive: string[] = [];
  const dead: string[] = [];

  for (const result of checks) {
    if (result.status === 'fulfilled') {
      if (result.value.alive) {
        alive.push(result.value.instance);
      } else {
        dead.push(result.value.instance);
      }
    }
  }

  // Keep alive instances at the front. Reset the cursor because indices now
  // point at different instances.
  INVIDIOUS_INSTANCES = [...alive, ...dead];
  lastWorkingInstance = 0;
  
  console.log(`✅ Health check complete: ${alive.length}/${INVIDIOUS_INSTANCES.length} instances alive`);
  
  if (alive.length === 0) {
    console.warn('⚠️ WARNING: No Invidious instances are responding! Falling back to all instances.');
  }

  instanceHealthCheckDone = true;
}

async function invidiousGetWithBase<T>(path: string, params?: Record<string, string>): Promise<{ data: T; base: string }> {
  // Try the top 3 instances simultaneously! The first to respond wins.
  // This completely eliminates latency from waiting on a dead instance.
  const indicesToTry = [
    lastWorkingInstance,
    (lastWorkingInstance + 1) % INVIDIOUS_INSTANCES.length,
    (lastWorkingInstance + 2) % INVIDIOUS_INSTANCES.length
  ];

  const requests = indicesToTry.map((idx) => {
    const base = INVIDIOUS_INSTANCES[idx];
    return http.get<T>(`${base}${path}`, { params, timeout: 4_000 })
      .then(resp => {
        lastWorkingInstance = idx;
        return { data: resp.data, base };
      });
  });

  try {
    return await Promise.any(requests);
  } catch (e) {
    // If all 3 concurrent requests fail, fallback to a standard sequential loop
    let lastError: Error | null = null;
    for (let i = 3; i < INVIDIOUS_INSTANCES.length; i++) {
      const idx = (lastWorkingInstance + i) % INVIDIOUS_INSTANCES.length;
      const base = INVIDIOUS_INSTANCES[idx];
      try {
        const resp = await http.get<T>(`${base}${path}`, { params, timeout: 8_000 });
        lastWorkingInstance = idx;
        return { data: resp.data, base };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Invidious request failed');
      }
    }
    throw lastError ?? new Error('All Invidious instances failed');
  }
}

async function invidiousGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  return (await invidiousGetWithBase<T>(path, params)).data;
}

export function extractVideoId(url: string | undefined): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

// maxresdefault is missing for many music uploads (YouTube serves a grey
// placeholder), so always use hqdefault which exists for every video.
export function youtubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

// ─── YouTube search via Invidious ────────────────────────────────────────────────

interface InvidiousSearchItem {
  type: string;
  videoId: string;
  title: string;
  author: string;
  authorUrl: string;
  videoThumbnails: { url: string; quality: string; width: number; height: number }[];
  lengthSeconds: number;
}

async function searchYouTube(query: string): Promise<Track[]> {
  const items = await invidiousGet<InvidiousSearchItem[]>('/api/v1/search', {
    q: query,
    type: 'video',
  });

  return (items || [])
    .filter((item) => item.type === 'video' && item.lengthSeconds > 0)
    .slice(0, 20)
    .map((item) => {
      return {
        id: `yt_${item.videoId}`,
        title: item.title,
        artist: item.author?.replace(/ - Topic$/, '') || 'Unknown Artist',
        album: 'YouTube',
        duration: item.lengthSeconds,
        thumbnail: youtubeThumbnail(item.videoId),
        source: 'youtube' as const,
        sourceUrl: `https://www.youtube.com/watch?v=${item.videoId}`,
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
}

// ─── REMOVED: SoundCloud search (was returning fake YouTube results) ────────

// This was broken and returned YouTube videos tagged with "soundcloud" instead of
// actual SoundCloud tracks. Removed to avoid confusion and failed searches.
// If you want real SoundCloud support, we'd need a different approach.

// ─── Unified search ──────────────────

export async function searchTracks(query: string, source: string = 'all'): Promise<SearchResponse> {
  const promises: Promise<Track[]>[] = [];

  // Only search real sources now
  if (source === 'all' || source === 'youtube') {
    promises.push(searchYouTube(query));
  }
  if (source === 'all' || source === 'jamendo') {
    promises.push(searchJamendo(query));
  }

  const settled = await Promise.allSettled(promises);
  const results: Track[] = [];
  let firstError: unknown = null;

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      results.push(...result.value);
    } else if (!firstError) {
      firstError = result.reason;
    }
  }

  // Show an error instead of an empty "no results" list when we couldn't reach
  // the sources at all (e.g. offline or every Invidious instance is down).
  if (results.length === 0 && firstError) {
    throw new Error('Could not reach music sources. Check your connection and try again.');
  }

  return {
    query,
    source,
    count: results.length,
    results,
  };
}

// ─── Stream URL resolution via Invidious ─────────

export interface InvidiousVideoResponse {
  title: string;
  videoId: string;
  author: string;
  lengthSeconds: number;
  videoThumbnails: { url: string; quality: string; width: number; height: number }[];
  adaptiveFormats: {
    type: string;
    url: string;
    bitrate: string;
  }[];
}

export async function getStreamUrl(videoId: string): Promise<InvidiousVideoResponse> {
  return invidiousGet<InvidiousVideoResponse>(`/api/v1/videos/${videoId}`);
}

/**
 * Best audio-only format proxied through the Invidious instance (`local=true`).
 * Direct googlevideo links are locked to the instance's IP and 403 on-device.
 */
export async function getProxiedAudioFormat(videoId: string): Promise<{ url: string; mimeType: string }> {
  const { data, base } = await invidiousGetWithBase<InvidiousVideoResponse>(`/api/v1/videos/${videoId}`, {
    local: 'true',
  });

  const audio = (data.adaptiveFormats || [])
    .filter((f) => f.type?.startsWith('audio/') && f.url)
    .sort((a, b) => {
      // Prefer AAC (audio/mp4) for player compatibility, then higher bitrate.
      const mp4Diff = Number(b.type.startsWith('audio/mp4')) - Number(a.type.startsWith('audio/mp4'));
      return mp4Diff || parseInt(b.bitrate || '0', 10) - parseInt(a.bitrate || '0', 10);
    })[0];

  if (!audio) {
    throw new Error('No audio stream available for this video');
  }

  return {
    url: audio.url.startsWith('/') ? `${base}${audio.url}` : audio.url,
    mimeType: audio.type,
  };
}

// ─── RapidAPI Fallback Configuration ─────────
const RAPID_APIS = [
  {
    host: 'youtube-mp36.p.rapidapi.com',
    url: 'https://youtube-mp36.p.rapidapi.com/dl',
    key: '1dfb3784e1mshb640fd231f7f5e7p172c9ejsn6de7a6bce21a',
    getParams: (id: string) => ({ id }),
    extractLink: (data: any) => data.link || data.url || data.download
  },
  {
    host: 'yt-search-and-download-mp3.p.rapidapi.com',
    url: 'https://yt-search-and-download-mp3.p.rapidapi.com/mp3',
    key: '1dfb3784e1mshb640fd231f7f5e7p172c9ejsn6de7a6bce21a',
    getParams: (id: string) => ({ url: `https://www.youtube.com/watch?v=${id}` }),
    extractLink: (data: any) => data.download || data.url
  }
];

// Resolved links stay valid for a while but not forever, so cache them for
// STREAM_CACHE_TTL_MS. In-flight requests are shared so a prefetch and a play
// of the same video never cost two API calls.
const audioUrlCache = new Map<string, { url: string; expiresAt: number }>();
const audioUrlInflight = new Map<string, Promise<string>>();

export function getCachedYouTubeAudioUrl(videoId: string): string | null {
  const entry = audioUrlCache.get(videoId);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    audioUrlCache.delete(videoId);
    return null;
  }
  return entry.url;
}

export function invalidateYouTubeAudioUrl(videoId: string): void {
  audioUrlCache.delete(videoId);
}

export function resolveYouTubeAudioUrl(videoId: string): Promise<string> {
  const cached = getCachedYouTubeAudioUrl(videoId);
  if (cached) return Promise.resolve(cached);

  let pending = audioUrlInflight.get(videoId);
  if (!pending) {
    pending = getAudioStreamUrl(videoId)
      .then((url) => {
        audioUrlCache.set(videoId, { url, expiresAt: Date.now() + CONFIG.STREAM_CACHE_TTL_MS });
        return url;
      })
      .finally(() => audioUrlInflight.delete(videoId));
    audioUrlInflight.set(videoId, pending);
  }
  return pending;
}

async function getAudioStreamUrl(videoId: string): Promise<string> {
  let lastError = null;

  for (const api of RAPID_APIS) {
    try {
      const response = await axios.request({
        method: 'GET',
        url: api.url,
        params: api.getParams(videoId),
        headers: {
          'x-rapidapi-key': api.key,
          'x-rapidapi-host': api.host
        },
        timeout: 10000
      });

      const streamUrl = api.extractLink(response.data);
      if (streamUrl) {
        return streamUrl;
      }
    } catch (e: any) {
      console.warn(`API ${api.host} failed:`, e.message);
      lastError = e;
    }
  }

  throw new Error(`All RapidAPIs failed to resolve audio stream. Last error: ${lastError?.message}`);
}

export async function streamFromUrl(url: string, quality: string): Promise<StreamResponse> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  // Run metadata + stream resolution in parallel. Metadata is best-effort
  // so a dead Invidious instance won't block playback.
  const [metaResult, streamUrl] = await Promise.all([
    getStreamUrl(videoId).catch(() => null),
    resolveYouTubeAudioUrl(videoId)
  ]);

  return {
    streamUrl: streamUrl,
    quality: 128000,
    duration: metaResult?.lengthSeconds ?? 0,
    title: metaResult?.title ?? 'Unknown Title',
    thumbnail: youtubeThumbnail(videoId),
    artist: metaResult?.author?.replace(/ - Topic$/, '') || 'Unknown Artist',
    source: 'youtube',
    sourceUrl: url,
  };
}

export async function resolveStreamByName(query: string, quality: string): Promise<StreamResponse> {
  // Search Invidious and get the first result
  const items = await invidiousGet<InvidiousSearchItem[]>('/api/v1/search', {
    q: query,
    type: 'video',
  });

  const first = (items || []).find((item) => item.type === 'video' && item.lengthSeconds > 0);
  if (!first) {
    throw new Error('No results found for streaming');
  }

  const videoId = first.videoId;

  // Get the stream URL from RapidAPI. We already have metadata from the search result,
  // so there's no need for a second Invidious call.
  const streamUrl = await resolveYouTubeAudioUrl(videoId);

  return {
    streamUrl: streamUrl,
    quality: 128000,
    duration: first.lengthSeconds,
    title: first.title,
    thumbnail: youtubeThumbnail(videoId),
    artist: first.author?.replace(/ - Topic$/, '') || 'Unknown Artist',
    source: 'youtube',
    sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

/**
 * Builds a library Track from a resolved stream. YouTube tracks get the same
 * `yt_<videoId>` id search results use, so pasting a link to a song that's
 * already in the library doesn't create a duplicate entry.
 */
export function trackFromStream(stream: StreamResponse): Track {
  const videoId = extractVideoId(stream.sourceUrl);
  return {
    id: videoId ? `yt_${videoId}` : `${stream.source}_${Date.now()}`,
    title: stream.title,
    artist: stream.artist,
    album: 'Single',
    duration: stream.duration,
    thumbnail: stream.thumbnail,
    source: stream.source,
    sourceUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : stream.sourceUrl,
    streamUrl: stream.streamUrl,
  };
}

// ─── Lyrics (free via lrclib.net) ──────────────────────

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

// ─── Video Download Resolution ─────────────────────────────────────

export async function resolveVideoUrl(url: string): Promise<{ videoUrl: string; title: string; duration: number }> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('Unsupported YouTube URL');
  }

  const data = await invidiousGet<any>(`/api/v1/videos/${videoId}`);
  
  // Get pre-merged MP4 format streams
  const formatStreams = (data.formatStreams || []).filter((s: any) => s.type?.includes('video/mp4'));
  
  // Sort by resolution
  const sorted = formatStreams.sort((a: any, b: any) => {
    const resA = parseInt(a.resolution || '0');
    const resB = parseInt(b.resolution || '0');
    return resB - resA;
  });

  if (!sorted.length) {
    throw new Error('No MP4 video streams available for this video');
  }

  return {
    videoUrl: sorted[0].url,
    title: data.title,
    duration: data.lengthSeconds,
  };
}

export async function getMetadata(url: string): Promise<any> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('Unsupported URL');
  }

  const data = await getStreamUrl(videoId);

  return {
    title: data.title,
    artist: data.author,
    duration: data.lengthSeconds,
    thumbnail: youtubeThumbnail(videoId),
  };
}

const api = http;
export function getApiBaseUrl(): string {
  return INVIDIOUS_INSTANCES[lastWorkingInstance];
}

export function getWorkingInstancesCount(): number {
  // Count instances that have been tested and are still responding
  return INVIDIOUS_INSTANCES.length;
}

export default api;
