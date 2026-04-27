import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useSearch } from '../hooks/useSearch';
import { SearchBar } from '../components/search/SearchBar';
import { SearchResults } from '../components/search/SearchResults';
import { isUrl } from '../utils/string';
import { resolveStreamByName, streamFromUrl, resolveVideoUrl } from '../services/api';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { usePlayerStore } from '../store/playerStore';
import { Track } from '../types';
import { useDownloadStore } from '../store/downloadStore';
import { useLibraryStore } from '../store/libraryStore';
import { BottomTabParamList } from '../navigation/types';

const filters: Array<'all' | 'youtube' | 'soundcloud' | 'jamendo'> = ['all', 'youtube', 'soundcloud', 'jamendo'];

export function SearchScreen() {
  const route = useRoute<RouteProp<BottomTabParamList, 'Search'>>();
  const [input, setInput] = useState('');
  const searchStore = useSearch();
  const playAction = usePlayerStore((state) => state.play);
  const downloadAction = useDownloadStore((state) => state.startDownload);
  const libraryAdd = useLibraryStore((state) => state.addSong);

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
        try {
          const stream = await streamFromUrl(url, 'high');
          const track: Track = {
            id: `${stream.source}_${Date.now()}`,
            title: stream.title,
            artist: stream.artist,
            album: 'Single',
            duration: stream.duration,
            thumbnail: stream.thumbnail,
            source: stream.source,
            sourceUrl: stream.sourceUrl,
            streamUrl: stream.streamUrl,
          };
          searchStore.setResults([track]);
        } catch (e) {
          presentError(e, 'Failed to resolve URL');
        }
        return;
      }

      await searchStore.search(input);
    } catch (error) {
      presentError(error, 'Unable to search right now');
    }
  };

  const playTrack = async (track: Track) => {
    try {
      let toPlay = track;

      // If it's a local file, play directly
      if (track.filePath) {
        await playAction(track, []);
        return;
      }

      // If track already has a stream URL (e.g. Jamendo), play directly
      if (track.streamUrl) {
        await libraryAdd(toPlay);
        await playAction(toPlay, []);
        return;
      }

      // Resolve stream URL via Piped for YouTube tracks
      const resolved = await resolveStreamByName(`${track.title} ${track.artist}`, 'high');
      toPlay = {
        ...track,
        streamUrl: resolved.streamUrl,
        sourceUrl: resolved.sourceUrl,
      };
      await libraryAdd(toPlay);
      await playAction(toPlay, []);
    } catch (error) {
      presentError(error, 'Unable to play this track');
    }
  };

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
          onPlay={playTrack}
          onDownload={(track) => {
            void downloadAction(track, 320);
          }}
        />
      )}
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
