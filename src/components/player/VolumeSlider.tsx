import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { StyleSheet, View } from 'react-native';

interface Props {
  value: number;
  accentColor: string;
  onChange: (value: number) => void;
}

export function VolumeSlider({ value, accentColor, onChange }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name="volume-low" size={18} color="#A0A0A0" />
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={1}
        step={0.01}
        value={value}
        onSlidingComplete={onChange}
        minimumTrackTintColor={accentColor}
        maximumTrackTintColor="#2A2A2A"
        thumbTintColor={accentColor}
      />
      <Ionicons name="volume-high" size={18} color="#A0A0A0" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    marginTop: 18,
  },
  slider: {
    flex: 1,
  },
});