import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FilterChips } from '../components/ui/FilterChips';
import { StorageCard } from '../components/download/StorageCard';
import { EmptyState } from '../components/ui/EmptyState';
import {
  BottomSheetMenu,
  BottomSheetMenuItem,
} from '../components/ui/BottomSheetMenu';
import { useDownloadStore } from '../store/downloadStore';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { useSettingsStore } from '../store/settingsStore';
import { Track, DownloadItem } from '../types';
import { RootStackParamList } from '../navigation/types';

const downloadsRoot = `${FileSystem.documentDirectory || ''}downloads`;

const filterChips = [
  { key: 'all', label: 'All' },
  { key: 'music', label: 'Music' },
];

async function directorySize(path: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return 0;
    if (!info.isDirectory) return info.size ?? 0;
    const entries = await FileSystem.readDirectoryAsync(path);
    const sizes = await Promise.all(entries.map((entry) => directorySize(`${path}/${entry}`)));
    return sizes.reduce((sum, value) => sum + value, 0);
  } catch {
    return 0;
  }
}

function DownloadingRow({ item }: { item: DownloadItem }) {
  const progressPercent = Math.min(100, Math.max(0, item.progress));
  const cancelDownload = useDownloadStore((state) => state.cancelDownload);

  return (
    <View style={styles.dlRow}>
      <View style={styles.dlThumbContainer}>
        {item.song.thumbnail ? (
          <Image
            source={{ uri: item.song.thumbnail }}
            style={styles.dlThumb}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.dlThumb, styles.dlThumbPlaceholder]}>
            <Ionicons name="musical-notes" size={20} color="#535353" />
          </View>
        )}
        {/* Spinner overlay */}
        <View style={styles.spinnerOverlay}>
          <Ionicons name="reload" size={20} color="#1DB954" />
        </View>
      </View>

      <View style={styles.dlInfo}>
        <Text style={styles.dlTitle} numberOfLines={1}>
          {item.song.title}
        </Text>
        <Text style={styles.dlSubtitle}>
          {Math.round(progressPercent)}%
          {item.eta ? ` • ${item.eta}s remaining` : ''}
          {item.message ? ` • ${item.message}` : ''}
        </Text>
        <View style={styles.dlProgressTrack}>
          <View style={[styles.dlProgressFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      <TouchableOpacity
        style={styles.dlCancelBtn}
        onPress={() => cancelDownload(item.id)}
      >
        <Ionicons name="close" size={20} color="#B3B3B3" />
      </TouchableOpacity>
    </View>
  );
}

function DownloadedRow({
  song,
  onPress,
  onMenuPress,
}: {
  song: Track;
  onPress: () => void;
  onMenuPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scale, { toValue: 0.97, duration: 100, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.songRow, { transform: [{ scale }] }]}>
        {song.thumbnail ? (
          <Image
            source={{ uri: song.thumbnail }}
            style={styles.songThumb}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.songThumb, styles.songThumbPlaceholder]}>
            <Ionicons name="musical-notes" size={20} color="#535353" />
          </View>
        )}

        <View style={styles.songInfo}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {song.title}
          </Text>
          <Text style={styles.songArtist} numberOfLines={1}>
            {song.artist}
          </Text>
        </View>

        <Ionicons
          name="checkmark-circle"
          size={20}
          color="#1DB954"
          style={{ marginRight: 8 }}
        />

        <TouchableOpacity style={styles.menuBtn} onPress={onMenuPress}>
          <Ionicons name="ellipsis-vertical" size={18} color="#B3B3B3" />
        </TouchableOpacity>
      </Animated.View>
    </Pressable>
  );
}

