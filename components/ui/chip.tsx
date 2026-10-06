import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

type ChipProps = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function Chip({ label, selected = false, disabled = false, icon, onPress, style }: ChipProps) {
  const textColor = selected ? '#FFFFFF' : colors.text;

  return (
    <PressableScale
      disabled={disabled}
      onPress={() => {
        haptics.select();
        onPress?.();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={[styles.chip, selected && styles.selected, disabled && styles.disabled, style]}
    >
      {icon && <Ionicons name={icon} size={15} color={selected ? '#FFFFFF' : colors.textSecondary} />}
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selected: { backgroundColor: colors.ink, borderColor: colors.ink },
  disabled: { opacity: 0.4 },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18 },
});
