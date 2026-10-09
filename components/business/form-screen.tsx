import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import type { Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ui/screen-header';
import { colors } from '@/constants/theme';

type FormScreenProps = {
  title: string;
  subtitle?: string;
  backTo?: Href;
  headerRight?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

/** Skjerm med topplinje, skjema som ikke blir for bredt på PC, og knapper nederst. */
export function FormScreen({ title, subtitle, backTo = '/business/salon', headerRight, footer, children }: FormScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <ScreenHeader title={title} subtitle={subtitle} backTo={backTo} right={headerRight} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
      {footer && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
          <View style={styles.footerInner}>{footer}</View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  footerInner: { flexDirection: 'row', gap: 12, width: '100%', maxWidth: 640, alignSelf: 'center' },
});
