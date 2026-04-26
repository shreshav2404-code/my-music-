import { PropsWithChildren } from 'react';
import { BlurView } from 'expo-blur';
import { StyleSheet, ViewStyle } from 'react-native';

interface Props extends PropsWithChildren {
  intensity?: number;
  style?: ViewStyle;
}

export function BlurCard({ intensity = 30, style, children }: Props) {
  return (
    <BlurView intensity={intensity} tint="dark" style={[styles.card, style]}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: 'rgba(20,20,20,0.6)',
  },
});