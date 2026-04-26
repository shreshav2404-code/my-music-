import { useDownloadStore } from '../store/downloadStore';

export function useDownload() {
  return useDownloadStore();
}