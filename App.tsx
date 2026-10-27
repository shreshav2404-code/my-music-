import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { View } from 'react-native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { MiniPlayer } from './src/components/player/MiniPlayer';
import { useLibrary } from './src/hooks/useLibrary';
import { usePlayer } from './src/hooks/usePlayer';
import { streamFromUrl, healthCheckInvidiousInstances, trackFromStream } from './src/services/api';
import { useLibraryStore } from './src/store/libraryStore';
import { usePlayerStore } from './src/store/playerStore';

// Hosts the startup/sync hooks so their per-second progress updates don't
// re-render the whole navigation tree.
function AppServices() {
  useLibrary();
  usePlayer();
  return null;
}

export default function App() {
  // Run health check on app startup
  useEffect(() => {
    healthCheckInvidiousInstances();
  }, []);

  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      const parsed = Linking.parse(url);
      const targetUrl = parsed.queryParams?.url;
      if (typeof targetUrl !== 'string') {
        return;
      }

      try {
        const track = trackFromStream(await streamFromUrl(targetUrl, 'high'));

        await useLibraryStore.getState().addSong(track);
        await usePlayerStore.getState().play(track, []);
      } catch {
        // ignore malformed links
      }
    };

    const subscription = Linking.addEventListener('url', ({ url }: { url: string }) => {
      handleDeepLink(url);
    });

    Linking.getInitialURL().then((url: string | null) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
        <StatusBar style="light" />
        <AppServices />
        <RootNavigator />
        <MiniPlayer />
      </View>
    </SafeAreaProvider>
  );
}
