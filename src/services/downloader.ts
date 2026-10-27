import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';
import { Track } from '../types';
import { extractVideoId, getProxiedAudioFormat, resolveYouTubeAudioUrl } from './api';

interface ProgressPayload {
  jobId: string;
  percent: number;
  status: string;
  eta: number | null;
  message?: string;
}

interface StartDownloadOptions {
  /** Id used to cancel this download with `cancelDownloadJob`. */
  jobId?: string;
  onProgress?: (payload: ProgressPayload) => void;
}

export const DOWNLOADS_DIR = `${FileSystem.documentDirectory || FileSystem.cacheDirectory || ''}downloads`;

export class DownloadCancelledError extends Error {
  constructor() {
    super('Download cancelled');
    this.name = 'DownloadCancelledError';
  }
}

const activeJobs = new Map<string, { resumable?: FileSystem.DownloadResumable; cancelled: boolean }>();

async function ensureDownloadsDir(): Promise<string> {
  const info = await FileSystem.getInfoAsync(DOWNLOADS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true });
  }
  return DOWNLOADS_DIR;
}

function sanitizeName(value: string): string {
  return value
    .replace(/[<>:"/\\|?*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function extensionFor(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('mp4')) return 'm4a';
  return 'mp3';
}

/**
 * Picks a downloadable audio URL for the track:
 * - YouTube: the MP3 link from the stream API, falling back to an audio-only
 *   format proxied through Invidious.
 * - Jamendo/others: the direct stream URL (`sourceUrl` is a web page there).
 */
async function resolveDownloadSource(track: Track): Promise<{ url: string; ext: string }> {
  const videoId = extractVideoId(track.sourceUrl);
  if (videoId) {
    try {
      return { url: await resolveYouTubeAudioUrl(videoId), ext: 'mp3' };
    } catch (error) {
      console.warn('Stream API failed for download, falling back to Invidious', error);
      const format = await getProxiedAudioFormat(videoId);
      return { url: format.url, ext: extensionFor(format.mimeType) };
    }
  }

  if (track.streamUrl) {
    return { url: track.streamUrl, ext: 'mp3' };
  }

  throw new Error('No downloadable audio found for this track');
}

export async function cancelDownloadJob(jobId: string): Promise<void> {
  const job = activeJobs.get(jobId);
  if (!job) {
    return;
  }
  job.cancelled = true;
  await job.resumable?.cancelAsync().catch(() => undefined);
}

/** Deletes a file only if it lives in the app's downloads folder. */
export async function deleteDownloadedFile(fileUri: string): Promise<void> {
  if (!fileUri.startsWith(DOWNLOADS_DIR)) {
    return;
  }
  await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => undefined);
}

/** Downloads a track's audio on-device. No backend server required. */
export async function startDownload(
  track: Track,
  options: StartDownloadOptions = {},
): Promise<{ jobId: string; fileUri: string }> {
  const jobId = options.jobId ?? uuidv4();
  const job: { resumable?: FileSystem.DownloadResumable; cancelled: boolean } = { cancelled: false };
  activeJobs.set(jobId, job);

  let downloadPath: string | null = null;

  try {
    options.onProgress?.({
      jobId,
      percent: 5,
      status: 'downloading',
      eta: null,
      message: 'Resolving stream...',
    });

    const source = await resolveDownloadSource(track);
    if (job.cancelled) {
      throw new DownloadCancelledError();
    }

    options.onProgress?.({
      jobId,
      percent: 15,
      status: 'downloading',
      eta: null,
      message: 'Downloading audio...',
    });

    const dir = await ensureDownloadsDir();
    const baseName = sanitizeName(`${track.title} - ${track.artist}`) || jobId;
    let targetPath = `${dir}/${baseName}.${source.ext}`;
    // Different songs can share a title and artist; never overwrite another download.
    if ((await FileSystem.getInfoAsync(targetPath)).exists) {
      targetPath = `${dir}/${baseName} (${sanitizeName(track.id).slice(-11)}).${source.ext}`;
    }
    downloadPath = targetPath;

    const startedAt = Date.now();
    job.resumable = FileSystem.createDownloadResumable(source.url, downloadPath, {}, (progress) => {
      const { totalBytesWritten, totalBytesExpectedToWrite } = progress;
      const megabytes = (totalBytesWritten / 1024 / 1024).toFixed(1);

      // Some servers don't send Content-Length; show bytes instead of a bogus %.
      if (totalBytesExpectedToWrite <= 0) {
        options.onProgress?.({ jobId, percent: 15, status: 'downloading', eta: null, message: `${megabytes}MB downloaded` });
        return;
      }

      const fraction = totalBytesWritten / totalBytesExpectedToWrite;
      const elapsedSeconds = (Date.now() - startedAt) / 1000;
      const eta = fraction > 0.02 ? Math.round((elapsedSeconds / fraction) * (1 - fraction)) : null;

      options.onProgress?.({
        jobId,
        percent: Math.min(95, Math.round(15 + fraction * 80)),
        status: 'downloading',
        eta,
        message: `${megabytes}MB downloaded`,
      });
    });

    const result = await job.resumable.downloadAsync();
    if (job.cancelled) {
      throw new DownloadCancelledError();
    }

    if (!result?.uri) {
      throw new Error('Download failed — no file was saved');
    }

    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Download failed (HTTP ${result.status})`);
    }

    options.onProgress?.({
      jobId,
      percent: 100,
      status: 'completed',
      eta: null,
      message: 'Done!',
    });

    return { jobId, fileUri: result.uri };
  } catch (error) {
    if (downloadPath) {
      await FileSystem.deleteAsync(downloadPath, { idempotent: true }).catch(() => undefined);
    }
    throw job.cancelled ? new DownloadCancelledError() : error;
  } finally {
    activeJobs.delete(jobId);
  }
}
