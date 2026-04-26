import { getDb } from '../client';
import { Artist, Track } from '../../types';

interface ArtistRow {
  id: string;
  name: string;
  thumbnail: string;
  songCount: number;
}

function mapArtist(row: ArtistRow): Artist {
  return {
    id: row.id,
    name: row.name,
    thumbnail: row.thumbnail,
    songCount: row.songCount,
  };
}

export async function rebuildArtistsFromSongs(): Promise<void> {
  const db = await getDb();
  await db.execAsync('DELETE FROM artists;');

  await db.execAsync(`
    INSERT INTO artists (id, name, thumbnail, songCount)
    SELECT
      lower(replace(coalesce(artist, 'unknown artist'), ' ', '_')) as id,
      coalesce(artist, 'Unknown Artist') as name,
      coalesce(max(thumbnail), '') as thumbnail,
      count(*) as songCount
    FROM songs
    GROUP BY coalesce(artist, 'Unknown Artist');
  `);
}

export async function getArtists(): Promise<Artist[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ArtistRow>('SELECT * FROM artists ORDER BY name COLLATE NOCASE ASC;');
  return rows.map(mapArtist);
}

export async function getArtistSongs(artistName: string): Promise<Track[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM songs WHERE artist = ? ORDER BY title COLLATE NOCASE ASC;',
    [artistName],
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