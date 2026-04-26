import { useSearchStore } from '../store/searchStore';

export function useSearch() {
  return useSearchStore();
}