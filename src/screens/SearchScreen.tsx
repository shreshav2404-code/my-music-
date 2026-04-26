import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useSearch } from '../hooks/useSearch';
import { SearchBar } from '../components/search/SearchBar';
import { SearchResults } from '../components/search/SearchResults';
import { isUrl } from '../utils/string';
import { resolveStreamByName, streamFromUrl } from '../services/api';
import { usePlayerStore } from '../store/playerStore';
import { Track } from '../types';
import { useDownloadStore } from '../store/downloadStore';
import { useLibraryStore } from '../store/libraryStore';
import { useSettingsStore } from '../store/settingsStore';
import { BottomTabParamList } from '../navigation/types';

const filters: Array<'all' | 'youtube' | 'soundcloud' | 'jamendo'> = ['all', 'youtube', 'soundcloud', 'jamendo'];
const moodRecommendationCatalog: Array<{ keywords: string[]; tracks: Track[] }> = [
  {
    keywords: ['chill', 'lofi', 'calm'],
    tracks: [
      {
        id: 'mood_chill_1',
        title: 'Lo-Fi Hip Hop Radio',
        artist: 'Lofi Girl',
        album: 'Mood Mix',
        duration: 0,
        thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg',
        source: 'youtube',
        sourceUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
      },
      {
        id: 'mood_chill_2',
        title: 'Jazz Vibes',
        artist: 'Cafe Music BGM',
        album: 'Mood Mix',
        duration: 0,
        thumbnail: 'https://i.ytimg.com/vi/DWcJFNfaw9c/hqdefault.jpg',
        source: 'youtube',
        sourceUrl: 'https://www.youtube.com/watch?v=DWcJFNfaw9c',
      },
    ],
  },
  {
    keywords: ['workout', 'gym', 'motivation'],
    tracks: [
      {
        id: 'mood_workout_1',
        title: 'Workout Music Mix',
        artist: 'Fitness Beats',
        album: 'Mood Mix',
        duration: 0,
        thumbnail: 'https://i.ytimg.com/vi/ml6cT4AZdqI/hqdefault.jpg',
        source: 'youtube',
        sourceUrl: 'https://www.youtube.com/watch?v=ml6cT4AZdqI',
      },
      {
        id: 'mood_workout_2',
        title: 'Epic Training',
        artist: 'No Copyright Sounds',
        album: 'Mood Mix',
        duration: 0,
        thumbnail: 'https://i.ytimg.com/vi/60ItHLz5WEA/hqdefault.jpg',
        source: 'youtube',
        sourceUrl: 'https://www.youtube.com/watch?v=60ItHLz5WEA',
      },
    ],
  },
  {
    keywords: ['focus', 'study', 'instrumental'],
    tracks: [
      {
        id: 'mood_focus_1',
        title: 'Deep Focus Music',
        artist: 'Study Beats',
        album: 'Mood Mix',
        duration: 0,
        thumbnail: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg',
        source: 'youtube',
        sourceUrl: 'https://www.youtube.com/watch?v=5qap5aO4i9A',
      },
      {
        id: 'mood_focus_2',
        title: 'Concentration Piano',
        artist: 'Meditation Relax',
        album: 'Mood Mix',
        duration: 0,
        thumbnail: 'https://i.ytimg.com/vi/lFcSrYw-ARY/hqdefault.jpg',
        source: 'youtube',
        sourceUrl: 'https://www.youtube.com/watch?v=lFcSrYw-ARY',
      },
    ],
  },
  {
    keywords: ['party', 'dance', 'hits'],
    tracks: [
      {
        id: 'mood_party_1',
        title: 'Party Dance Mix',
        artist: 'Club Beats',
        album: 'Mood Mix',
        duration: 0,
        thumbnail: 'https://i.ytimg.com/vi/3JZ_D3ELwOQ/hqdefault.jpg',
        source: 'youtube',
        sourceUrl: 'https://www.youtube.com/watch?v=3JZ_D3ELwOQ',
      },
      {
        id: 'mood_party_2',
        title: 'EDM Festival Mix',
        artist: 'Electronic Vibes',
        album: 'Mood Mix',
        duration: 0,
        thumbnail: 'https://i.ytimg.com/vi/fRh_vgS2dFE/hqdefault.jpg',
        source: 'youtube',
        sourceUrl: 'https://www.youtube.com/watch?v=fRh_vgS2dFE',
      },
    ],
  },
  {
    keywords: ['sleep', 'ambient', 'night'],
    tracks: [
      {
        id: 'mood_sleep_1',
        title: 'Sleep Music',
        artist: 'Calm Sleep',
        album: 'Mood Mix',
        duration: 0,
        thumbnail: 'https://i.ytimg.com/vi/1ZYbU82GVz4/hqdefault.jpg',
        source: 'youtube',
        sourceUrl: 'https://www.youtube.com/watch?v=1ZYbU82GVz4',
      },
      {
        id: 'mood_sleep_2',
        title: 'Night Rain Sounds',
        artist: 'Relaxing White Noise',
        album: 'Mood Mix',
        duration: 0,
        thumbnail: 'https://i.ytimg.com/vi/q76bMs-NwRk/hqdefault.jpg',
        source: 'youtube',
        sourceUrl: 'https://www.youtube.com/watch?v=q76bMs-NwRk',
      },
    ],
  },
];

