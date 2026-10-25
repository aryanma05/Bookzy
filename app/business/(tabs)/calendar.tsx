import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Timeline, type TimelineColumn } from '@/components/business/timeline';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import { colors, fonts, radius, shadows } from '@/constants/theme';
import type { Booking } from '@/context/BookingContext';
import { useBusiness } from '@/context/BusinessContext';
import { useNow } from '@/hooks/use-now';
import { useSalonBookings } from '@/hooks/use-salon-bookings';
import { formatPrice, type Salon } from '@/lib/salons';
import {
  addDays,
  dayOffKey,
  formatDay,
  formatDayChip,
  formatShortDate,
  formatTimeRange,
  formatWeekRange,
  fromDateKey,
  hoursForDate,
  startOfWeek,
  toDateKey,
  upcomingDates,
  weekNumber,
  type DayHours,
} from '@/lib/schedule';

type Mode = 'day' | 'week';

/** Åpningstid for en dag, eventuelt for én ansatt. `label` forklarer hvorfor det er stengt. */
function dayStatus(salon: Salon, date: Date, staffId?: string | null): { hours: DayHours | null; label?: string } {
  const key = toDateKey(date);
  if (salon.closedDates.includes(key)) return { hours: null, label: 'Fridag' };
  if (staffId && salon.closedDates.includes(dayOffKey(key, staffId))) return { hours: null, label: 'Fri' };
  const hours = hoursForDate(salon.openingHours, date);
  return hours ? { hours } : { hours: null, label: 'Stengt' };
}

function summarize(bookings: Booking[]) {
  if (bookings.length === 0) return 'Ingen timer';
  const total = bookings.filter((booking) => booking.status === 'confirmed').reduce((sum, booking) => sum + booking.priceNok, 0);
  return `${bookings.length} ${bookings.length === 1 ? 'time' : 'timer'} · ${formatPrice(total)}`;
}

const firstName = (name: string) => name.split(' ')[0];

