import { getDb } from '../client';
import { Album, Track } from '../../types';

interface AlbumRow {
  id: string;
  name: string;
  artist: string;
  thumbnail: string;
  year: string;
  songCount: number;
}

function mapAlbum(row: AlbumRow): Album {
  return {
    id: row.id,
    name: row.name,
    artist: row.artist,
    thumbnail: row.thumbnail,
    year: row.year,
    songCount: row.songCount,
  };
}

export async function rebuildAlbumsFromSongs(): Promise<void> {
  const db = await getDb();
  await db.execAsync('DELETE FROM albums;');

  await db.execAsync(`
    INSERT INTO albums (id, name, artist, thumbnail, year, songCount)
    SELECT
      lower(replace(coalesce(album, 'single'), ' ', '_')) || '_' || lower(replace(coalesce(artist, 'unknown'), ' ', '_')) AS id,
      coalesce(album, 'Single') as name,
      coalesce(artist, 'Unknown Artist') as artist,
      coalesce(max(thumbnail), '') as thumbnail,
      coalesce(max(year), '') as year,
      count(*) as songCount
    FROM songs
    GROUP BY coalesce(album, 'Single'), coalesce(artist, 'Unknown Artist');
  `);
}

export async function getAlbums(): Promise<Album[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<AlbumRow>('SELECT * FROM albums ORDER BY name COLLATE NOCASE ASC;');
  return rows.map(mapAlbum);
}

export async function getAlbumSongs(albumName: string, artist: string): Promise<Track[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM songs WHERE album = ? AND artist = ? ORDER BY title COLLATE NOCASE ASC;',
    [albumName, artist],
  );

  return rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    artist: row.artist,
    album: row.album,
    duration: row.duration,
    thumbnail: row.thumbnail,
    source: row.source,
    sourceUrl: row.sourceUrl,
    filePath: row.filePath,
    streamUrl: row.streamUrl,
    quality: row.quality,
    isDownloaded: row.isDownloaded === 1,
    isLiked: row.isLiked === 1,
    playCount: row.playCount,
    lastPlayed: row.lastPlayed,
    addedAt: row.addedAt,
    year: row.year,
    genre: row.genre,
    lyrics: row.lyrics,
  }));
}