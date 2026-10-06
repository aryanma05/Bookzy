import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import { Text } from './text';

type ListRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  destructive?: boolean;
  last?: boolean;
};

export function ListRow({ icon, label, value, onPress, right, destructive = false, last = false }: ListRowProps) {
  const tint = destructive ? colors.danger : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={[styles.iconBox, destructive && styles.iconBoxDanger]}>
        <Ionicons name={icon} size={19} color={destructive ? colors.danger : colors.primaryDark} />
      </View>
      <View style={[styles.content, !last && styles.divider]}>
        <Text variant="bodyStrong" color={tint} style={styles.label}>{label}</Text>
        {value && <Text variant="caption" color={colors.textMuted}>{value}</Text>}
        {right ?? (onPress && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />)}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, backgroundColor: colors.surface },
  pressed: { backgroundColor: colors.background },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxDanger: { backgroundColor: colors.dangerSoft },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 56,
    marginLeft: 14,
    paddingRight: 16,
  },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  label: { flex: 1 },
});
