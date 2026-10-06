import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '@/components/logo';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { colors, fonts, radius } from '@/constants/theme';
import { useOnboarding } from '@/context/OnboardingContext';
import { haptics } from '@/lib/haptics';
import { unsplash } from '@/lib/salons';

const SLIDES = [
  {
    title: 'Velvære, booket på sekunder',
    text: 'Frisør, barber, negler, massasje og hudpleie – finn steder i nærheten og se ledige timer med en gang.',
  },
  {
    title: 'Se ledige tider i sanntid',
    text: 'Velg behandling, hvem du vil gå til og tidspunktet som passer. Ingen meldinger frem og tilbake.',
  },
  {
    title: 'Full kontroll på timene dine',
    text: 'Få påminnelse dagen før, flytt eller avbestill med et par trykk, og book favorittene dine igjen.',
  },
];

export default function IndexScreen() {
  const { hasSeenOnboarding } = useOnboarding();

  // Onboarding vises bare første gang appen åpnes
  if (hasSeenOnboarding) {
    return <Redirect href="/explore" />;
  }

  return <Onboarding />;
}

function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { completeOnboarding } = useOnboarding();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useSharedValue(0);
  const [page, setPage] = useState(0);
  const isLast = page === SLIDES.length - 1;

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.set(event.contentOffset.x);
  });

  useAnimatedReaction(
    () => Math.round(scrollX.get() / width),
    (current, previous) => {
      if (current !== previous) scheduleOnRN(setPage, current);
    }
  );

  const finish = (thenLogin = false) => {
    haptics.tap();
    completeOnboarding();
    router.replace('/explore');
    if (thenLogin) router.push('/login');
  };

  const next = () => {
    haptics.select();
    if (isLast) {
      finish();
      return;
    }
    scrollRef.current?.scrollTo({ x: width * (page + 1), animated: true });
  };

  return (
    <LinearGradient colors={['#2FA3E3', '#1E80C1', '#14649A']} locations={[0, 0.6, 1]} style={styles.container}>
      <StatusBar style="light" />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View />
        {!isLast && (
          <Pressable onPress={() => finish()} hitSlop={12} accessibilityRole="button">
            <Text style={styles.skip}>Hopp over</Text>
          </Pressable>
        )}
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.pager}
      >
        {SLIDES.map((slide, index) => (
          <Slide key={slide.title} index={index} width={width} scrollX={scrollX} title={slide.title} text={slide.text} />
        ))}
      </Animated.ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.dots}>
          {SLIDES.map((slide, index) => (
            <Dot key={slide.title} index={index} width={width} scrollX={scrollX} />
          ))}
        </View>

        <PressableScale style={styles.primaryButton} onPress={next} accessibilityRole="button">
          <Text style={styles.primaryLabel}>{isLast ? 'Kom i gang' : 'Neste'}</Text>
          <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={19} color={colors.primaryDark} />
        </PressableScale>

        <Pressable onPress={() => finish(true)} hitSlop={8} style={styles.secondary} accessibilityRole="button">
          <Text style={styles.secondaryLabel}>
            Har du allerede konto? <Text style={styles.secondaryStrong}>Logg inn</Text>
          </Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

type SlideProps = { index: number; width: number; scrollX: SharedValue<number>; title: string; text: string };

function Slide({ index, width, scrollX, title, text }: SlideProps) {
  const range = [(index - 1) * width, index * width, (index + 1) * width];

  const artStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.get(), range, [0, 1, 0], Extrapolation.CLAMP),
    transform: [
      { translateX: interpolate(scrollX.get(), range, [width * 0.35, 0, -width * 0.35], Extrapolation.CLAMP) },
      { scale: interpolate(scrollX.get(), range, [0.85, 1, 0.85], Extrapolation.CLAMP) },
    ],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.get(), range, [0, 1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollX.get(), range, [24, 0, 24], Extrapolation.CLAMP) }],
  }));

  return (
    <View style={[styles.slide, { width }]}>
      <Animated.View style={[styles.art, artStyle]}>
        {index === 0 && <WelcomeArt />}
        {index === 1 && <BookingArt />}
        {index === 2 && <ReminderArt />}
      </Animated.View>
      <Animated.View style={[styles.copy, textStyle]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>{text}</Text>
      </Animated.View>
    </View>
  );
}

