import { PropsWithChildren } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, ViewStyle } from 'react-native';
import { gradients } from '../../constants/colors';

interface Props extends PropsWithChildren {
  mode?: 'morning' | 'evening' | 'night';
  style?: ViewStyle;
}

export function GradientBackground({ mode = 'night', style, children }: Props) {
  const colors = gradients[mode];

  return (
    <LinearGradient colors={colors as [string, string, string]} style={[styles.container, style]}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});