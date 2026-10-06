import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SPRING = { damping: 18, stiffness: 320, mass: 0.6 };

type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
};

/** Pressable som krymper litt når den trykkes – gir en mer «levende» følelse enn opacity. */
export function PressableScale({ style, scaleTo = 0.97, onPressIn, onPressOut, disabled, ...props }: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      style={[style, animatedStyle]}
      onPressIn={(event) => {
        if (!disabled) scale.set(withSpring(scaleTo, SPRING));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.set(withSpring(1, SPRING));
        onPressOut?.(event);
      }}
    />
  );
}
