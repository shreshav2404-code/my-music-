import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { RepeatMode } from '../../types';

interface Props {
  isPlaying: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  accentColor: string;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onShuffle: () => void;
  onRepeat: () => void;
}

function repeatIcon(mode: RepeatMode): keyof typeof Ionicons.glyphMap {
  if (mode === 'one') {
    return 'repeat-outline';
  }
  return 'repeat';
}

export function Controls({
  isPlaying,
  isShuffle,
  repeatMode,
  accentColor,
  onTogglePlay,
  onNext,
  onPrevious,
  onShuffle,
  onRepeat,
}: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onShuffle}>
        <Ionicons name="shuffle" size={20} color={isShuffle ? accentColor : '#A0A0A0'} />
      </TouchableOpacity>

      <TouchableOpacity onPress={onPrevious} style={styles.secondaryBtn}>
        <Ionicons name="play-skip-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <TouchableOpacity onPress={onTogglePlay} style={[styles.playBtn, { backgroundColor: accentColor }]}>
        <Ionicons name={isPlaying ? 'pause' : 'play'} size={30} color="#000000" />
      </TouchableOpacity>

      <TouchableOpacity onPress={onNext} style={styles.secondaryBtn}>
        <Ionicons name="play-skip-forward" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <TouchableOpacity onPress={onRepeat}>
        <Ionicons name={repeatIcon(repeatMode)} size={20} color={repeatMode === 'off' ? '#A0A0A0' : accentColor} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 24,
    marginTop: 18,
  },
  secondaryBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});