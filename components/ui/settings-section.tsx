import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, shadows } from '@/constants/theme';
import { Text } from './text';

/** Gruppe med rader i et kort, slik som på profilsiden. */
export function SettingsSection({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      {title && <Text variant="overline" style={styles.title}>{title}</Text>}
      <View style={styles.card}>{children}</View>
      {footer && <Text variant="caption" color={colors.textMuted} style={styles.footer}>{footer}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 26 },
  title: { marginBottom: 8, marginLeft: 4 },
  card: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface, ...shadows.card },
  footer: { marginTop: 8, marginHorizontal: 4 },
});
