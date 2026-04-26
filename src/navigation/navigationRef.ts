import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToNowPlaying(): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate('NowPlaying');
  }
}

export function getCurrentRouteName(): keyof RootStackParamList | null {
  if (!navigationRef.isReady()) {
    return null;
  }

  const route = navigationRef.getCurrentRoute();
  return (route?.name as keyof RootStackParamList | undefined) ?? null;
}