function getMoodRecommendations(query: string): Track[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  for (const entry of moodRecommendationCatalog) {
    if (entry.keywords.some((keyword) => normalized.includes(keyword))) {
      return entry.tracks;
    }
  }

  return [];
}

export function SearchScreen() {
  const route = useRoute<RouteProp<BottomTabParamList, 'Search'>>();
  const [input, setInput] = useState('');
  const searchStore = useSearch();
  const playAction = usePlayerStore((state) => state.play);
  const downloadAction = useDownloadStore((state) => state.startDownload);
  const librarySongs = useLibraryStore((state) => state.songs);
  const libraryAdd = useLibraryStore((state) => state.addSong);
  const standaloneMode = useSettingsStore((state) => state.standaloneMode);
  const moodRecommendations = getMoodRecommendations(searchStore.query);
  const displayResults =
    standaloneMode && searchStore.results.length === 0 && moodRecommendations.length > 0
      ? moodRecommendations
      : searchStore.results;

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
    if (standaloneMode) {
      searchStore.searchLocal(prefill, librarySongs);
    } else {
      void searchStore.search(prefill);
    }
  }, [route.params?.requestId]);

  const runSearch = async () => {
    if (!input.trim()) {
      return;
    }

    try {
      if (isUrl(input.trim())) {
        if (standaloneMode) {
          Alert.alert(
            'Standalone mode is on',
            'Direct link streaming needs a backend server. Turn off Standalone mode in Settings to use links.',
          );
          return;
        }

        const stream = await streamFromUrl(input.trim(), 'high');
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
        await libraryAdd(track);
        await playAction(track, []);
        return;
      }

      if (standaloneMode) {
        searchStore.searchLocal(input, librarySongs);
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

      if (track.filePath) {
        await playAction(track, []);
        return;
      }

      if (standaloneMode) {
        Alert.alert(
          'Online track',
          'This song is not downloaded. Disable Standalone mode to stream online songs.',
        );
        return;
      }

      if (!track.streamUrl && !track.filePath) {
        const resolved = await resolveStreamByName(`${track.title} ${track.artist}`, 'high');
        toPlay = {
          ...track,
          streamUrl: resolved.streamUrl,
          sourceUrl: resolved.sourceUrl,
        };
        await libraryAdd(toPlay);
      }

      await playAction(toPlay, []);
    } catch (error) {
      presentError(error, 'Unable to play this track');
    }
  };

  const changeFilter = (filter: (typeof filters)[number]) => {
    searchStore.setSourceFilter(filter);
    const query = input.trim() || searchStore.query;
    if (query) {
      if (standaloneMode) {
        searchStore.searchLocal(query, librarySongs);
      } else {
        void searchStore.search(query);
      }
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
          {standaloneMode ? (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineTitle}>Standalone local mode</Text>
              <Text style={styles.offlineText}>Search works on songs already in your phone library.</Text>
            </View>
          ) : null}
          <Text style={styles.sectionTitle}>Trending Searches</Text>
          {searchStore.trending.map((entry) => (
            <TouchableOpacity
              key={entry}
              style={styles.discoveryItem}
              onPress={() => {
                setInput(entry);
                if (standaloneMode) {
                  searchStore.searchLocal(entry, librarySongs);
                } else {
                  void searchStore.search(entry);
                }
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
                if (standaloneMode) {
                  searchStore.searchLocal(entry, librarySongs);
                } else {
                  void searchStore.search(entry);
                }
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
          results={displayResults}
          onPlay={playTrack}
          onDownload={(track) => {
            if (standaloneMode) {
              Alert.alert('Standalone mode is on', 'Disable Standalone mode in Settings to download from links.');
              return;
            }
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
  offlineBanner: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#225A3A',
    backgroundColor: '#12261B',
    padding: 12,
    marginBottom: 10,
  },
  offlineTitle: {
    color: '#7DE2A8',
    fontSize: 13,
    fontWeight: '700',
  },
  offlineText: {
    color: '#A0A0A0',
    fontSize: 12,
    marginTop: 4,
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
