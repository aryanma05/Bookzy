import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, shadows } from '@/constants/theme';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: 'md' | 'lg' | 'sm';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const VARIANTS: Record<Variant, { background: string; text: string; border?: string }> = {
  primary: { background: colors.primary, text: '#FFFFFF' },
  secondary: { background: colors.primarySoft, text: colors.primaryDark },
  outline: { background: colors.surface, text: colors.text, border: colors.border },
  ghost: { background: 'transparent', text: colors.primary },
  danger: { background: colors.dangerSoft, text: colors.danger },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const palette = VARIANTS[variant];
  const inactive = disabled || loading;

  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[
        styles.base,
        styles[size],
        { backgroundColor: palette.background },
        palette.border ? { borderWidth: 1, borderColor: palette.border } : null,
        variant === 'primary' && !inactive ? shadows.button : null,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <View style={styles.content}>
          {icon && <Ionicons name={icon} size={size === 'sm' ? 16 : 19} color={palette.text} />}
          <Text style={[styles.label, size === 'sm' && styles.labelSmall, { color: palette.text }]}>{title}</Text>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lg: { minHeight: 54, paddingHorizontal: 22 },
  md: { minHeight: 46, paddingHorizontal: 18 },
  sm: { minHeight: 36, paddingHorizontal: 14, borderRadius: radius.sm },
  disabled: { opacity: 0.45 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21 },
  labelSmall: { fontSize: 14, lineHeight: 18 },
});
