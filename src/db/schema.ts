export const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS songs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT DEFAULT '',
    album TEXT DEFAULT '',
    duration INTEGER DEFAULT 0,
    thumbnail TEXT DEFAULT '',
    filePath TEXT DEFAULT '',
    streamUrl TEXT DEFAULT '',
    sourceUrl TEXT DEFAULT '',
    source TEXT DEFAULT 'youtube',
    quality TEXT DEFAULT '',
    isDownloaded INTEGER DEFAULT 0,
    isLiked INTEGER DEFAULT 0,
    playCount INTEGER DEFAULT 0,
    lastPlayed INTEGER DEFAULT 0,
    addedAt INTEGER DEFAULT 0,
    year TEXT DEFAULT '',
    genre TEXT DEFAULT '',
    lyrics TEXT DEFAULT ''
  );`,
  `CREATE TABLE IF NOT EXISTS playlists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    thumbnail TEXT DEFAULT '',
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS playlist_songs (
    playlistId TEXT NOT NULL,
    songId TEXT NOT NULL,
    position INTEGER NOT NULL,
    addedAt INTEGER NOT NULL,
    PRIMARY KEY (playlistId, songId)
  );`,
  `CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    artist TEXT DEFAULT '',
    thumbnail TEXT DEFAULT '',
    year TEXT DEFAULT '',
    songCount INTEGER DEFAULT 0
  );`,
  `CREATE TABLE IF NOT EXISTS artists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    thumbnail TEXT DEFAULT '',
    songCount INTEGER DEFAULT 0
  );`,
  `CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);`,
  `CREATE INDEX IF NOT EXISTS idx_songs_album ON songs(album);`,
  `CREATE INDEX IF NOT EXISTS idx_songs_addedAt ON songs(addedAt DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_songs_playCount ON songs(playCount DESC);`,
];