import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { GreatVibes_400Regular } from '@expo-google-fonts/great-vibes/400Regular';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display/700Bold';
import { LogoMark } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import { colors, fonts, radius, shadows } from '@/constants/theme';
import { useBusiness } from '@/context/BusinessContext';
import { useNow } from '@/hooks/use-now';
import { useSalonBookings } from '@/hooks/use-salon-bookings';
import { showAlert } from '@/lib/alert';
import { haptics } from '@/lib/haptics';
import { formatDuration } from '@/lib/salons';
import {
  addDays,
  dayOverview,
  formatDayChip,
  formatMonth,
  formatWeekRange,
  fromDateKey,
  hoursForDate,
  isDayOff,
  startOfWeek,
  toDateKey,
  upcomingDates,
  weekNumber,
  type OverviewTime,
} from '@/lib/schedule';

type Mode = 'month' | 'week';

type PosterTheme = {
  key: string;
  label: string;
  /** Ovenfra og ned; to like farger gir ensfarget bakgrunn */
  background: [string, string];
  ink: string;
  muted: string;
  line: string;
  /** Med kortfarge vises dagene som egne kort i stedet for et rutenett */
  card?: string;
  headingFont: string;
  headingSize: number;
  lowercase?: boolean;
  dark?: boolean;
};

const SCRIPT = 'GreatVibes_400Regular';
const SERIF = 'PlayfairDisplay_700Bold';

const THEMES: PosterTheme[] = [
  {
    key: 'simple',
    label: 'Enkel',
    background: ['#FFFFFF', '#FFFFFF'],
    ink: colors.ink,
    muted: colors.textMuted,
    line: colors.ink,
    headingFont: fonts.extrabold,
    headingSize: 46,
    lowercase: true,
  },
  {
    key: 'rose',
    label: 'Rosa',
    background: ['#FDF2F4', '#F7D9E0'],
    ink: '#7A2E46',
    muted: '#C08A9B',
    line: '#E8B9C6',
    card: 'rgba(255, 255, 255, 0.78)',
    headingFont: SCRIPT,
    headingSize: 70,
  },
  {
    key: 'night',
    label: 'Natt',
    background: ['#26221F', '#0E0D0C'],
    ink: '#E8D2A2',
    muted: '#857A66',
    line: 'rgba(232, 210, 162, 0.4)',
    headingFont: SCRIPT,
    headingSize: 70,
    dark: true,
  },
  {
    key: 'pastel',
    label: 'Pastell',
    background: ['#E6E1FF', '#FFE3D6'],
    ink: '#3B3363',
    muted: '#9A90C0',
    line: '#C9C1EC',
    card: 'rgba(255, 255, 255, 0.62)',
    headingFont: fonts.extrabold,
    headingSize: 46,
    lowercase: true,
  },
  {
    key: 'beige',
    label: 'Beige',
    background: ['#F5EEE5', '#EBDFD0'],
    ink: '#5A4434',
    muted: '#AE9886',
    line: '#D9C9B6',
    card: '#FBF7F2',
    headingFont: SERIF,
    headingSize: 50,
  },
];

const WEEKDAYS = ['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'];
// Flere tider enn dette får ikke plass i en rute når bildet skal passe i en story
const MAX_TIMES_IN_CELL = 5;

/**
 * Deler bildet på nettet med delingsmenyen der den finnes, ellers lastes det ned.
 * Gir false når nettleseren vil ha et nytt trykk fordi bildet tok for lang tid å lage (vanlig på mobil).
 */
async function shareOnWeb(file: File, mayAskAgain: boolean) {
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
      return true;
    }
  } catch (error) {
    const name = (error as Error).name;
    if (name === 'AbortError') return true;
    if (name === 'NotAllowedError' && mayAskAgain) return false;
    // Nettleseren nektet å dele av en annen grunn, så vi laster det ned i stedet
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(file);
  link.download = file.name;
  link.click();
  return true;
}

