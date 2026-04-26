import { PropsWithChildren } from 'react';
import { Pressable, PressableProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

type Props = PropsWithChildren<PressableProps>;

export function AnimatedPressable({ children, onPressIn, onPressOut, ...props }: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressableBase
      {...props}
      onPressIn={(event) => {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 250 });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withSpring(1, { damping: 15, stiffness: 250 });
        onPressOut?.(event);
      }}
      style={[props.style as any, animatedStyle]}
    >
      {children}
    </AnimatedPressableBase>
  );
}