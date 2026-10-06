import { StyleSheet, View } from 'react-native';
import { colors, fonts } from '@/constants/theme';
import { Text } from './text';

const PALETTE = [
  { background: '#E8F4FB', text: '#15669A' },
  { background: '#FDEFE6', text: '#B4541A' },
  { background: '#EAF6EF', text: '#1F7A4D' },
  { background: '#F1ECFB', text: '#6342B0' },
  { background: '#FCEBF2', text: '#B03A6B' },
  { background: '#FFF6DD', text: '#966A00' },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function paletteFor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function Avatar({ name, size = 44, selected = false }: { name: string; size?: number; selected?: boolean }) {
  const palette = paletteFor(name);

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: palette.background },
        selected && styles.selected,
      ]}
    >
      <Text style={{ fontFamily: fonts.bold, fontSize: size * 0.36, lineHeight: size * 0.44, color: palette.text }}>
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  selected: { borderWidth: 2.5, borderColor: colors.primary },
});
