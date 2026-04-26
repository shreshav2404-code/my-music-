import { NavigationContainer, DarkTheme, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { palette } from '../constants/colors';
import { AlbumScreen } from '../screens/AlbumScreen';
import { ArtistScreen } from '../screens/ArtistScreen';
import { LyricsScreen } from '../screens/LyricsScreen';
import { NowPlayingScreen } from '../screens/NowPlayingScreen';
import { PlaylistScreen } from '../screens/PlaylistScreen';
import { QueueScreen } from '../screens/QueueScreen';
import { BottomTabNavigator } from './BottomTabNavigator';
import { navigationRef } from './navigationRef';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const waveTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: palette.background,
    card: palette.surface,
    border: palette.border,
    text: palette.textPrimary,
    primary: palette.accent,
    notification: palette.accent,
  },
};

export function RootNavigator() {
  const linking = useMemo<LinkingOptions<RootStackParamList>>(
    () => ({
      prefixes: ['mukx://'],
      config: {
        screens: {
          MainTabs: {
            screens: {
              Home: 'home',
              Search: 'search',
              Library: 'library',
              Downloads: 'downloads',
              Settings: 'settings',
            },
          },
          NowPlaying: 'play',
        },
      },
    }),
    [],
  );

  return (
    <NavigationContainer ref={navigationRef} theme={waveTheme} linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
        }}
      >
        <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
        <Stack.Screen
          name="NowPlaying"
          component={NowPlayingScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="Playlist" component={PlaylistScreen} />
        <Stack.Screen name="Album" component={AlbumScreen} />
        <Stack.Screen name="Artist" component={ArtistScreen} />
        <Stack.Screen name="Lyrics" component={LyricsScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Queue" component={QueueScreen} options={{ presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
