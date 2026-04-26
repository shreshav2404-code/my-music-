import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { upsertSong } from '../db/queries/songs';
import { rebuildAlbumsFromSongs } from '../db/queries/albums';
import { rebuildArtistsFromSongs } from '../db/queries/artists';
import { Track } from '../types';
import { ensureMediaLibraryPermission } from '../utils/permissions';
import { generateId } from '../utils/string';

const supportedExtensions = ['.mp3', '.flac', '.wav', '.m4a', '.aac'];

interface ScanOptions {
  onProgress?: (percent: number, scanned: number, total: number) => void;
}

function looksLikeAudio(uri: string): boolean {
  const lower = uri.toLowerCase();
  return supportedExtensions.some((ext) => lower.endsWith(ext));
}

function fileNameFromUri(uri: string): string {
  const parts = uri.split('/');
  const filename = parts[parts.length - 1] || 'Unknown';
  return filename.replace(/\.[^.]+$/, '');
}

async function getAssetsViaMediaLibrary(): Promise<MediaLibrary.Asset[]> {
  const assets: MediaLibrary.Asset[] = [];
  let after: string | undefined;
  let hasNext = true;

  while (hasNext) {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.audio,
      first: 200,
      after,
      sortBy: [[MediaLibrary.SortBy.modificationTime, false]],
    });

    assets.push(...page.assets);
    hasNext = page.hasNextPage;
    after = page.endCursor;
  }

  return assets;
}

async function findLocalAudioFilesFallback(): Promise<string[]> {
  const roots = ['/storage/emulated/0/Music', '/storage/emulated/0/Download', FileSystem.documentDirectory || ''];
  const results = new Set<string>();

  async function walk(dir: string): Promise<void> {
    if (!dir) {
      return;
    }

    try {
      const entries = await FileSystem.readDirectoryAsync(dir);

      await Promise.all(
        entries.map(async (entry) => {
          const full = `${dir.replace(/\/$/, '')}/${entry}`;

          try {
            const info = await FileSystem.getInfoAsync(full);
            if (!info.exists) {
              return;
            }

            if (info.isDirectory) {
              await walk(full);
              return;
            }

            if (looksLikeAudio(full)) {
              results.add(full);
            }
          } catch {
            // Ignore inaccessible paths.
          }
        }),
      );
    } catch {
      // Ignore inaccessible roots.
    }
  }

  for (const root of roots) {
    await walk(root);
  }

  return Array.from(results);
}

export async function scanLocalFiles(options: ScanOptions = {}): Promise<number> {
  const granted = await ensureMediaLibraryPermission();
  if (!granted) {
    throw new Error('Storage permission not granted');
  }

  const mediaAssets = await getAssetsViaMediaLibrary();

  let scanned = 0;
  const total = Math.max(1, mediaAssets.length);

  for (const asset of mediaAssets) {
    const title = asset.filename?.replace(/\.[^.]+$/, '') || 'Unknown Title';

    const track: Track = {
      id: String(asset.id),
      title,
      artist: asset.mediaSubtypes?.join(', ') || 'Unknown Artist',
      album: 'Local Files',
      duration: Math.floor(asset.duration ?? 0),
      thumbnail: asset.uri,
      source: 'local',
      sourceUrl: asset.uri,
      filePath: asset.uri,
      isDownloaded: true,
      isLiked: false,
      addedAt: asset.creationTime ? asset.creationTime * 1000 : Date.now(),
      lastPlayed: 0,
      playCount: 0,
    };

    await upsertSong(track);
    scanned += 1;
    options.onProgress?.(Math.round((scanned / total) * 100), scanned, total);
  }

  if (mediaAssets.length === 0) {
    const fileUris = await findLocalAudioFilesFallback();

    for (const fileUri of fileUris) {
      const fallbackTrack: Track = {
        id: generateId('local'),
        title: fileNameFromUri(fileUri),
        artist: 'Unknown Artist',
        album: 'Local Files',
        duration: 0,
        thumbnail: '',
        source: 'local',
        sourceUrl: fileUri,
        filePath: fileUri,
        isDownloaded: true,
        isLiked: false,
        addedAt: Date.now(),
        lastPlayed: 0,
        playCount: 0,
      };

      await upsertSong(fallbackTrack);
      scanned += 1;
      options.onProgress?.(Math.round((scanned / Math.max(1, fileUris.length)) * 100), scanned, fileUris.length);
    }
  }

  await rebuildAlbumsFromSongs();
  await rebuildArtistsFromSongs();

  return scanned;
}