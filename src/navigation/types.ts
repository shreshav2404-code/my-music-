import { NavigatorScreenParams } from '@react-navigation/native';
import { Track } from '../types';

export type BottomTabParamList = {
  Home: undefined;
  Search:
    | {
        prefillQuery?: string;
        requestId?: number;
      }
    | undefined;
  Library:
    | {
        initialTab?: 'Songs' | 'Albums' | 'Artists' | 'Playlists';
        initialFilter?: 'all' | 'downloaded' | 'liked';
        requestId?: number;
      }
    | undefined;
  Downloads: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<BottomTabParamList> | undefined;
  NowPlaying: { trackId?: string } | undefined;
  Playlist: { playlistId: string };
  Album: { albumName: string; artist: string };
  Artist: { artistName: string };
  Lyrics: { track: Track };
  Queue: undefined;
};
