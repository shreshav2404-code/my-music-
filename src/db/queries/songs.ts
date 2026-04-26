import { getDb } from '../client';
import { Track } from '../../types';

interface SongRow {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  thumbnail: string;
  filePath: string;
  streamUrl: string;
  sourceUrl: string;
  source: Track['source'];
  quality: string;
  isDownloaded: number;
  isLiked: number;
  playCount: number;
  lastPlayed: number;
  addedAt: number;
  year: string;
  genre: string;
  lyrics: string;
}

function mapSongRow(row: SongRow): Track {
  return {
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
  };
}

export async function upsertSong(song: Track): Promise<void> {
  const db = await getDb();
  const now = Date.now();

  await db.runAsync(
    `INSERT INTO songs (
      id, title, artist, album, duration, thumbnail, filePath, streamUrl,
      sourceUrl, source, quality, isDownloaded, isLiked, playCount,
      lastPlayed, addedAt, year, genre, lyrics
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title,
      artist=excluded.artist,
      album=excluded.album,
      duration=excluded.duration,
      thumbnail=excluded.thumbnail,
      filePath=excluded.filePath,
      streamUrl=excluded.streamUrl,
      sourceUrl=excluded.sourceUrl,
      source=excluded.source,
      quality=excluded.quality,
      isDownloaded=excluded.isDownloaded,
      isLiked=excluded.isLiked,
      playCount=excluded.playCount,
      lastPlayed=excluded.lastPlayed,
      addedAt=excluded.addedAt,
      year=excluded.year,
      genre=excluded.genre,
      lyrics=excluded.lyrics;`,
    [
      song.id,
      song.title,
      song.artist,
      song.album,
      song.duration,
      song.thumbnail,
      song.filePath ?? '',
      song.streamUrl ?? '',
      song.sourceUrl,
      song.source,
      song.quality ?? '',
      song.isDownloaded ? 1 : 0,
      song.isLiked ? 1 : 0,
      song.playCount ?? 0,
      song.lastPlayed ?? 0,
      song.addedAt ?? now,
      song.year ?? '',
      song.genre ?? '',
      song.lyrics ?? '',
    ],
  );
}

export async function getSongs(orderBy: 'recent' | 'az' | 'mostPlayed' | 'recentlyPlayed' = 'recent'): Promise<Track[]> {
  const db = await getDb();

  let orderClause = 'addedAt DESC';
  if (orderBy === 'az') {
    orderClause = 'title COLLATE NOCASE ASC';
  } else if (orderBy === 'mostPlayed') {
    orderClause = 'playCount DESC';
  } else if (orderBy === 'recentlyPlayed') {
    orderClause = 'lastPlayed DESC';
  }

  const rows = await db.getAllAsync<SongRow>(`SELECT * FROM songs ORDER BY ${orderClause};`);
  return rows.map(mapSongRow);
}

export async function getSongById(songId: string): Promise<Track | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<SongRow>('SELECT * FROM songs WHERE id = ? LIMIT 1;', [songId]);
  if (!row) {
    return null;
  }

  return mapSongRow(row);
}

export async function deleteSong(songId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM songs WHERE id = ?;', [songId]);
  await db.runAsync('DELETE FROM playlist_songs WHERE songId = ?;', [songId]);
}

export async function setLike(songId: string, isLiked: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE songs SET isLiked = ? WHERE id = ?;', [isLiked ? 1 : 0, songId]);
}

export async function setDownloaded(songId: string, filePath: string, quality: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE songs SET isDownloaded = 1, filePath = ?, quality = ? WHERE id = ?;',
    [filePath, quality, songId],
  );
}

export async function incrementPlay(songId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE songs SET playCount = playCount + 1, lastPlayed = ? WHERE id = ?;',
    [Date.now(), songId],
  );
}

export async function filterSongs(filter: 'all' | 'downloaded' | 'liked'): Promise<Track[]> {
  const db = await getDb();
  let sql = 'SELECT * FROM songs ORDER BY addedAt DESC';

  if (filter === 'downloaded') {
    sql = 'SELECT * FROM songs WHERE isDownloaded = 1 ORDER BY addedAt DESC';
  }

  if (filter === 'liked') {
    sql = 'SELECT * FROM songs WHERE isLiked = 1 ORDER BY addedAt DESC';
  }

  const rows = await db.getAllAsync<SongRow>(sql);
  return rows.map(mapSongRow);
}

export async function saveLyrics(songId: string, lyrics: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE songs SET lyrics = ? WHERE id = ?;', [lyrics, songId]);
}