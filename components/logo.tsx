import { Image } from 'expo-image';

const MARK_RATIO = 721 / 526;
const LOGO_RATIO = 1082 / 832;

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
  return (
    <Image
      source={white ? require('@/assets/images/logo-white.png') : require('@/assets/images/logo.png')}
      style={{ width: height * LOGO_RATIO, height }}
      contentFit="contain"
      accessibilityLabel="Bookzy"
    />
  );
}