function Dot({ index, width, scrollX }: { index: number; width: number; scrollX: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const range = [(index - 1) * width, index * width, (index + 1) * width];
    return {
      width: interpolate(scrollX.get(), range, [8, 26, 8], Extrapolation.CLAMP),
      opacity: interpolate(scrollX.get(), range, [0.45, 1, 0.45], Extrapolation.CLAMP),
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

function WelcomeArt() {
  return (
    <View style={styles.welcome}>
      <View style={[styles.ring, { width: 300, height: 300, borderRadius: 150 }]} />
      <View style={[styles.ring, { width: 220, height: 220, borderRadius: 110 }]} />
      <Logo height={150} white />
    </View>
  );
}

function BookingArt() {
  return (
    <View style={styles.artStack}>
      <View style={styles.mockCard}>
        <Image source={{ uri: unsplash('1580618672591-eb180b1a973f', 400) }} style={styles.mockImage} contentFit="cover" />
        <View style={styles.mockBody}>
          <Text style={styles.mockTitle}>Salong Nord</Text>
          <View style={styles.mockRating}>
            <Ionicons name="star" size={13} color={colors.star} />
            <Text style={styles.mockMeta}>4,8 · Frisør · Grünerløkka</Text>
          </View>
          <View style={styles.mockTimes}>
            {['09:30', '10:00', '11:30'].map((time) => (
              <View key={time} style={[styles.mockTime, time === '10:00' && styles.mockTimeSelected]}>
                <Text style={[styles.mockTimeText, time === '10:00' && styles.mockTimeTextSelected]}>{time}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      <View style={[styles.badge, styles.badgeConfirmed]}>
        <Ionicons name="checkmark-circle" size={18} color={colors.success} />
        <Text style={styles.badgeText}>Timen er booket</Text>
      </View>
    </View>
  );
}

function ReminderArt() {
  return (
    <View style={styles.artStack}>
      <View style={[styles.badge, styles.badgeReminder]}>
        <View style={styles.bell}>
          <Ionicons name="notifications" size={16} color="#FFFFFF" />
        </View>
        <View>
          <Text style={styles.badgeText}>Påminnelse om time</Text>
          <Text style={styles.mockMeta}>Herreklipp i morgen kl 10:00</Text>
        </View>
      </View>
      <View style={[styles.mockCard, styles.mockCardRow]}>
        <View style={styles.dateBlock}>
          <Text style={styles.dateMonth}>OKT</Text>
          <Text style={styles.dateDay}>14</Text>
        </View>
        <View style={styles.mockRowBody}>
          <Text style={styles.mockTitle}>Herreklipp</Text>
          <Text style={styles.mockMeta}>Salong Nord · 10:00–10:45</Text>
          <View style={styles.mockActions}>
            <View style={styles.mockAction}><Text style={styles.mockActionText}>Endre tid</Text></View>
            <View style={styles.mockAction}><Text style={styles.mockActionText}>Avbestill</Text></View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, minHeight: 44 },
  skip: { fontFamily: fonts.semibold, fontSize: 15, color: 'rgba(255,255,255,0.85)' },
  pager: { flex: 1 },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  art: { height: 320, width: '100%', maxWidth: 380, alignItems: 'center', justifyContent: 'center' },
  copy: { maxWidth: 380, marginTop: 28, alignItems: 'center' },
  title: {
    fontFamily: fonts.extrabold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  text: {
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.86)',
    textAlign: 'center',
    marginTop: 12,
  },
  footer: { paddingHorizontal: 24, gap: 18, alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 6, height: 8 },
  dot: { height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  primaryButton: {
    width: '100%',
    maxWidth: 420,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxShadow: '0px 8px 24px rgba(8, 40, 66, 0.25)',
  },
  primaryLabel: { fontFamily: fonts.bold, fontSize: 17, color: colors.primaryDark },
  secondary: { paddingVertical: 4 },
  secondaryLabel: { fontFamily: fonts.medium, fontSize: 15, color: 'rgba(255,255,255,0.85)' },
  secondaryStrong: { fontFamily: fonts.bold, color: '#FFFFFF' },
  welcome: { alignItems: 'center', justifyContent: 'center', width: 300, height: 300 },
  ring: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.08)' },
  artStack: { width: '100%', maxWidth: 320, gap: 16, alignItems: 'center' },
  mockCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    overflow: 'hidden',
    boxShadow: '0px 16px 40px rgba(8, 40, 66, 0.3)',
  },
  mockCardRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  mockImage: { width: '100%', height: 130 },
  mockBody: { padding: 14, gap: 4 },
  mockRowBody: { flex: 1, gap: 4 },
  mockTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  mockRating: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  mockMeta: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  mockTimes: { flexDirection: 'row', gap: 8, marginTop: 10 },
  mockTime: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  mockTimeSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  mockTimeText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  mockTimeTextSelected: { color: '#FFFFFF' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    boxShadow: '0px 10px 28px rgba(8, 40, 66, 0.28)',
  },
  badgeConfirmed: { alignSelf: 'flex-end', marginTop: -36, marginRight: -8 },
  badgeReminder: { alignSelf: 'flex-start', borderRadius: radius.lg, marginLeft: -8 },
  badgeText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  bell: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBlock: {
    width: 58,
    height: 66,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMonth: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.8, color: 'rgba(255,255,255,0.85)' },
  dateDay: { fontFamily: fonts.extrabold, fontSize: 24, color: '#FFFFFF' },
  mockActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  mockAction: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.background },
  mockActionText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textSecondary },
});
