import { useEffect } from 'react';
import { DimensionValue, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface Props {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 10, style }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.3, 0.9, 0.3]),
  }));

  return (
    <View style={[styles.base, { width, height, borderRadius }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.shimmer, shimmerStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#1A1A1A',
    overflow: 'hidden',
  },
  shimmer: {
    backgroundColor: '#2F2F2F',
  },
});
