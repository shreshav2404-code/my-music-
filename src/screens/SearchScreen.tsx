import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useSearch } from '../hooks/useSearch';
import { SearchBar } from '../components/search/SearchBar';
import { SearchResults } from '../components/search/SearchResults';
import { isUrl } from '../utils/string';
import { streamFromUrl, resolveVideoUrl, trackFromStream } from '../services/api';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { usePlayerStore } from '../store/playerStore';
import { Track } from '../types';
import { useDownloadStore } from '../store/downloadStore';
import { useLibraryStore } from '../store/libraryStore';
import { useSettingsStore } from '../store/settingsStore';
import { BottomSheetMenu, BottomSheetMenuItem } from '../components/ui/BottomSheetMenu';
import { BottomTabParamList } from '../navigation/types';

const filters: Array<'all' | 'youtube' | 'jamendo'> = ['all', 'youtube', 'jamendo'];

export function SearchScreen() {
  const route = useRoute<RouteProp<BottomTabParamList, 'Search'>>();
  const [input, setInput] = useState('');
  const searchStore = useSearch();
  const playAction = usePlayerStore((state) => state.play);
  const addToQueue = usePlayerStore((state) => state.addToQueue);
  const playNext = usePlayerStore((state) => state.playNext);
  const loadingTrackId = usePlayerStore((state) => state.loadingTrackId);
  const downloadAction = useDownloadStore((state) => state.startDownload);
  const downloadQuality = useSettingsStore((state) => state.downloadQuality);
  const libraryAdd = useLibraryStore((state) => state.addSong);
  const [menuTarget, setMenuTarget] = useState<Track | null>(null);

  const presentError = (error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage;
    Alert.alert('Action failed', message);
  };

  useEffect(() => {
    const prefill = route.params?.prefillQuery?.trim();
    if (!prefill) {
      return;
    }

    setInput(prefill);
    void searchStore.search(prefill);
  }, [route.params?.requestId]);

  const runSearch = async () => {
    if (!input.trim()) {
      return;
    }

    try {
      if (isUrl(input.trim())) {
        const url = input.trim();
        Alert.alert(
          'Link Detected',
          'What would you like to do with this link?',
          [
            {
              text: 'Play Audio',
              onPress: async () => {
                try {
                  const track = trackFromStream(await streamFromUrl(url, 'high'));
                  searchStore.setResults([track]);
                  await libraryAdd(track);
                  await playAction(track, []);
                } catch (e) {
                  presentError(e, 'Failed to play audio');
                }
              }
            },
            {
              text: 'Download Audio (MP3)',
              onPress: async () => {
                try {
                  Alert.alert('Fetching...', 'Resolving audio stream...');
                  const track = trackFromStream(await streamFromUrl(url, 'high'));
                  searchStore.setResults([track]);
                  void downloadAction(track, downloadQuality);
                } catch (e) {
                  presentError(e, 'Failed to download audio');
                }
              }
            },
            {
              text: 'Download Video (MP4)',
              onPress: async () => {
                try {
                  Alert.alert('Downloading...', 'Please wait while we fetch the video file.');
                  const videoData = await resolveVideoUrl(url);
                  
                  const { status } = await MediaLibrary.requestPermissionsAsync();
                  if (status !== 'granted') {
                    Alert.alert('Permission needed', 'We need storage permission to save the video.');
                    return;
                  }

                  const safeTitle = videoData.title.replace(/[<>:"/\\|?*]+/g, '').slice(0, 50);
                  const fileUri = `${FileSystem.documentDirectory}${safeTitle}.mp4`;

                  const { uri } = await FileSystem.downloadAsync(videoData.videoUrl, fileUri);
                  await MediaLibrary.saveToLibraryAsync(uri);
                  await FileSystem.deleteAsync(uri, { idempotent: true });

                  Alert.alert('Success!', 'Video saved directly to your phone gallery!');
                } catch (e) {
                  presentError(e, 'Failed to download video');
                }
              }
            }
          ],
          { cancelable: true }
        );
        return;
      }

      await searchStore.search(input);
    } catch (error) {
      presentError(error, 'Unable to search right now');
    }
  };

  // The player resolves a fresh stream itself (straight from the video id for
  // YouTube results, so the exact video you tapped is the one that plays).
  const playTrack = async (track: Track) => {
    try {
      await libraryAdd(track);
      await playAction(track, []);
    } catch (error) {
      presentError(error, 'Unable to play this track');
    }
  };

  const menuItems: BottomSheetMenuItem[] = menuTarget
    ? [
        {
          icon: 'play-skip-forward',
          label: 'Play next',
          onPress: () => {
            void playNext(menuTarget).catch((error) => presentError(error, 'Unable to queue this track'));
          },
        },
        {
          icon: 'list',
          label: 'Add to queue',
          onPress: () => {
            void addToQueue(menuTarget).catch((error) => presentError(error, 'Unable to queue this track'));
          },
        },
        {
          icon: 'download-outline',
          label: 'Download',
          onPress: () => {
            void downloadAction(menuTarget, downloadQuality);
          },
        },
      ]
    : [];

  const changeFilter = (filter: (typeof filters)[number]) => {
    searchStore.setSourceFilter(filter);
    const query = input.trim() || searchStore.query;
    if (query) {
      void searchStore.search(query);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topArea}>
        <SearchBar value={input} onChangeText={setInput} onSubmit={runSearch} onClear={() => setInput('')} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, searchStore.sourceFilter === filter && styles.filterChipActive]}
              onPress={() => changeFilter(filter)}
            >
              <Text style={[styles.filterText, searchStore.sourceFilter === filter && styles.filterTextActive]}>
                {filter.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {!searchStore.query && searchStore.results.length === 0 ? (
        <ScrollView contentContainerStyle={styles.discoveryWrap}>
          <Text style={styles.sectionTitle}>Trending Searches</Text>
          {searchStore.trending.map((entry) => (
            <TouchableOpacity
              key={entry}
              style={styles.discoveryItem}
              onPress={() => {
                setInput(entry);
                void searchStore.search(entry);
              }}
            >
              <Text style={styles.discoveryText}>{entry}</Text>
            </TouchableOpacity>
          ))}

          <Text style={styles.sectionTitle}>Recent</Text>
          {searchStore.history.map((entry) => (
            <TouchableOpacity
              key={entry}
              style={styles.discoveryItem}
              onPress={() => {
                setInput(entry);
                void searchStore.search(entry);
              }}
            >
              <Text style={styles.discoveryText}>{entry}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <SearchResults
          isLoading={searchStore.isLoading}
          error={searchStore.error}
          results={searchStore.results}
          loadingTrackId={loadingTrackId}
          onPlay={playTrack}
          onDownload={(track) => {
            void downloadAction(track, downloadQuality);
          }}
          onMore={setMenuTarget}
        />
      )}

      <BottomSheetMenu
        visible={menuTarget !== null}
        onClose={() => setMenuTarget(null)}
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
    backgroundColor: '#0A0A0A',
    paddingTop: 58,
  },
  topArea: {
    paddingHorizontal: 16,
  },
  filters: {
    gap: 8,
    marginTop: 12,
    paddingBottom: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#141414',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterChipActive: {
    borderColor: '#1DB954',
    backgroundColor: '#1DB95433',
  },
  filterText: {
    color: '#A0A0A0',
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#1DB954',
  },
  discoveryWrap: {
    padding: 16,
    paddingBottom: 150,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 8,
  },
  discoveryItem: {
    borderRadius: 14,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#242424',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  discoveryText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});
