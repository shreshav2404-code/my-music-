import Slider from '@react-native-community/slider';
import { StyleSheet, Text, View } from 'react-native';
import { formatDuration } from '../../utils/format';

interface Props {
  position: number;
  duration: number;
  accentColor: string;
  onSeek: (value: number) => void;
}

export function ProgressBar({ position, duration, accentColor, onSeek }: Props) {
  return (
    <View>
      <Slider
        minimumValue={0}
        maximumValue={Math.max(1, duration)}
        value={Math.min(position, duration)}
        onSlidingComplete={onSeek}
        minimumTrackTintColor={accentColor}
        maximumTrackTintColor="#2A2A2A"
        thumbTintColor={accentColor}
      />
      <View style={styles.row}>
        <Text style={styles.time}>{formatDuration(position)}</Text>
        <Text style={styles.time}>{formatDuration(duration)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: -2,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: {
    color: '#A0A0A0',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
});