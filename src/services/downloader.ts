import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';
import { getStreamUrl } from './api';

interface StartDownloadInput {
  url: string;
  quality: number;
  filename?: string;
}

interface ProgressPayload {
  jobId: string;
  percent: number;
  status: string;
  eta: number | null;
  message?: string;
}

interface StartDownloadOptions {
  onProgress?: (payload: ProgressPayload) => void;
}

function ensureDownloadsDir(): string {
  const root = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
  const target = `${root}downloads`;
  FileSystem.makeDirectoryAsync(target, { intermediates: true }).catch(() => undefined);
  return target;
}

function sanitizeName(value: string): string {
  return value
    .replace(/[<>:"/\\|?*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function extractVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
  );
  return match ? match[1] : null;
}

/**
 * Downloads a track directly on-device using Piped API for stream URL resolution.
 * No backend server required!
 *
 * For YouTube tracks: resolves stream URL via Piped, then downloads the audio.
 * For Jamendo tracks: the sourceUrl is already a direct download link.
 */
export async function startDownload(
  input: StartDownloadInput,
  options: StartDownloadOptions = {},
): Promise<{ jobId: string; fileUri: string }> {
  const jobId = uuidv4();

  options.onProgress?.({
    jobId,
    percent: 5,
    status: 'downloading',
    eta: null,
    message: 'Resolving stream...',
  });

  let audioUrl: string;

  // Try to resolve a YouTube stream URL
  const videoId = extractVideoId(input.url);
  if (videoId) {
    const streamData = await getStreamUrl(videoId);

    const audioStreams = (streamData.adaptiveFormats || [])
      .filter((s) => s.type?.includes('audio'))
      .sort((a, b) => parseInt(b.bitrate || '0') - parseInt(a.bitrate || '0'));

    // Pick stream based on desired quality
    let picked = audioStreams[0]; // default: best quality
    if (input.quality <= 128 && audioStreams.length > 1) {
      picked = audioStreams[audioStreams.length - 1]; // lowest
    } else if (input.quality <= 192 && audioStreams.length > 2) {
      picked = audioStreams[Math.floor(audioStreams.length / 2)]; // mid
    }

    if (!picked) {
      throw new Error('No audio stream available for download');
    }

    audioUrl = picked.url;
  } else {
    // Non-YouTube URL (e.g. Jamendo direct link) — use as-is
    audioUrl = input.url;
  }

  options.onProgress?.({
    jobId,
    percent: 15,
    status: 'downloading',
    eta: null,
    message: 'Downloading audio...',
  });

  const ext = audioUrl.includes('.mp3') || audioUrl.includes('mp3') ? 'mp3' : 'mp4';
  const downloadPath = `${ensureDownloadsDir()}/${sanitizeName(input.filename || jobId)}.${ext}`;

  const downloadResumable = FileSystem.createDownloadResumable(
    audioUrl,
    downloadPath,
    {},
    (progress) => {
      const pct = Math.round(
        15 + (progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 80,
      );
      options.onProgress?.({
        jobId,
        percent: Math.min(pct, 95),
        status: 'downloading',
        eta: null,
        message: `${Math.round(progress.totalBytesWritten / 1024 / 1024)}MB downloaded`,
      });
    },
  );

  const result = await downloadResumable.downloadAsync();

  if (!result?.uri) {
    throw new Error('Download failed — no file was saved');
  }

  options.onProgress?.({
    jobId,
    percent: 100,
    status: 'completed',
    eta: null,
    message: 'Done!',
  });

  return { jobId, fileUri: result.uri };
}
