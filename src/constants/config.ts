import { kv } from '../utils/storage';

const defaultBackend = 'http://127.0.0.1:3000';

export const CONFIG = {
  BACKEND_URL_KEY: 'settings.backendUrl',
  STREAM_CACHE_TTL_MS: 25 * 60 * 1000,
  DEFAULT_STREAM_QUALITY: 'high' as const,
  DEFAULT_DOWNLOAD_QUALITY: 320 as const,
};

export function getBackendUrl(): string {
  return kv.getString(CONFIG.BACKEND_URL_KEY) || defaultBackend;
}

export function setBackendUrl(url: string): void {
  kv.set(CONFIG.BACKEND_URL_KEY, url);
}