export function DownloadsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { activeDownloads, completedDownloads } = useDownloadStore();
  const library = useLibraryStore();
  const play = usePlayerStore((state) => state.play);
  const standaloneMode = useSettingsStore((state) => state.standaloneMode);

  const [activeFilter, setActiveFilter] = useState('all');
  const [storageBytes, setStorageBytes] = useState(0);
  const [totalDiskBytes, setTotalDiskBytes] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuTarget, setMenuTarget] = useState<Track | null>(null);

  const downloadedSongs = useMemo(
    () => library.songs.filter((s) => s.isDownloaded),
    [library.songs],
  );

  useEffect(() => {
    const loadStorage = async () => {
      const [used, total] = await Promise.all([
        directorySize(downloadsRoot),
        FileSystem.getFreeDiskStorageAsync().catch(() => 0),
      ]);
      setStorageBytes(used);
      setTotalDiskBytes(used + total);
    };
    loadStorage();
  }, [activeDownloads.length, completedDownloads.length]);

  const handlePlay = useCallback(
    async (song: Track) => {
      try {
        await play(song, downloadedSongs);
      } catch (error) {
        Alert.alert(
          'Playback failed',
          error instanceof Error ? error.message : 'Unable to play',
        );
      }
    },
    [play, downloadedSongs],
  );

  const handleMenuOpen = (song: Track) => {
    setMenuTarget(song);
    setMenuVisible(true);
  };

  const menuItems: BottomSheetMenuItem[] = useMemo(() => {
    if (!menuTarget) return [];
    return [
      {
        icon: 'play-skip-forward',
        label: 'Play next',
        onPress: () => {},
      },
      {
        icon: 'add',
        label: 'Add to playlist',
        onPress: () => {},
      },
      {
        icon: 'heart-outline',
        label: menuTarget.isLiked ? 'Unlike song' : 'Like song',
        onPress: () => {
          if (menuTarget) library.toggleLike(menuTarget.id);
        },
      },
      {
        icon: 'trash-outline',
        label: 'Remove download',
        onPress: () => {
          if (menuTarget) {
            Alert.alert(
              'Remove download',
              `Delete "${menuTarget.title}" from downloads?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Remove',
                  style: 'destructive',
                  onPress: () => library.removeSong(menuTarget.id),
                },
              ],
            );
          }
        },
        destructive: true,
      },
    ];
  }, [menuTarget, library]);

  const hasActiveDownloads = activeDownloads.length > 0;
  const hasDownloadedSongs = downloadedSongs.length > 0;
  const hasContent = hasActiveDownloads || hasDownloadedSongs;

  const renderHeader = () => (
    <View>
      {/* Storage Card */}
      <StorageCard
        downloadedCount={downloadedSongs.length}
        usedBytes={storageBytes}
        totalBytes={totalDiskBytes}
      />

      {/* Filter Row */}
      <FilterChips
        chips={filterChips}
        activeKey={activeFilter}
        onSelect={setActiveFilter}
      />

      {/* Active Downloads Section */}
      {hasActiveDownloads ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Downloading</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeDownloads.length}</Text>
            </View>
          </View>
          {activeDownloads.map((item) => (
            <DownloadingRow key={item.id} item={item} />
          ))}
        </View>
      ) : null}

      {/* Downloaded Songs Header */}
      {hasDownloadedSongs ? (
        <View style={styles.downloadedHeader}>
          <Text style={styles.sectionTitle}>
            {downloadedSongs.length} song{downloadedSongs.length !== 1 ? 's' : ''}
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Downloads</Text>
      </View>

      {/* Standalone Mode Notice */}
      {standaloneMode ? (
        <View style={styles.noticeCard}>
          <Ionicons name="information-circle" size={18} color="#7DE2A8" />
          <Text style={styles.noticeText}>
            Standalone mode — online downloads disabled
          </Text>
        </View>
      ) : null}

      {hasContent ? (
        <FlatList
          data={hasDownloadedSongs ? downloadedSongs : []}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => (
            <DownloadedRow
              song={item}
              onPress={() => handlePlay(item)}
              onMenuPress={() => handleMenuOpen(item)}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <StorageCard
            downloadedCount={0}
            usedBytes={storageBytes}
            totalBytes={totalDiskBytes}
          />
          <View style={styles.emptyInner}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="arrow-down-circle" size={64} color="#1DB954" />
            </View>
            <Text style={styles.emptyTitle}>No downloads yet</Text>
            <Text style={styles.emptyMessage}>
              Songs you download will appear here
            </Text>
            <TouchableOpacity
              style={styles.findMusicBtn}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Search' })}
            >
              <Text style={styles.findMusicText}>Find music to download</Text>
            </TouchableOpacity>
          </View>
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
        subtitle={menuTarget?.artist}
        items={menuItems}
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
    paddingHorizontal: 16,
    paddingBottom: 4,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: '#1A3D2A',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noticeText: {
    color: '#7DE2A8',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  section: {
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: '#1DB954',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '700',
  },
  downloadedHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  listContent: {
    paddingBottom: 140,
  },
  // Downloading row
  dlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  dlThumbContainer: {
    position: 'relative',
  },
  dlThumb: {
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: '#282828',
  },
  dlThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dlInfo: {
    flex: 1,
    gap: 2,
  },
  dlTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  dlSubtitle: {
    color: '#A0A0A0',
    fontSize: 13,
  },
  dlProgressTrack: {
    height: 3,
    backgroundColor: '#333333',
    borderRadius: 1.5,
    overflow: 'hidden',
    marginTop: 4,
  },
  dlProgressFill: {
    height: '100%',
    backgroundColor: '#1DB954',
  },
  dlCancelBtn: {
    padding: 8,
  },
  // Downloaded song row
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 72,
    paddingHorizontal: 16,
    gap: 12,
  },
  songThumb: {
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: '#282828',
  },
  songThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  songInfo: {
    flex: 1,
    gap: 2,
  },
  songTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  songArtist: {
    color: '#A0A0A0',
    fontSize: 13,
  },
  menuBtn: {
    padding: 8,
  },
  // Empty state
  emptyContainer: {
    flex: 1,
  },
  emptyInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  emptyIconContainer: {
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyMessage: {
    color: '#A0A0A0',
    fontSize: 14,
    textAlign: 'center',
  },
  findMusicBtn: {
    marginTop: 24,
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
