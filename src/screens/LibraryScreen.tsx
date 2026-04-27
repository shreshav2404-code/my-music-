import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { FilterChips } from '../components/ui/FilterChips';
import { LibraryItem, LibraryItemType } from '../components/library/LibraryItem';
import { EmptyState } from '../components/ui/EmptyState';
import {
  BottomSheetMenu,
  BottomSheetMenuItem,
} from '../components/ui/BottomSheetMenu';
import { BottomTabParamList, RootStackParamList } from '../navigation/types';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { useDownloadStore } from '../store/downloadStore';
import { resolveStreamByName, streamFromUrl } from '../services/api';
import { Track, Album, Artist, Playlist } from '../types';
import { kv } from '../utils/storage';

type FilterKey = 'all' | 'playlists' | 'albums' | 'artists' | 'downloaded';
type SortMode = 'recents' | 'recently_added' | 'alphabetical';
type ViewMode = 'list' | 'grid';

const filterChips = [
  { key: 'all', label: 'All' },
  { key: 'playlists', label: 'Playlists' },
  { key: 'albums', label: 'Albums' },
  { key: 'artists', label: 'Artists' },
  { key: 'downloaded', label: 'Downloaded' },
];

interface LibraryEntry {
  id: string;
  type: LibraryItemType;
  title: string;
  subtitle: string;
  thumbnail?: string;
  isPinned?: boolean;
  data: Track | Album | Artist | Playlist | null;
}

