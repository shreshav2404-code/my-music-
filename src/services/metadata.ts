import * as MediaLibrary from 'expo-media-library';

export interface FileMetadata {
  title: string;
  artist: string;
  album: string;
  duration: number;
  artwork: string;
}

export async function metadataFromAssetId(assetId: string): Promise<FileMetadata | null> {
  try {
    const asset = await MediaLibrary.getAssetInfoAsync(assetId);
    if (!asset) {
      return null;
    }

    return {
      title: asset.filename?.replace(/\.[^.]+$/, '') || 'Unknown Title',
      artist: 'Unknown Artist',
      album: 'Local Files',
      duration: Math.floor(asset.duration ?? 0),
      artwork: asset.uri,
    };
  } catch {
    return null;
  }
}

export function metadataFromFilename(fileUri: string): FileMetadata {
  const raw = fileUri.split('/').pop() || 'Unknown Title';
  const title = raw.replace(/\.[^.]+$/, '');

  return {
    title,
    artist: 'Unknown Artist',
    album: 'Local Files',
    duration: 0,
    artwork: '',
  };
}