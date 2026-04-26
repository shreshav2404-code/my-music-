import { StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { QueueSheet } from '../components/player/QueueSheet';
import { RootStackParamList } from '../navigation/types';
import { usePlayerStore } from '../store/playerStore';

export function QueueScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Queue'>) {
  const player = usePlayerStore();

  return (
    <View style={styles.container}>
      <QueueSheet
        currentTrackId={player.currentTrack?.id}
        queue={player.queue}
        onSelect={async (track) => {
          const rest = player.queue.filter((entry) => entry.id !== track.id);
          await player.play(track, rest);
          navigation.goBack();
        }}
        onRemove={player.removeFromQueue}
        onClear={player.clearQueue}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
});