export default function CalendarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const now = useNow();
  const { salon } = useBusiness();
  const [mode, setMode] = useState<Mode>('day');
  const [dateKey, setDateKey] = useState(() => toDateKey(new Date()));
  const [staffFilter, setStaffFilter] = useState<string | null>(null);

  const date = fromDateKey(dateKey);
  const monday = startOfWeek(date);
  const weekDays = upcomingDates(monday, 7);
  // Hele uka hentes uansett, så det går raskt å bla mellom dagene
  const { bookings, error } = useSalonBookings(salon?.id ?? null, toDateKey(monday), toDateKey(weekDays[6]));

  if (!salon) return null;

  const wide = width >= 900;
  const todayKey = toDateKey(now);
  const multiStaff = salon.staff.length > 1;
  const filter = staffFilter && salon.staff.some((member) => member.id === staffFilter) ? staffFilter : null;
  const visible = (bookings ?? []).filter((booking) => !filter || booking.staffId === filter);
  const active = visible.filter((booking) => booking.status !== 'cancelled');
  const dayVisible = visible.filter((booking) => booking.date === dateKey);
  const dayBookings = dayVisible.filter((booking) => booking.status !== 'cancelled');
  const dayCancelled = dayVisible.length - dayBookings.length;

  const isCurrent = mode === 'day' ? dateKey === todayKey : toDateKey(monday) === toDateKey(startOfWeek(now));
  const step = (direction: 1 | -1) => setDateKey(toDateKey(addDays(date, direction * (mode === 'day' ? 1 : 7))));
  const openDay = (key: string) => {
    setDateKey(key);
    setMode('day');
  };
  const openBooking = (booking: Booking) => router.push(`/business/booking/${booking.id}`);

  const dayLabel = formatDay(date, now);
  const title =
    mode === 'day'
      ? dateKey === todayKey || dayLabel === 'I morgen'
        ? `${dayLabel} · ${formatShortDate(date)}`
        : dayLabel
      : `Uke ${weekNumber(monday)} · ${formatWeekRange(monday)}`;
  const summary =
    mode === 'day'
      ? `${summarize(dayBookings)}${dayCancelled ? ` · ${dayCancelled} avbestilt` : ''}`
      : summarize(active);

  const dayColumns = (): TimelineColumn[] => {
    const shown = filter ? salon.staff.filter((member) => member.id === filter) : salon.staff;
    const columns: TimelineColumn[] = shown.map((member) => {
      const status = dayStatus(salon, date, member.id);
      return {
        key: member.id,
        title: multiStaff && !filter ? firstName(member.name) : undefined,
        hours: status.hours,
        closedLabel: status.label,
        isToday: dateKey === todayKey,
        bookings: dayVisible.filter((booking) => booking.staffId === member.id),
      };
    });
    // Timer hos noen som ikke lenger står på listen over ansatte
    const others = filter ? [] : dayVisible.filter((booking) => !salon.staff.some((member) => member.id === booking.staffId));
    if (others.length > 0) {
      columns.push({ key: 'others', title: 'Andre', hours: null, isToday: dateKey === todayKey, bookings: others });
    }
    return columns;
  };

  const weekColumns = (): TimelineColumn[] =>
    weekDays.map((day) => {
      const key = toDateKey(day);
      const status = dayStatus(salon, day, filter);
      const { weekday, day: dayOfMonth } = formatDayChip(day);
      return {
        key,
        title: `${weekday} ${dayOfMonth}.`,
        subtitle: status.hours ? undefined : status.label,
        hours: status.hours,
        closedLabel: status.label,
        isToday: key === todayKey,
        highlight: key === todayKey,
        bookings: visible.filter((booking) => booking.date === key),
        onPressTitle: () => openDay(key),
      };
    });

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.titleRow}>
          <View style={styles.flex}>
            <Text variant="caption" numberOfLines={1}>{salon.name}</Text>
            <Text variant="title">Kalender</Text>
          </View>
          <IconButton
            icon="share-social-outline"
            variant="soft"
            size={36}
            onPress={() => router.push('/business/availability')}
            accessibilityLabel="Del ledige timer"
          />
          <View style={styles.modeSwitch}>
            <SegmentedControl
              options={[
                { value: 'day', label: 'Dag' },
                { value: 'week', label: 'Uke' },
              ]}
              value={mode}
              onChange={setMode}
            />
          </View>
        </View>

        <View style={styles.navRow}>
          <IconButton icon="chevron-back" variant="soft" size={36} onPress={() => step(-1)} accessibilityLabel="Forrige" />
          <View style={styles.navText}>
            <Text variant="subheading" numberOfLines={1} style={styles.navTitle}>{title}</Text>
            <Text variant="caption" numberOfLines={1}>{bookings ? summary : ' '}</Text>
          </View>
          <IconButton icon="chevron-forward" variant="soft" size={36} onPress={() => step(1)} accessibilityLabel="Neste" />
          {!isCurrent && (
            <Button title="I dag" size="sm" variant="secondary" onPress={() => setDateKey(todayKey)} style={styles.todayButton} />
          )}
        </View>

        {multiStaff && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.staffRow}>
            <Chip label="Alle" selected={!filter} onPress={() => setStaffFilter(null)} />
            {salon.staff.map((member) => (
              <Chip
                key={member.id}
                label={firstName(member.name)}
                selected={filter === member.id}
                onPress={() => setStaffFilter(member.id)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {!salon.published && (
        <PressableScale style={styles.banner} scaleTo={0.99} onPress={() => router.navigate('/business/salon')}>
          <Ionicons name="eye-off-outline" size={18} color={colors.warning} />
          <Text variant="caption" color={colors.text} style={styles.flex}>
            Siden din er ikke publisert ennå, så kundene kan ikke booke. Trykk her for å gjøre den klar.
          </Text>
        </PressableScale>
      )}

      {error ? (
        <EmptyState icon="cloud-offline-outline" title="Kunne ikke hente kalenderen" message="Sjekk nettet og prøv igjen." />
      ) : bookings === null ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : mode === 'day' ? (
        <Timeline columns={dayColumns()} now={now} onPressBooking={openBooking} />
      ) : wide ? (
        <Timeline columns={weekColumns()} now={now} onPressBooking={openBooking} showStaff={multiStaff && !filter} />
      ) : (
        <ScrollView contentContainerStyle={styles.agenda}>
          {weekDays.map((day) => {
            const key = toDateKey(day);
            const list = visible.filter((booking) => booking.date === key);
            const status = dayStatus(salon, day, filter);
            const isToday = key === todayKey;
            const dayActive = list.filter((booking) => booking.status !== 'cancelled');
            return (
              <View key={key} style={styles.agendaDay}>
                <Pressable onPress={() => openDay(key)} style={styles.agendaHeader} accessibilityRole="button">
                  <Text variant="subheading" color={isToday ? colors.primary : colors.ink} style={styles.flex}>
                    {formatShortDate(day)}{isToday ? ' · I dag' : ''}
                  </Text>
                  <Text variant="caption">
                    {dayActive.length > 0 || status.hours ? summarize(dayActive) : status.label}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
                {list.map((booking) => (
                  <AgendaRow
                    key={booking.id}
                    booking={booking}
                    now={now}
                    showStaff={multiStaff && !filter}
                    onPress={() => openBooking(booking)}
                  />
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function AgendaRow({ booking, now, showStaff, onPress }: { booking: Booking; now: Date; showStaff: boolean; onPress: () => void }) {
  const past = booking.endAt.getTime() <= now.getTime();
  const tag =
    booking.status === 'cancelled'
      ? { label: 'Avbestilt', color: colors.danger, background: colors.dangerSoft }
      : booking.status === 'noShow'
        ? { label: 'Møtte ikke', color: colors.warning, background: colors.warningSoft }
        : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.agendaRow, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <View style={[styles.agendaBar, { backgroundColor: tag ? tag.color : past ? colors.textMuted : colors.primary }]} />
      <View style={styles.agendaTime}>
        <Text style={[styles.agendaTimeText, booking.status === 'cancelled' && styles.struck]}>
          {formatTimeRange(booking.time, booking.durationMin)}
        </Text>
      </View>
      <View style={styles.flex}>
        <Text variant="bodyStrong" numberOfLines={1} color={booking.status === 'cancelled' ? colors.textMuted : colors.ink}>
          {booking.customerName || 'Kunde'}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {booking.serviceName}
          {showStaff && booking.staffName ? ` · ${firstName(booking.staffName)}` : ''}
        </Text>
      </View>
      {tag && (
        <View style={[styles.tag, { backgroundColor: tag.background }]}>
          <Text style={[styles.tagText, { color: tag.color }]}>{tag.label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 16 },
  modeSwitch: { width: 160 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navText: { flex: 1, alignItems: 'center' },
  navTitle: { color: colors.ink },
  todayButton: { marginLeft: 2 },
  staffRow: { gap: 8 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 12,
    marginBottom: 0,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  agenda: { padding: 16, gap: 12, paddingBottom: 32 },
  agendaDay: { borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden', ...shadows.card },
  agendaHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  agendaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingRight: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  pressed: { backgroundColor: colors.background },
  agendaBar: { width: 3, alignSelf: 'stretch', borderRadius: 2, marginLeft: 12 },
  agendaTime: { width: 92 },
  agendaTimeText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  struck: { textDecorationLine: 'line-through', color: colors.textMuted },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  tagText: { fontFamily: fonts.bold, fontSize: 11 },
});
