import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { LyricsResponse, SearchResponse, StreamResponse } from '../types';
import { useSettingsStore } from '../store/settingsStore';

const FALLBACK_BACKEND_URL = 'http://127.0.0.1:3000';

export function getApiBaseUrl(): string {
  const value = useSettingsStore.getState().backendUrl?.trim();
  return value || FALLBACK_BACKEND_URL;
}

const api: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10_000,
});

api.interceptors.request.use((config) => {
  const headers = (config.headers ?? {}) as Record<string, string | undefined>;
  const useCustomBaseUrl = String(headers['x-use-custom-baseurl'] ?? '').toLowerCase() === '1';

  if (!useCustomBaseUrl) {
    config.baseURL = getApiBaseUrl();
  }
  return config;
});

async function requestWithRetry<T>(config: AxiosRequestConfig, retries = 3): Promise<T> {
  let attempt = 0;
  let delayMs = 400;

  while (attempt < retries) {
    try {
      const response = await api.request<T>(config);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      attempt += 1;

      if (attempt >= retries) {
        throw axiosError;
      }

      const retriable = !axiosError.response || (axiosError.response.status >= 500 && axiosError.response.status < 600);
      if (!retriable) {
        throw axiosError;
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs *= 2;
    }
  }

  throw new Error('Request failed');
}

export async function searchTracks(query: string, source: string = 'all'): Promise<SearchResponse> {
  return requestWithRetry<SearchResponse>({
    method: 'GET',
    url: '/search',
    params: { q: query, source },
  });
}

export async function streamFromUrl(url: string, quality: string): Promise<StreamResponse> {
  return requestWithRetry<StreamResponse>({
    method: 'GET',
    url: '/stream',
    params: { url, quality },
    timeout: 20_000,
  });
}

export async function resolveStreamByName(query: string, quality: string): Promise<StreamResponse> {
  return requestWithRetry<StreamResponse>({
    method: 'GET',
    url: '/stream/resolve',
    params: { q: query, quality },
    timeout: 20_000,
  });
}

export async function getLyrics(title: string, artist: string): Promise<LyricsResponse> {
  return requestWithRetry<LyricsResponse>({
    method: 'GET',
    url: '/lyrics',
    params: { title, artist },
  });
}

export async function getMetadata(url: string): Promise<any> {
  return requestWithRetry<any>({
    method: 'GET',
    url: '/metadata',
    params: { url },
  });
}

export default api;
