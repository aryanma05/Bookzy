import { Image } from 'expo-image';
import { View } from 'react-native';
import { colors, fonts } from '@/constants/theme';
import { Text } from './ui/text';

const MARK_RATIO = 721 / 526;

export function LogoMark({ height = 28, white = false }: { height?: number; white?: boolean }) {
  return (
    <Image
      source={white ? require('@/assets/images/logo-mark-white.png') : require('@/assets/images/logo-mark.png')}
      style={{ width: height * MARK_RATIO, height }}
      contentFit="contain"
      accessibilityLabel="Bookzy"
    />
  );
}

export function Logo({ height = 120, white = false }: { height?: number; white?: boolean }) {
  const fontSize = height * 0.3;
  return (
    <View style={{ height, alignItems: 'center', justifyContent: 'center' }} accessible accessibilityRole="image" accessibilityLabel="Bookzy">
      <LogoMark height={height * 0.6} white={white} />
      <Text
        style={{
          fontFamily: fonts.semibold,
          fontSize,
          lineHeight: fontSize * 1.2,
          letterSpacing: -fontSize * 0.02,
          color: white ? colors.surface : colors.ink,
        }}
      >
        Bookzy
      </Text>
    </View>
  );
}
