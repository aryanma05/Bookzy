import { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Poster, POSTER_THEMES, PosterThemePicker, usePosterFonts, usePosterShare } from '@/components/business/poster';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import { colors, fonts } from '@/constants/theme';
import { useBusiness } from '@/context/BusinessContext';
import { useNow } from '@/hooks/use-now';
import { useSalonBookings } from '@/hooks/use-salon-bookings';
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

const WEEKDAYS = ['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'];
// Flere tider enn dette får ikke plass i en rute når bildet skal passe i en story
const MAX_TIMES_IN_CELL = 5;

export default function AvailabilityScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const now = useNow();
  const { salon } = useBusiness();
  const posterRef = useRef<View>(null);
  const fontsReady = usePosterFonts();
  const [mode, setMode] = useState<Mode>('month');
  const [anchorKey, setAnchorKey] = useState(() => toDateKey(new Date()));
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [themeKey, setThemeKey] = useState(POSTER_THEMES[0].key);

  const anchor = fromDateKey(anchorKey);
  const first = mode === 'month' ? new Date(anchor.getFullYear(), anchor.getMonth(), 1) : startOfWeek(anchor);
  const last = mode === 'month' ? new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0) : addDays(first, 6);
  const { bookings, error } = useSalonBookings(salon?.id ?? null, toDateKey(first), toDateKey(last));

  const posterInputs = [mode, anchorKey, serviceId, themeKey, bookings, now];
  const { share, sharing, ready } = usePosterShare(posterRef, 'ledige-timer.png', 'Del ledige timer', posterInputs);

  if (!salon) return null;

  const todayKey = toDateKey(now);
  const service = salon.services.find((item) => item.id === serviceId) ?? salon.services[0];
  const theme = POSTER_THEMES.find((item) => item.key === themeKey) ?? POSTER_THEMES[0];
  const staffIds = salon.staff.map((member) => member.id);
  const active = (bookings ?? []).filter((booking) => booking.status !== 'cancelled');
  const posterWidth = Math.min(width - 32, 420);
  const loading = bookings === null || !fontsReady;

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
            <PosterThemePicker value={theme.key} onChange={setThemeKey} />
          </View>

          {error ? (
            <EmptyState icon="cloud-offline-outline" title="Kunne ikke hente timene" message="Sjekk nettet og prøv igjen." />
          ) : loading ? (
            <View style={[styles.loading, { width: posterWidth, height: (posterWidth * 16) / 9 }]}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <Poster ref={posterRef} theme={theme} width={posterWidth} salonName={salon.name} title={title} subtitle={subtitle}>
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
            </Poster>
          )}

          <Text variant="caption" align="center" style={styles.hint}>
            Tidene passer for {service.name.toLowerCase()} ({formatDuration(service.durationMin)}). Bookede timer er streket over,
            og ingen navn vises.
          </Text>
          <Button
            title={ready ? 'Bildet er klart – del nå' : 'Del bilde'}
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
  loading: { alignItems: 'center', justifyContent: 'center' },
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
  hint: { maxWidth: 420 },
  shareButton: { maxWidth: 420 },
});