export function LibraryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<BottomTabParamList, 'Library'>>();
  const library = useLibraryStore();
  const play = usePlayerStore((state) => state.play);
  const startDownload = useDownloadStore((state) => state.startDownload);


  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [sortMode, setSortMode] = useState<SortMode>('recents');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stored = kv.getString('library.viewMode');
    return stored === 'grid' ? 'grid' : 'list';
  });
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuTarget, setMenuTarget] = useState<LibraryEntry | null>(null);

  useEffect(() => {
    if (route.params?.initialTab) {
      const tabMap: Record<string, FilterKey> = {
        Songs: 'all',
        Albums: 'albums',
        Artists: 'artists',
        Playlists: 'playlists',
      };
      setActiveFilter(tabMap[route.params.initialTab] || 'all');
    }
    if (route.params?.initialFilter === 'downloaded') {
      setActiveFilter('downloaded');
    }
  }, [route.params?.requestId, route.params?.initialTab, route.params?.initialFilter]);

  const toggleViewMode = useCallback(() => {
    const next = viewMode === 'list' ? 'grid' : 'list';
    setViewMode(next);
    kv.set('library.viewMode', next);
  }, [viewMode]);

  // Build unified library entries
  const entries = useMemo(() => {
    const items: LibraryEntry[] = [];

    // Pinned items always show at top for 'all' filter
    if (activeFilter === 'all' || activeFilter === 'playlists') {
      // Liked Songs pinned entry
      const likedCount = library.songs.filter((s) => s.isLiked).length;
      items.push({
        id: '__liked__',
        type: 'liked',
        title: 'Liked Songs',
        subtitle: `Playlist • ${likedCount} song${likedCount !== 1 ? 's' : ''}`,
        isPinned: true,
        data: null,
      });
    }

    if (activeFilter === 'all' || activeFilter === 'downloaded') {
      // Downloaded pinned entry
      const dlCount = library.songs.filter((s) => s.isDownloaded).length;
      items.push({
        id: '__downloaded__',
        type: 'downloaded',
        title: 'Downloaded',
        subtitle: `${dlCount} song${dlCount !== 1 ? 's' : ''} downloaded`,
        isPinned: true,
        data: null,
      });
    }

    // Playlists
    if (activeFilter === 'all' || activeFilter === 'playlists') {
      library.playlists.forEach((p) => {
        items.push({
          id: `playlist_${p.id}`,
          type: 'playlist',
          title: p.name,
          subtitle: `Playlist`,
          thumbnail: p.thumbnail || undefined,
          data: p,
        });
      });
    }

    // Albums
    if (activeFilter === 'all' || activeFilter === 'albums') {
      library.albums.forEach((a) => {
        items.push({
          id: `album_${a.id}`,
          type: 'album',
          title: a.name,
          subtitle: `Album • ${a.artist}`,
          thumbnail: a.thumbnail || undefined,
          data: a,
        });
      });
    }

    // Artists
    if (activeFilter === 'all' || activeFilter === 'artists') {
      library.artists.forEach((a) => {
        items.push({
          id: `artist_${a.id}`,
          type: 'artist',
          title: a.name,
          subtitle: 'Artist',
          thumbnail: a.thumbnail || undefined,
          data: a,
        });
      });
    }

    // Downloaded songs (only in the downloaded filter)
    if (activeFilter === 'downloaded') {
      library.songs
        .filter((s) => s.isDownloaded)
        .forEach((s) => {
          items.push({
            id: `song_${s.id}`,
            type: 'playlist', // Use playlist styling for songs in downloaded
            title: s.title,
            subtitle: `${s.artist}`,
            thumbnail: s.thumbnail || undefined,
            data: s,
          });
        });
    }

    // Sort
    if (sortMode === 'alphabetical') {
      const pinned = items.filter((i) => i.isPinned);
      const unpinned = items.filter((i) => !i.isPinned);
      unpinned.sort((a, b) => a.title.localeCompare(b.title));
      return [...pinned, ...unpinned];
    }

    return items;
  }, [activeFilter, sortMode, library.songs, library.playlists, library.albums, library.artists]);

  const handleItemPress = (entry: LibraryEntry) => {
    if (entry.id === '__liked__') {
      navigation.navigate('MainTabs', {
        screen: 'Library',
        params: { initialTab: 'Songs', initialFilter: 'liked', requestId: Date.now() },
      });
      return;
    }
    if (entry.id === '__downloaded__') {
      navigation.navigate('MainTabs', {
        screen: 'Downloads',
      });
      return;
    }
    if (entry.type === 'playlist' && entry.data && 'createdAt' in entry.data) {
      navigation.navigate('Playlist', { playlistId: (entry.data as Playlist).id });
      return;
    }
    if (entry.type === 'album' && entry.data && 'songCount' in entry.data) {
      const album = entry.data as Album;
      navigation.navigate('Album', { albumName: album.name, artist: album.artist });
      return;
    }
    if (entry.type === 'artist' && entry.data) {
      navigation.navigate('Artist', { artistName: (entry.data as Artist).name });
      return;
    }
    // If it's a downloaded song, play it
    if (entry.data && 'title' in entry.data && 'artist' in entry.data) {
      handlePlay(entry.data as Track);
    }
  };

  const handleItemLongPress = (entry: LibraryEntry) => {
    setMenuTarget(entry);
    setMenuVisible(true);
  };

  const resolvePlayableTrack = async (song: Track): Promise<Track> => {
    if (song.filePath || song.streamUrl) {
      return song;
    }
    if (song.sourceUrl?.startsWith('http')) {
      try {
        const streamed = await streamFromUrl(song.sourceUrl, 'high');
        return {
          ...song,
          streamUrl: streamed.streamUrl,
          sourceUrl: streamed.sourceUrl,
          duration: song.duration || streamed.duration,
          thumbnail: song.thumbnail || streamed.thumbnail,
          artist: song.artist || streamed.artist,
          source: streamed.source,
        };
      } catch {
        // fallback to query resolution
      }
    }
    const resolved = await resolveStreamByName(`${song.title} ${song.artist}`, 'high');
    return {
      ...song,
      streamUrl: resolved.streamUrl,
      sourceUrl: resolved.sourceUrl,
      duration: song.duration || resolved.duration,
      thumbnail: song.thumbnail || resolved.thumbnail,
      artist: song.artist || resolved.artist,
      source: resolved.source,
    };
  };

  const handlePlay = async (song: Track) => {
    try {
      const playable = await resolvePlayableTrack(song);
      await play(playable, []);
      void library.addSong(playable);
    } catch (error) {
      Alert.alert('Playback failed', error instanceof Error ? error.message : 'Unable to play this track');
    }
  };

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      library.createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setShowCreatePlaylist(false);
    }
  };

  const cycleSortMode = () => {
    const modes: SortMode[] = ['recents', 'recently_added', 'alphabetical'];
    const idx = modes.indexOf(sortMode);
    setSortMode(modes[(idx + 1) % modes.length]);
  };

  const sortLabel = sortMode === 'recents' ? 'Recents' : sortMode === 'recently_added' ? 'Recently Added' : 'Alphabetical';

  const getMenuItems = (): BottomSheetMenuItem[] => {
    if (!menuTarget) return [];
    const items: BottomSheetMenuItem[] = [];

    if (menuTarget.data && 'streamUrl' in menuTarget.data) {
      items.push({
        icon: 'play',
        label: 'Play',
        onPress: () => {
          if (menuTarget.data) handlePlay(menuTarget.data as Track);
        },
      });
      items.push({
        icon: 'list',
        label: 'Add to queue',
        onPress: () => {},
      });
    }

    items.push({
      icon: 'pin',
      label: 'Pin to library',
      onPress: () => {},
    });
    items.push({
      icon: 'share-outline',
      label: 'Share',
      onPress: () => {},
    });
    items.push({
      icon: 'trash-outline',
      label: 'Remove from library',
      onPress: () => {},
      destructive: true,
    });

    return items;
  };

  const renderListItem = ({ item }: { item: LibraryEntry }) => (
    <LibraryItem
      type={item.type}
      title={item.title}
      subtitle={item.subtitle}
      thumbnail={item.thumbnail}
      isPinned={item.isPinned}
      onPress={() => handleItemPress(item)}
      onLongPress={() => handleItemLongPress(item)}
    />
  );

  const renderGridItem = ({ item }: { item: LibraryEntry }) => {
    const isCircle = item.type === 'artist';

    const renderGridThumb = () => {
      if (item.type === 'liked') {
        return (
          <View style={[gridStyles.specialThumb, { backgroundColor: '#7B4FBF' }]}>
            <Ionicons name="heart" size={32} color="#FFFFFF" />
          </View>
        );
      }
      if (item.type === 'downloaded') {
        return (
          <View style={[gridStyles.specialThumb, { backgroundColor: '#282828' }]}>
            <Ionicons name="arrow-down-circle" size={32} color="#1DB954" />
          </View>
        );
      }
      if (item.thumbnail) {
        return (
          <Image
            source={{ uri: item.thumbnail }}
            style={[gridStyles.thumb, isCircle && gridStyles.thumbCircle]}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        );
      }
      return (
        <View style={[gridStyles.thumb, gridStyles.placeholder, isCircle && gridStyles.thumbCircle]}>
          <Ionicons
            name={
              item.type === 'artist' ? 'person' : item.type === 'album' ? 'disc' : 'musical-notes'
            }
            size={28}
            color="#535353"
          />
        </View>
      );
    };

    return (
      <Pressable style={gridStyles.card} onPress={() => handleItemPress(item)} onLongPress={() => handleItemLongPress(item)}>
        {renderGridThumb()}
        <Text style={gridStyles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={gridStyles.subtitle} numberOfLines={1}>
          {item.subtitle}
        </Text>
      </Pressable>
    );
  };

  const hasContent = entries.length > 0;
  const emptyMessages: Record<FilterKey, { title: string; message: string }> = {
    all: { title: 'Your library is empty', message: 'Songs you save will appear here' },
    playlists: { title: 'No playlists yet', message: 'Create a playlist to get started' },
    albums: { title: 'No albums yet', message: 'Albums will appear once songs are indexed' },
    artists: { title: 'No artists yet', message: 'Artists are generated from your songs' },
    downloaded: { title: 'No downloads yet', message: 'Songs you download will appear here' },
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Library</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() =>
              navigation.navigate('MainTabs', {
                screen: 'Search',
              })
            }
          >
            <Ionicons name="search" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setShowCreatePlaylist(!showCreatePlaylist)}
          >
            <Ionicons name="add" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Create Playlist Input */}
      {showCreatePlaylist ? (
        <View style={styles.createRow}>
          <TextInput
            value={newPlaylistName}
            onChangeText={setNewPlaylistName}
            style={styles.createInput}
            placeholder="Playlist name"
            placeholderTextColor="#727272"
            autoFocus
            onSubmitEditing={handleCreatePlaylist}
          />
          <TouchableOpacity style={styles.createBtn} onPress={handleCreatePlaylist}>
            <Text style={styles.createBtnText}>Create</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Filter Chips */}
      <FilterChips
        chips={filterChips}
        activeKey={activeFilter}
        onSelect={(key) => setActiveFilter(key as FilterKey)}
      />

      {/* Sort / View Toggle */}
      <View style={styles.sortRow}>
        <TouchableOpacity style={styles.sortBtn} onPress={cycleSortMode}>
          <Text style={styles.sortText}>{sortLabel}</Text>
          <Ionicons name="chevron-down" size={14} color="#727272" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.viewToggle} onPress={toggleViewMode}>
          <Ionicons
            name={viewMode === 'list' ? 'grid-outline' : 'list-outline'}
            size={20}
            color="#727272"
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {hasContent ? (
        viewMode === 'list' ? (
          <FlatList
            key="list"
            data={entries}
            keyExtractor={(item) => item.id}
            renderItem={renderListItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <FlatList
            key="grid"
            data={entries}
            keyExtractor={(item) => item.id}
            renderItem={renderGridItem}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={gridStyles.row}
          />
        )
      ) : (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="musical-notes-outline"
            title={emptyMessages[activeFilter].title}
            message={emptyMessages[activeFilter].message}
          />
          <TouchableOpacity
            style={styles.findMusicBtn}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Search' })}
          >
            <Text style={styles.findMusicText}>Find some music</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Sheet Menu */}
      <BottomSheetMenu
        visible={menuVisible}
        onClose={() => {
          setMenuVisible(false);
          setMenuTarget(null);
        }}
        title={menuTarget?.title}
        subtitle={menuTarget?.subtitle}
        items={getMenuItems()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: 56,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIconBtn: {
    padding: 4,
  },
  createRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  createInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#282828',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    fontSize: 14,
  },
  createBtn: {
    height: 40,
    borderRadius: 8,
    backgroundColor: '#1DB954',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  createBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortText: {
    color: '#727272',
    fontSize: 12,
    fontWeight: '400',
  },
  viewToggle: {
    padding: 4,
  },
  listContent: {
    paddingBottom: 140,
  },
  gridContent: {
    paddingHorizontal: 8,
    paddingBottom: 140,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  findMusicBtn: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  findMusicText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
});

const gridStyles = StyleSheet.create({
  row: {
    gap: 8,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    gap: 4,
  },
  thumb: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 4,
    backgroundColor: '#282828',
  },
  thumbCircle: {
    borderRadius: 999,
  },
  specialThumb: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  subtitle: {
    color: '#A0A0A0',
    fontSize: 11,
    fontWeight: '400',
  },
});
