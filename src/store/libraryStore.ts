import { create } from 'zustand';
import { Album, Artist, Playlist, Track } from '../types';
import {
  deleteSong,
  filterSongs,
  getSongById,
  getSongs,
  incrementPlay,
  setLike,
  upsertSong,
} from '../db/queries/songs';
import { getAlbums, rebuildAlbumsFromSongs } from '../db/queries/albums';
import { getArtists, rebuildArtistsFromSongs } from '../db/queries/artists';
import {
  addSongToPlaylist,
  createPlaylist as createPlaylistQuery,
  deletePlaylist as deletePlaylistQuery,
  getPlaylists,
} from '../db/queries/playlists';
import { deleteDownloadedFile } from '../services/downloader';
import { generateId } from '../utils/string';

/**
 * Search results and pasted links don't carry likes, downloads or play
 * counts, so writing them over a stored row as-is would wipe those out.
 */
function mergeTrack(existing: Track, incoming: Track): Track {
  return {
    ...incoming,
    ...existing,
    title: existing.title || incoming.title,
    artist: existing.artist || incoming.artist,
    album: existing.album || incoming.album,
    duration: existing.duration || incoming.duration,
    thumbnail: existing.thumbnail || incoming.thumbnail,
    sourceUrl: existing.sourceUrl || incoming.sourceUrl,
  };
}

function likedIds(songs: Track[]): string[] {
  return songs.filter((song) => song.isLiked).map((song) => song.id);
}

interface LibraryState {
  songs: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
  likedSongs: string[];
  recentlyPlayed: Track[];
  isLoading: boolean;
  loadFromDB: () => Promise<void>;
  addSong: (song: Track) => Promise<void>;
  removeSong: (id: string) => Promise<void>;
  toggleLike: (songId: string) => Promise<void>;
  createPlaylist: (name: string, description?: string) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  addToPlaylist: (playlistId: string, songId: string) => Promise<void>;
  markPlayed: (song: Track) => Promise<void>;
  refreshGroups: () => Promise<void>;
  applyFilter: (filter: 'all' | 'downloaded' | 'liked') => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  songs: [],
  albums: [],
  artists: [],
  playlists: [],
  likedSongs: [],
  recentlyPlayed: [],
  isLoading: false,
  loadFromDB: async () => {
    set({ isLoading: true });
    const [songs, albums, artists, playlists] = await Promise.all([
      getSongs('recent'),
      getAlbums(),
      getArtists(),
      getPlaylists(),
    ]);

    set({
      songs,
      albums,
      artists,
      playlists,
      likedSongs: likedIds(songs),
      recentlyPlayed: [...songs]
        .filter((song) => (song.lastPlayed ?? 0) > 0)
        .sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0))
        .slice(0, 20),
      isLoading: false,
    });
  },
  addSong: async (song) => {
    const existing = await getSongById(song.id);
    await upsertSong(existing ? mergeTrack(existing, song) : song);
    await get().refreshGroups();
    const songs = await getSongs('recent');
    set({ songs, likedSongs: likedIds(songs) });
  },
  removeSong: async (id) => {
    const removed = get().songs.find((song) => song.id === id);
    await deleteSong(id);
    if (removed?.filePath) {
      await deleteDownloadedFile(removed.filePath);
    }
    const songs = await getSongs('recent');
    set({
      songs,
      likedSongs: likedIds(songs),
      recentlyPlayed: get().recentlyPlayed.filter((song) => song.id !== id),
    });
    await get().refreshGroups();
  },
  toggleLike: async (songId) => {
    const target = get().songs.find((song) => song.id === songId);
    const nextLiked = !(target?.isLiked ?? false);
    await setLike(songId, nextLiked);
    const songs = await getSongs('recent');
    set({
      songs,
      likedSongs: likedIds(songs),
    });
  },
  createPlaylist: async (name, description = '') => {
    await createPlaylistQuery({
      id: generateId('playlist'),
      name,
      description,
      thumbnail: '',
    });
    const playlists = await getPlaylists();
    set({ playlists });
  },
  deletePlaylist: async (playlistId) => {
    await deletePlaylistQuery(playlistId);
    const playlists = await getPlaylists();
    set({ playlists });
  },
  addToPlaylist: async (playlistId, songId) => {
    await addSongToPlaylist(playlistId, songId);
    const playlists = await getPlaylists();
    set({ playlists });
  },
  markPlayed: async (song) => {
    const now = Date.now();
    // Queued tracks may not have been saved yet; history needs the row.
    if (!(await getSongById(song.id))) {
      await upsertSong({ ...song, addedAt: now });
    }
    await incrementPlay(song.id);
    const songs = await getSongs('recent');
    const updatedSong: Track = songs.find((entry) => entry.id === song.id) ?? {
      ...song,
      lastPlayed: now,
      playCount: (song.playCount ?? 0) + 1,
    };
    set({
      songs,
      likedSongs: likedIds(songs),
      recentlyPlayed: [updatedSong, ...get().recentlyPlayed.filter((entry) => entry.id !== song.id)].slice(0, 20),
    });
  },
  refreshGroups: async () => {
    await rebuildAlbumsFromSongs();
    await rebuildArtistsFromSongs();
    const [albums, artists] = await Promise.all([getAlbums(), getArtists()]);
    set({ albums, artists });
  },
  applyFilter: async (filter) => {
    const songs = await filterSongs(filter);
    set({ songs });
  },
}));