export default function AvailabilityScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const now = useNow();
  const { salon } = useBusiness();
  const posterRef = useRef<View>(null);
  const [fontsLoaded, fontError] = useFonts({ [SCRIPT]: GreatVibes_400Regular, [SERIF]: PlayfairDisplay_700Bold });
  const [mode, setMode] = useState<Mode>('month');
  const [anchorKey, setAnchorKey] = useState(() => toDateKey(new Date()));
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [themeKey, setThemeKey] = useState(THEMES[0].key);
  const [sharing, setSharing] = useState(false);
  // Bildet som er laget på nettet, men som nettleseren ville ha et nytt trykk for å dele
  const [prepared, setPrepared] = useState<{ file: File; madeFor: unknown[] } | null>(null);

  const anchor = fromDateKey(anchorKey);
  const first = mode === 'month' ? new Date(anchor.getFullYear(), anchor.getMonth(), 1) : startOfWeek(anchor);
  const last = mode === 'month' ? new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0) : addDays(first, 6);
  const { bookings, error } = useSalonBookings(salon?.id ?? null, toDateKey(first), toDateKey(last));

  // Et ferdig bilde gjelder bare så lenge oversikten ser lik ut
  const posterInputs = [mode, anchorKey, serviceId, themeKey, bookings, now];
  const readyFile = prepared?.madeFor.every((value, index) => value === posterInputs[index]) ? prepared.file : null;

  if (!salon) return null;

  const todayKey = toDateKey(now);
  const service = salon.services.find((item) => item.id === serviceId) ?? salon.services[0];
  const theme = THEMES.find((item) => item.key === themeKey) ?? THEMES[0];
  const staffIds = salon.staff.map((member) => member.id);
  const active = (bookings ?? []).filter((booking) => booking.status !== 'cancelled');
  const posterWidth = Math.min(width - 32, 420);
  const loading = bookings === null || !(fontsLoaded || fontError);

  // Bakover går bare til perioden vi er i nå; den starter på dagen i dag, så uke- og månedsvisning henger sammen
  const canGoBack = toDateKey(first) > todayKey;
  const step = (direction: 1 | -1) => {
    const target = mode === 'month' ? new Date(first.getFullYear(), first.getMonth() + direction, 1) : addDays(first, direction * 7);
    const key = toDateKey(target);
    setAnchorKey(key < todayKey ? todayKey : key);
  };

  const timesFor = (day: Date): OverviewTime[] =>
    service
      ? dayOverview({
          openingHours: salon.openingHours,
          closedDates: salon.closedDates,
          date: day,
          durationMin: service.durationMin,
          staffIds,
          bookings: active.filter((booking) => booking.date === toDateKey(day)),
          now,
        })
      : [];

  /** Tekst for dager uten noen tider i ukesoversikten. */
  const emptyLabel = (day: Date) => {
    const key = toDateKey(day);
    if (key < todayKey) return '';
    const closed =
      !hoursForDate(salon.openingHours, day, salon.closedDates) ||
      (staffIds.length > 0 && staffIds.every((staffId) => isDayOff(salon.closedDates, key, staffId)));
    return closed ? 'Stengt' : 'Fullt';
  };

  const share = async () => {
    // Ingen venting før delingsmenyen her, ellers nekter nettleseren igjen
    if (readyFile) {
      setPrepared(null);
      await shareOnWeb(readyFile, false);
      return;
    }
    setSharing(true);
    try {
      if (Platform.OS !== 'web') {
        const uri = await captureRef(posterRef, { format: 'png', quality: 1, result: 'tmpfile' });
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Del ledige timer' });
        return;
      }
      // html2canvas kopierer hele siden og venter uten tidsgrense på hvert bilde i kopien. Lazy-bilder
      // (standard i expo-image) lastes aldri der i Safari, så da lastet knappen for evig.
      document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((img) => (img.loading = 'eager'));
      const uri = await Promise.race([
        captureRef(posterRef, { format: 'png', quality: 1, result: 'data-uri' }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Brukte for lang tid på å lage bildet')), 20_000)),
      ]);
      const file = new File([await (await fetch(uri)).blob()], 'ledige-timer.png', { type: 'image/png' });
      if (!(await shareOnWeb(file, true))) setPrepared({ file, madeFor: posterInputs });
    } catch (shareError) {
      console.error('Kunne ikke dele bildet:', shareError);
      showAlert('Kunne ikke lage bildet', 'Prøv igjen om litt.');
    } finally {
      setSharing(false);
    }
  };

  const [monthName, year] = formatMonth(first).split(' ');
  const title = mode === 'month' ? monthName : `Uke ${weekNumber(first)}`;
  const subtitle = mode === 'month' ? year : formatWeekRange(first);

  const monthDays = upcomingDates(startOfWeek(first), 42);
  // Dropp siste rad hvis den bare har dager fra neste måned
  const weeks = Array.from({ length: monthDays[35].getMonth() !== first.getMonth() ? 5 : 6 }, (_, index) =>
    monthDays.slice(index * 7, index * 7 + 7)
  );

  // Rutenett med streker, eller kort med litt luft mellom
  const lined = { borderRightWidth: 1, borderBottomWidth: 1, borderColor: theme.line };
  const timeText = (item: OverviewTime) => [
    { color: item.booked ? theme.muted : theme.ink },
    item.booked && { textDecorationLine: 'line-through' as const, textDecorationColor: theme.muted },
  ];

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Del ledige timer" backTo="/business/calendar" />

      {!service ? (
        <EmptyState
          icon="pricetags-outline"
          title="Legg til en tjeneste først"
          message="Da vet vi hvor lange timene er, og kan regne ut hvilke tider som er ledige."
          actionLabel="Til tjenester"
          onAction={() => router.navigate('/business/services')}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.controls}>
            <SegmentedControl
              options={[
                { value: 'month', label: 'Måned' },
                { value: 'week', label: 'Uke' },
              ]}
              value={mode}
              onChange={setMode}
            />
            <View style={styles.navRow}>
              <IconButton
                icon="chevron-back"
                variant="soft"
                size={36}
                color={canGoBack ? colors.ink : colors.textMuted}
                onPress={() => canGoBack && step(-1)}
                accessibilityLabel={mode === 'month' ? 'Forrige måned' : 'Forrige uke'}
              />
              <Text variant="subheading" align="center" style={styles.navTitle}>
                {mode === 'month' ? formatMonth(first) : `Uke ${weekNumber(first)} · ${formatWeekRange(first)}`}
              </Text>
              <IconButton
                icon="chevron-forward"
                variant="soft"
                size={36}
                onPress={() => step(1)}
                accessibilityLabel={mode === 'month' ? 'Neste måned' : 'Neste uke'}
              />
            </View>
            {salon.services.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {salon.services.map((item) => (
                  <Chip
                    key={item.id}
                    label={`${item.name} · ${formatDuration(item.durationMin)}`}
                    selected={item.id === service.id}
                    onPress={() => setServiceId(item.id)}
                  />
                ))}
              </ScrollView>
            )}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themes}>
              {THEMES.map((item) => {
                const selected = item.key === theme.key;
                return (
                  <PressableScale
                    key={item.key}
                    scaleTo={0.94}
                    onPress={() => {
                      haptics.select();
                      setThemeKey(item.key);
                    }}
                    style={styles.themeOption}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Stil: ${item.label}`}
                  >
                    <LinearGradient colors={item.background} style={[styles.themeSwatch, selected && styles.themeSwatchSelected]}>
                      <Text style={{ fontFamily: item.headingFont, fontSize: item.headingFont === SCRIPT ? 26 : 19, color: item.ink }}>
                        Aa
                      </Text>
                    </LinearGradient>
                    <Text variant="caption" color={selected ? colors.ink : colors.textSecondary}>{item.label}</Text>
                  </PressableScale>
                );
              })}
            </ScrollView>
          </View>

          {error ? (
            <EmptyState icon="cloud-offline-outline" title="Kunne ikke hente timene" message="Sjekk nettet og prøv igjen." />
          ) : loading ? (
            <View style={[styles.loading, { width: posterWidth, height: (posterWidth * 16) / 9 }]}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <View ref={posterRef} collapsable={false} style={[styles.poster, { width: posterWidth, minHeight: (posterWidth * 16) / 9 }]}>
              <LinearGradient colors={theme.background} style={StyleSheet.absoluteFill} />
              <View style={styles.posterHeader}>
                <Text style={[styles.posterSalon, { color: theme.muted }]} numberOfLines={1}>{salon.name}</Text>
                <Text
                  style={{
                    fontFamily: theme.headingFont,
                    fontSize: theme.headingSize,
                    lineHeight: theme.headingSize * (theme.headingFont === SCRIPT ? 1.3 : 1.17),
                    letterSpacing: theme.headingFont === SCRIPT ? 0 : -theme.headingSize * 0.03,
                    color: theme.ink,
                  }}
                >
                  {theme.lowercase ? title.toLowerCase() : title}
                </Text>
                <Text style={[styles.posterSubtitle, { color: theme.muted }]}>{subtitle}</Text>
              </View>

              {mode === 'month' ? (
                <View style={theme.card ? styles.cardGrid : { borderTopWidth: 1, borderLeftWidth: 1, borderColor: theme.line }}>
                  <View style={[styles.gridRow, theme.card && styles.cardRow]}>
                    {WEEKDAYS.map((day) => (
                      <Text key={day} style={[styles.cell, styles.weekdayCell, { color: theme.ink }, !theme.card && lined]}>
                        {day}
                      </Text>
                    ))}
                  </View>
                  {weeks.map((week) => (
                    <View key={toDateKey(week[0])} style={[styles.gridRow, theme.card && styles.cardRow]}>
                      {week.map((day) => {
                        const inMonth = day.getMonth() === first.getMonth();
                        const times = inMonth ? timesFor(day) : [];
                        return (
                          <View
                            key={toDateKey(day)}
                            style={[
                              styles.cell,
                              styles.dayCell,
                              theme.card ? { borderRadius: 8, backgroundColor: inMonth ? theme.card : 'transparent' } : lined,
                            ]}
                          >
                            {inMonth && <Text style={[styles.dayNumber, { color: theme.muted }]}>{day.getDate()}</Text>}
                            {times.slice(0, MAX_TIMES_IN_CELL).map((item) => (
                              <Text key={item.time} style={[styles.cellTime, ...timeText(item)]}>{item.time}</Text>
                            ))}
                            {times.length > MAX_TIMES_IN_CELL && (
                              <Text style={[styles.more, { color: theme.muted }]}>+{times.length - MAX_TIMES_IN_CELL}</Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={theme.card ? styles.cardWeek : { borderTopWidth: 1, borderColor: theme.line }}>
                  {upcomingDates(first, 7).map((day) => {
                    const times = timesFor(day);
                    const { weekday, day: dayOfMonth } = formatDayChip(day);
                    return (
                      <View
                        key={toDateKey(day)}
                        style={[
                          styles.weekRow,
                          theme.card
                            ? { backgroundColor: theme.card, borderRadius: 12, paddingHorizontal: 10 }
                            : { borderBottomWidth: 1, borderColor: theme.line },
                        ]}
                      >
                        <View style={styles.weekDay}>
                          <Text style={[styles.weekdayName, { color: theme.muted }]}>{weekday}</Text>
                          <Text style={[styles.weekdayDate, { color: theme.ink }]}>{dayOfMonth}.</Text>
                        </View>
                        <View style={styles.weekTimes}>
                          {times.length > 0 ? (
                            times.map((item) => (
                              <Text key={item.time} style={[styles.weekTime, ...timeText(item)]}>{item.time}</Text>
                            ))
                          ) : (
                            <Text style={[styles.weekEmpty, { color: theme.muted }]}>{emptyLabel(day)}</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={styles.watermark}>
                <LogoMark height={9} white={theme.dark} />
                <Text style={[styles.watermarkText, { color: theme.ink }]}>Bookzy</Text>
              </View>
            </View>
          )}

          <Text variant="caption" align="center" style={styles.hint}>
            Tidene passer for {service.name.toLowerCase()} ({formatDuration(service.durationMin)}). Bookede timer er streket over,
            og ingen navn vises.
          </Text>
          <Button
            title={readyFile ? 'Bildet er klart – del nå' : 'Del bilde'}
            icon="share-outline"
            size="lg"
            loading={sharing}
            disabled={loading || error}
            onPress={share}
            style={[styles.shareButton, { width: posterWidth }]}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { alignItems: 'center', padding: 16, paddingBottom: 40, gap: 16 },
  controls: { width: '100%', maxWidth: 420, gap: 12 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navTitle: { flex: 1, color: colors.ink },
  chips: { gap: 8 },
  themes: { gap: 12, paddingVertical: 2 },
  themeOption: { alignItems: 'center', gap: 4 },
  themeSwatch: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  themeSwatchSelected: { borderWidth: 2.5, borderColor: colors.primary },
  loading: { alignItems: 'center', justifyContent: 'center' },
  // Uten avrundede hjørner, så det delte bildet ikke får gjennomsiktige kanter
  poster: {
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 36,
    paddingBottom: 28,
    justifyContent: 'center',
    gap: 22,
    ...shadows.card,
  },
  posterHeader: { alignItems: 'center' },
  posterSalon: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 4 },
  posterSubtitle: { fontFamily: fonts.medium, fontSize: 15 },
  gridRow: { flexDirection: 'row' },
  cardGrid: { gap: 3 },
  cardRow: { gap: 3 },
  cell: { flex: 1 },
  weekdayCell: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.6, textAlign: 'center', paddingVertical: 4 },
  dayCell: { minHeight: 64, paddingHorizontal: 2, paddingTop: 2, paddingBottom: 4, alignItems: 'center' },
  dayNumber: { alignSelf: 'flex-end', fontFamily: fonts.medium, fontSize: 9, marginRight: 2, marginBottom: 2 },
  cellTime: { fontFamily: fonts.semibold, fontSize: 11.5, lineHeight: 15 },
  more: { fontFamily: fonts.bold, fontSize: 10 },
  cardWeek: { gap: 6 },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  weekDay: { width: 44, alignItems: 'center' },
  weekdayName: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  weekdayDate: { fontFamily: fonts.extrabold, fontSize: 20, lineHeight: 24 },
  weekTimes: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4 },
  weekTime: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  weekEmpty: { fontFamily: fonts.medium, fontSize: 14 },
  watermark: { position: 'absolute', right: 14, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 4, opacity: 0.4 },
  watermarkText: { fontFamily: fonts.semibold, fontSize: 10 },
  hint: { maxWidth: 420 },
  shareButton: { maxWidth: 420 },
});
