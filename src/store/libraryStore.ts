import { create } from 'zustand';
import { Album, Artist, Playlist, Track } from '../types';
import {
  deleteSong,
  filterSongs,
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
  getPlaylists,
} from '../db/queries/playlists';
import { generateId } from '../utils/string';

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
      likedSongs: songs.filter((song) => song.isLiked).map((song) => song.id),
      recentlyPlayed: [...songs]
        .filter((song) => (song.lastPlayed ?? 0) > 0)
        .sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0))
        .slice(0, 20),
      isLoading: false,
    });
  },
  addSong: async (song) => {
    await upsertSong(song);
    await get().refreshGroups();
    const songs = await getSongs('recent');
    set({ songs, likedSongs: songs.filter((item) => item.isLiked).map((item) => item.id) });
  },
  removeSong: async (id) => {
    await deleteSong(id);
    const songs = await getSongs('recent');
    set({ songs });
    await get().refreshGroups();
  },
  toggleLike: async (songId) => {
    const target = get().songs.find((song) => song.id === songId);
    const nextLiked = !(target?.isLiked ?? false);
    await setLike(songId, nextLiked);
    const songs = await getSongs('recent');
    set({
      songs,
      likedSongs: songs.filter((song) => song.isLiked).map((song) => song.id),
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
  addToPlaylist: async (playlistId, songId) => {
    await addSongToPlaylist(playlistId, songId);
    const playlists = await getPlaylists();
    set({ playlists });
  },
  markPlayed: async (song) => {
    const now = Date.now();
    await incrementPlay(song.id);
    const songs = await getSongs('recent');
    const updatedSong: Track = {
      ...song,
      lastPlayed: now,
      playCount: (song.playCount ?? 0) + 1,
    };
    set({
      songs,
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
