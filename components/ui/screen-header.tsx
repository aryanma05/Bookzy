import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { IconButton } from './icon-button';
import { Text } from './text';

type ScreenHeaderProps = {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  closeIcon?: boolean;
  border?: boolean;
};

/** Topplinje for stack-skjermer: tilbake/lukk, tittel og valgfrie handlinger til høyre. */
export function ScreenHeader({ title, subtitle, right, closeIcon = false, border = true }: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/explore'));

  return (
    <View style={[styles.header, { paddingTop: insets.top + 6 }, border && styles.border]}>
      <IconButton
        icon={closeIcon ? 'close' : 'chevron-back'}
        variant="soft"
        size={38}
        onPress={goBack}
        accessibilityLabel={closeIcon ? 'Lukk' : 'Tilbake'}
      />
      <View style={styles.titles}>
        {title && <Text variant="subheading" numberOfLines={1} align="center" style={styles.title}>{title}</Text>}
        {subtitle && <Text variant="caption" numberOfLines={1} align="center">{subtitle}</Text>}
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: colors.surface,
  },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  titles: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  title: { color: colors.ink },
  right: { minWidth: 38, alignItems: 'flex-end' },
});
