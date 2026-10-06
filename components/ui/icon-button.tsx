import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '@/constants/theme';
import { PressableScale } from './pressable-scale';

type IconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  color?: string;
  variant?: 'floating' | 'soft' | 'plain';
  size?: number;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  icon,
  onPress,
  color = colors.ink,
  variant = 'floating',
  size = 40,
  accessibilityLabel,
  style,
}: IconButtonProps) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.9}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        variant === 'floating' && styles.floating,
        variant === 'soft' && styles.soft,
        style,
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.5)} color={color} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  floating: { backgroundColor: 'rgba(255, 255, 255, 0.95)', ...shadows.card },
  soft: { backgroundColor: colors.background },
});
