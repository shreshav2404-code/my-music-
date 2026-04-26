import { getDb } from '../client';
import { Playlist, Track } from '../../types';

interface PlaylistRow {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  createdAt: number;
  updatedAt: number;
}

function mapPlaylist(row: PlaylistRow): Playlist {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    thumbnail: row.thumbnail,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getPlaylists(): Promise<Playlist[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PlaylistRow>('SELECT * FROM playlists ORDER BY updatedAt DESC;');
  return rows.map(mapPlaylist);
}

export async function createPlaylist(input: Omit<Playlist, 'createdAt' | 'updatedAt'>): Promise<void> {
  const db = await getDb();
  const now = Date.now();

  await db.runAsync(
    `INSERT INTO playlists (id, name, description, thumbnail, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?);`,
    [input.id, input.name, input.description, input.thumbnail, now, now],
  );
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM playlists WHERE id = ?;', [playlistId]);
  await db.runAsync('DELETE FROM playlist_songs WHERE playlistId = ?;', [playlistId]);
}

export async function addSongToPlaylist(playlistId: string, songId: string): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ maxPos: number }>(
    'SELECT COALESCE(MAX(position), 0) AS maxPos FROM playlist_songs WHERE playlistId = ?;',
    [playlistId],
  );

  const nextPos = (row?.maxPos ?? 0) + 1;

  await db.runAsync(
    `INSERT OR REPLACE INTO playlist_songs (playlistId, songId, position, addedAt)
     VALUES (?, ?, ?, ?);`,
    [playlistId, songId, nextPos, Date.now()],
  );

  await db.runAsync('UPDATE playlists SET updatedAt = ? WHERE id = ?;', [Date.now(), playlistId]);
}

export async function removeSongFromPlaylist(playlistId: string, songId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM playlist_songs WHERE playlistId = ? AND songId = ?;', [playlistId, songId]);
}

export async function getPlaylistSongs(playlistId: string): Promise<Track[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT s.* FROM playlist_songs ps
     JOIN songs s ON s.id = ps.songId
     WHERE ps.playlistId = ?
     ORDER BY ps.position ASC;`,
    [playlistId],
  );

  return rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    artist: row.artist,
    album: row.album,
    duration: row.duration,
    thumbnail: row.thumbnail,
    filePath: row.filePath,
    streamUrl: row.streamUrl,
    sourceUrl: row.sourceUrl,
    source: row.source,
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