import { StateStorage } from 'zustand/middleware';
import { kv } from '../utils/storage';

export const mmkvStorage: StateStorage = {
  getItem: (name) => kv.getString(name) ?? null,
  setItem: (name, value) => kv.set(name, value),
  removeItem: (name) => kv.delete(name),
};