import { MMKV } from 'react-native-mmkv';

export const kv = new MMKV({ id: 'wave.settings' });

export function setJson<T>(key: string, value: T): void {
  kv.set(key, JSON.stringify(value));
}

export function getJson<T>(key: string): T | undefined {
  const raw = kv.getString(key);
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}