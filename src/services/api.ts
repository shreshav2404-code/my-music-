import axios, { AxiosInstance } from 'axios';
import { LyricsResponse, SearchResponse, StreamResponse, Track } from '../types';

// ─── Free public Invidious API instances ───
const INVIDIOUS_INSTANCES = [
  'https://inv.thepixora.com',
  'https://yt.chocolatemoo53.com',
  'https://invidious.nerdvpn.de',
  'https://inv.nadeko.net'
];

// ─── Jamendo free public API (free client_id for non-commercial use) ───
const JAMENDO_CLIENT_ID = 'b6747d04';
const JAMENDO_BASE = 'https://api.jamendo.com/v3.0';

const http: AxiosInstance = axios.create({ timeout: 15_000 });

// ─── Helpers ─────────────────────────────────────────────────────────────────

let lastWorkingInstance = 0; // index of last working instance

async function invidiousGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < INVIDIOUS_INSTANCES.length; i++) {
    const idx = (lastWorkingInstance + i) % INVIDIOUS_INSTANCES.length;
    const base = INVIDIOUS_INSTANCES[idx];

    try {
      const resp = await http.get<T>(`${base}${path}`, { params, timeout: 8_000 });
      lastWorkingInstance = idx;
      return resp.data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Invidious request failed');
    }
  }

  throw lastError ?? new Error('All Invidious instances failed');
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
      // Get highest res thumbnail
      const thumb = item.videoThumbnails?.sort((a, b) => b.width - a.width)[0]?.url;
      return {
        id: `yt_${item.videoId}`,
        title: item.title,
        artist: item.author?.replace(/ - Topic$/, '') || 'Unknown Artist',
        album: 'YouTube',
        duration: item.lengthSeconds,
        thumbnail: thumb || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
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

// ─── SoundCloud search via Invidious ─────────────────────────────────────────────

async function searchSoundCloud(query: string): Promise<Track[]> {
  try {
    const items = await invidiousGet<InvidiousSearchItem[]>('/api/v1/search', {
      q: `${query} soundcloud`,
      type: 'video',
    });

    return (items || [])
      .filter((item) => item.type === 'video' && item.lengthSeconds > 0)
      .slice(0, 10)
      .map((item) => {
        const thumb = item.videoThumbnails?.sort((a, b) => b.width - a.width)[0]?.url;
        return {
          id: `sc_${item.videoId}`,
          title: item.title,
          artist: item.author?.replace(/ - Topic$/, '') || 'Unknown',
          album: 'SoundCloud',
          duration: item.lengthSeconds,
          thumbnail: thumb || '',
          source: 'soundcloud' as const,
          sourceUrl: `https://www.youtube.com/watch?v=${item.videoId}`,
        };
      });
  } catch {
    return [];
  }
}

// ─── Unified search ──────────────────

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

export async function streamFromUrl(url: string, quality: string): Promise<StreamResponse> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  const data = await getStreamUrl(videoId);

  // Pick the best audio stream
  const audioStreams = (data.adaptiveFormats || [])
    .filter((s) => s.type?.includes('audio'))
    .sort((a, b) => parseInt(b.bitrate || '0') - parseInt(a.bitrate || '0'));

  const best = audioStreams[0];
  if (!best) {
    throw new Error('No audio stream found for this video');
  }

  const thumb = data.videoThumbnails?.sort((a, b) => b.width - a.width)[0]?.url;

  return {
    streamUrl: best.url,
    quality: parseInt(best.bitrate),
    duration: data.lengthSeconds,
    title: data.title,
    thumbnail: thumb || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    artist: data.author?.replace(/ - Topic$/, '') || 'Unknown Artist',
    source: 'youtube',
    sourceUrl: url,
  };
}

export async function resolveStreamByName(query: string, quality: string): Promise<StreamResponse> {
  // Search Invidious and get the first result's stream
  const items = await invidiousGet<InvidiousSearchItem[]>('/api/v1/search', {
    q: query,
    type: 'video',
  });

  const first = (items || []).find((item) => item.type === 'video' && item.lengthSeconds > 0);
  if (!first) {
    throw new Error('No results found for streaming');
  }

  const videoId = first.videoId;
  const data = await getStreamUrl(videoId);

  const audioStreams = (data.adaptiveFormats || [])
    .filter((s) => s.type?.includes('audio'))
    .sort((a, b) => parseInt(b.bitrate || '0') - parseInt(a.bitrate || '0'));

  const best = audioStreams[0];
  if (!best) {
    throw new Error('No audio stream available');
  }

  const thumb = data.videoThumbnails?.sort((a, b) => b.width - a.width)[0]?.url;

  return {
    streamUrl: best.url,
    quality: parseInt(best.bitrate),
    duration: data.lengthSeconds,
    title: data.title,
    thumbnail: thumb || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    artist: data.author?.replace(/ - Topic$/, '') || 'Unknown Artist',
    source: 'youtube',
    sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
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
  const thumb = data.videoThumbnails?.sort((a, b) => b.width - a.width)[0]?.url;

  return {
    title: data.title,
    artist: data.author,
    duration: data.lengthSeconds,
    thumbnail: thumb || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };
}

const api = http;
export function getApiBaseUrl(): string {
  return INVIDIOUS_INSTANCES[lastWorkingInstance];
}
export default api;
