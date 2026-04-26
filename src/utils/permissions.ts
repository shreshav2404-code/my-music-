import * as MediaLibrary from 'expo-media-library';

export async function ensureMediaLibraryPermission(): Promise<boolean> {
  const current = await MediaLibrary.getPermissionsAsync();
  if (current.granted) {
    return true;
  }

  const requested = await MediaLibrary.requestPermissionsAsync();
  return requested.granted;
}