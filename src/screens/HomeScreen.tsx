import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { GradientBackground } from '../components/ui/GradientBackground';
import { RootStackParamList } from '../navigation/types';
import { useLibraryStore } from '../store/libraryStore';
import { quickPlay } from '../store/playerStore';
import { useSettingsStore } from '../store/settingsStore';
import { Track } from '../types';

const moods = ['Chill', 'Workout', 'Focus', 'Party', 'Sleep'];
const moodQueries: Record<(typeof moods)[number], string> = {
  Chill: 'chill lofi beats',
  Workout: 'workout gym motivation',
  Focus: 'focus instrumental study',
  Party: 'party dance hits',
  Sleep: 'sleep ambient calm',
};

function getTimeMode(): 'morning' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 15) {
    return 'morning';
  }
  if (hour >= 15 && hour < 21) {
    return 'evening';
  }
  return 'night';
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 'Good Morning';
  }
  if (hour < 18) {
    return 'Good Afternoon';
  }
  return 'Good Evening';
}

function relativeTime(timestamp?: number): string {
  if (!timestamp) {
    return 'Just now';
  }

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (elapsedSeconds < 60) {
    return `${elapsedSeconds}s ago`;
  }
  if (elapsedSeconds < 3600) {
    return `${Math.floor(elapsedSeconds / 60)}m ago`;
  }
  if (elapsedSeconds < 86400) {
    return `${Math.floor(elapsedSeconds / 3600)}h ago`;
  }
  return `${Math.floor(elapsedSeconds / 86400)}d ago`;
}

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { songs, recentlyPlayed } = useLibraryStore();
  const accentColor = useSettingsStore((state) => state.accentColor);

  const continueListening = useMemo(() => recentlyPlayed.slice(0, 5), [recentlyPlayed]);
  const historyList = useMemo(() => recentlyPlayed.slice(0, 10), [recentlyPlayed]);
  const mostPlayedCount = useMemo(() => songs.filter((song) => (song.playCount ?? 0) > 0).length, [songs]);
  const downloadedCount = useMemo(() => songs.filter((song) => song.isDownloaded).length, [songs]);
  const likedCount = useMemo(() => songs.filter((song) => song.isLiked).length, [songs]);

  const playTrack = (track: Track) => {
    void quickPlay(track);
  };

  const openMoodMix = (mood: (typeof moods)[number]) => {
    navigation.navigate('MainTabs', {
      screen: 'Search',
      params: {
        prefillQuery: moodQueries[mood],
        requestId: Date.now(),
      },
    });
  };

  return (
    <GradientBackground mode={getTimeMode()}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.greeting}>{getGreeting()}, Keshu</Text>
        <Text style={styles.subGreeting}>Welcome back to mukx</Text>

        <LinearGradient colors={['#1A1A1A', '#121212']} style={styles.hero}>
          <View>
            <Text style={styles.heroBadge}>mukx</Text>
            <Text style={styles.heroTitle}>Your personal music space</Text>
            <Text style={styles.heroSubtitle}>Local-first listening with premium controls.</Text>
          </View>
          <TouchableOpacity
            style={[styles.heroButton, { backgroundColor: accentColor }]}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Search' })}
          >
            <Text style={styles.heroButtonText}>Start Search</Text>
          </TouchableOpacity>
        </LinearGradient>

        <Text style={styles.sectionTitle}>Recently Played</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
          {recentlyPlayed.slice(0, 10).map((track) => (
            <TouchableOpacity key={track.id} onPress={() => playTrack(track)} style={styles.circleWrap}>
              <Image source={{ uri: track.thumbnail }} style={styles.circleArt} contentFit="cover" cachePolicy="memory-disk" />
              <Text style={styles.circleLabel} numberOfLines={1}>
                {track.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Song History</Text>
        {historyList.length === 0 ? (
          <Text style={styles.emptyHint}>Play songs and your history will appear here.</Text>
        ) : (
          historyList.map((track) => (
            <TouchableOpacity key={track.id} style={styles.historyCard} onPress={() => playTrack(track)}>
              <Image source={{ uri: track.thumbnail }} style={styles.historyArt} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.historyTitle} numberOfLines={1}>
                  {track.title}
                </Text>
                <Text style={styles.historySubtitle} numberOfLines={1}>
                  {track.artist}
                </Text>
              </View>
              <Text style={styles.historyTime}>{relativeTime(track.lastPlayed)}</Text>
            </TouchableOpacity>
          ))
        )}

        <Text style={styles.sectionTitle}>Continue Listening</Text>
        {continueListening.length === 0 ? (
          <Text style={styles.emptyHint}>Search or scan local files to start listening.</Text>
        ) : (
          continueListening.map((track) => (
            <TouchableOpacity key={track.id} style={styles.listCard} onPress={() => playTrack(track)}>
              <Image source={{ uri: track.thumbnail }} style={styles.listArt} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle} numberOfLines={1}>
                  {track.title}
                </Text>
                <Text style={styles.listSubtitle} numberOfLines={1}>
                  {track.artist}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        <Text style={styles.sectionTitle}>Mood Mixes</Text>
        <View style={styles.moodGrid}>
          {moods.map((mood) => (
            <TouchableOpacity key={mood} style={styles.moodChip} onPress={() => openMoodMix(mood)}>
              <Text style={styles.moodText}>{mood}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() =>
              navigation.navigate('MainTabs', {
                screen: 'Library',
                params: {
                  initialTab: 'Songs',
                  initialFilter: 'liked',
                  requestId: Date.now(),
                },
              })
            }
          >
            <Text style={styles.quickTitle}>Liked Songs</Text>
            <Text style={styles.quickValue}>{likedCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() =>
              navigation.navigate('MainTabs', {
                screen: 'Library',
                params: {
                  initialTab: 'Songs',
                  initialFilter: 'downloaded',
                  requestId: Date.now(),
                },
              })
            }
          >
            <Text style={styles.quickTitle}>Downloaded</Text>
            <Text style={styles.quickValue}>{downloadedCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() =>
              navigation.navigate('MainTabs', {
                screen: 'Library',
                params: {
                  initialTab: 'Songs',
                  initialFilter: 'all',
                  requestId: Date.now(),
                },
              })
            }
          >
            <Text style={styles.quickTitle}>In History</Text>
            <Text style={styles.quickValue}>{mostPlayedCount}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 140,
  },
  greeting: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
  },
  subGreeting: {
    color: '#A0A0A0',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 14,
  },
  hero: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#2B2B2B',
    padding: 16,
    gap: 14,
  },
  heroBadge: {
    color: '#1DB954',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 6,
  },
  heroSubtitle: {
    color: '#A0A0A0',
    fontSize: 13,
    marginTop: 6,
  },
  heroButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  heroButtonText: {
    color: '#07140D',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 10,
  },
  horizontalRow: {
    gap: 12,
    paddingBottom: 4,
  },
  circleWrap: {
    width: 72,
    alignItems: 'center',
  },
  circleArt: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E1E1E',
  },
  circleLabel: {
    marginTop: 6,
    color: '#A0A0A0',
    fontSize: 11,
  },
  emptyHint: {
    color: '#A0A0A0',
    fontSize: 13,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#242424',
    backgroundColor: '#141414',
    padding: 10,
    marginBottom: 8,
  },
  historyArt: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1E1E1E',
  },
  historyTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  historySubtitle: {
    color: '#A0A0A0',
    fontSize: 12,
    marginTop: 2,
  },
  historyTime: {
    color: '#707070',
    fontSize: 11,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
  },
  listArt: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#1E1E1E',
  },
  listTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  listSubtitle: {
    color: '#A0A0A0',
    fontSize: 13,
    marginTop: 2,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  moodChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#141414',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  moodText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#141414',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#242424',
    padding: 12,
  },
  quickTitle: {
    color: '#A0A0A0',
    fontSize: 12,
  },
  quickValue: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
});
