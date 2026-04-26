import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';
import EventSource from 'react-native-sse';
import api, { getApiBaseUrl } from './api';

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

function backendOrigin(): string {
  const base = getApiBaseUrl();
  return base.replace(/\/$/, '');
}

function ensureDownloadsDir(): string {
  const root = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
  const target = `${root}downloads`;
  FileSystem.makeDirectoryAsync(target, { intermediates: true }).catch(() => undefined);
  return target;
}

export async function startDownload(
  input: StartDownloadInput,
  options: StartDownloadOptions = {},
): Promise<{ jobId: string; fileUri: string }> {
  const jobId = uuidv4();

  const startResp = await api.post<{
    jobId: string;
    progressUrl: string;
    fileUrl: string;
  }>(
    '/download?mode=async',
    {
      url: input.url,
      quality: input.quality,
      filename: input.filename,
      jobId,
    },
    {
      timeout: 30_000,
    },
  );

  const { progressUrl, fileUrl } = startResp.data;

  await waitForCompletion(jobId, progressUrl, options.onProgress);

  const downloadPath = `${ensureDownloadsDir()}/${sanitizeName(input.filename || jobId)}.mp3`;
  const fullFileUrl = `${backendOrigin()}${fileUrl}`;

  const result = await FileSystem.downloadAsync(fullFileUrl, downloadPath);
  return { jobId, fileUri: result.uri };
}

function sanitizeName(value: string): string {
  return value
    .replace(/[<>:"/\\|?*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function waitForCompletion(
  jobId: string,
  progressUrl: string,
  onProgress?: (payload: ProgressPayload) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const source = new EventSource(`${backendOrigin()}${progressUrl}`);

    source.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data ?? '{}') as ProgressPayload & { event?: string };
        onProgress?.(payload);

        if (payload.status === 'completed') {
          source.close();
          resolve();
          return;
        }

        if (payload.status === 'error') {
          source.close();
          reject(new Error(payload.message || 'Download failed'));
        }
      } catch (error) {
        source.close();
        reject(error instanceof Error ? error : new Error('Invalid SSE payload'));
      }
    });

    source.addEventListener('error', () => {
      source.close();
      reject(new Error(`Download progress stream disconnected for job ${jobId}`));
    });
  });
}
