import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { colors, fonts, radius } from '@/constants/theme';
import type { Booking } from '@/context/BookingContext';
import { formatTimeRange, toMinutes, toTime, type DayHours } from '@/lib/schedule';

const HOUR_HEIGHT = 80;
const PER_MINUTE = HOUR_HEIGHT / 60;
const GUTTER = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

export type TimelineColumn = {
  key: string;
  title?: string;
  subtitle?: string;
  /** Viser «nå»-linjen */
  isToday?: boolean;
  /** Fremhever overskriften, f.eks. dagens dato i ukevisningen */
  highlight?: boolean;
  hours: DayHours | null;
  /** Vises øverst når kolonnen er stengt, f.eks. «Stengt» eller «Fri» */
  closedLabel?: string;
  bookings: Booking[];
  onPressTitle?: () => void;
};

type TimelineProps = {
  columns: TimelineColumn[];
  now: Date;
  onPressBooking: (booking: Booking) => void;
  /** Vis hvem timen er hos, når flere ansatte står i samme kolonne */
  showStaff?: boolean;
};

type Placed = { booking: Booking; lane: number; lanes: number };

/** Timer som overlapper (hos ulike ansatte) legges ved siden av hverandre. */
function placeBookings(bookings: Booking[]): Placed[] {
  const sorted = [...bookings].sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
  const placed: Placed[] = [];
  let group: Placed[] = [];
  let laneEnds: number[] = [];
  let groupEnd = -1;

  const closeGroup = () => {
    group.forEach((item) => (item.lanes = laneEnds.length));
    placed.push(...group);
    group = [];
    laneEnds = [];
  };

  for (const booking of sorted) {
    const start = toMinutes(booking.time);
    const end = start + booking.durationMin;
    if (start >= groupEnd) closeGroup();
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    group.push({ booking, lane, lanes: 1 });
    groupEnd = Math.max(groupEnd, end);
  }
  closeGroup();
  return placed;
}

function blockColors(booking: Booking, now: Date) {
  if (booking.status === 'noShow') return { background: colors.warningSoft, bar: colors.warning, text: colors.text };
  if (booking.endAt.getTime() <= now.getTime()) return { background: colors.divider, bar: colors.textMuted, text: colors.textSecondary };
  return { background: colors.primarySoft, bar: colors.primary, text: colors.ink };
}

export function Timeline({ columns, now, onPressBooking, showStaff = false }: TimelineProps) {
  const opens = columns.flatMap((column) => (column.hours ? [toMinutes(column.hours.open)] : []));
  const closes = columns.flatMap((column) => (column.hours ? [toMinutes(column.hours.close)] : []));
  const starts = columns.flatMap((column) => column.bookings.map((booking) => toMinutes(booking.time)));
  const ends = columns.flatMap((column) => column.bookings.map((booking) => toMinutes(booking.time) + booking.durationMin));
  const first = Math.min(...opens, ...starts);
  const last = Math.max(...closes, ...ends);
  const startMin = Number.isFinite(first) ? Math.floor(first / 60) * 60 : 9 * 60;
  const endMin = Number.isFinite(last) ? Math.min(24 * 60, Math.ceil(last / 60) * 60) : 17 * 60;
  const height = (endMin - startMin) * PER_MINUTE;
  const hours = Array.from({ length: (endMin - startMin) / 60 + 1 }, (_, index) => startMin + index * 60);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showHeader = columns.some((column) => column.title);

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.headerRow}>
          <View style={{ width: GUTTER }} />
          {columns.map((column) => (
            <Pressable
              key={column.key}
              onPress={column.onPressTitle}
              disabled={!column.onPressTitle}
              style={styles.headerCell}
              accessibilityRole={column.onPressTitle ? 'button' : undefined}
            >
              <Text variant="label" numberOfLines={1} color={column.highlight ? colors.primary : colors.ink}>{column.title}</Text>
              {column.subtitle ? (
                <Text variant="caption" numberOfLines={1} color={column.highlight ? colors.primary : colors.textMuted}>
                  {column.subtitle}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.grid, { height }]}>
          <View style={{ width: GUTTER }}>
            {hours.map((minutes) => (
              <Text key={minutes} style={[styles.hourLabel, { top: (minutes - startMin) * PER_MINUTE - 8 }]}>
                {toTime(minutes)}
              </Text>
            ))}
          </View>

          {columns.map((column) => {
            const open = column.hours ? toMinutes(column.hours.open) : null;
            const close = column.hours ? toMinutes(column.hours.close) : null;
            return (
              <View key={column.key} style={styles.column}>
                {open !== null && close !== null && (
                  <View style={[styles.openArea, { top: (open - startMin) * PER_MINUTE, height: (close - open) * PER_MINUTE }]} />
                )}
                {hours.map((minutes) => (
                  <View key={minutes} style={[styles.hourLine, { top: (minutes - startMin) * PER_MINUTE }]} />
                ))}
                {!column.hours && column.closedLabel ? (
                  <View style={styles.closedTag}>
                    <Text variant="caption" color={colors.textMuted}>{column.closedLabel}</Text>
                  </View>
                ) : null}

                {placeBookings(column.bookings).map(({ booking, lane, lanes }) => {
                  const top = (toMinutes(booking.time) - startMin) * PER_MINUTE;
                  const blockHeight = Math.max(booking.durationMin * PER_MINUTE - 2, 24);
                  const palette = blockColors(booking, now);
                  const isNew =
                    booking.createdAt !== null &&
                    now.getTime() - booking.createdAt.getTime() < DAY_MS &&
                    booking.startAt.getTime() > now.getTime();
                  return (
                    <Pressable
                      key={booking.id}
                      onPress={() => onPressBooking(booking)}
                      style={({ pressed }) => [
                        styles.block,
                        {
                          top,
                          height: blockHeight,
                          left: `${(lane / lanes) * 100}%`,
                          width: `${100 / lanes}%`,
                        },
                        pressed && styles.blockPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${booking.time} ${booking.customerName}, ${booking.serviceName}`}
                    >
                      <View style={[styles.blockInner, { backgroundColor: palette.background, borderLeftColor: palette.bar }]}>
                        <Text numberOfLines={1} style={[styles.blockTime, { color: palette.text }]}>
                          {blockHeight < 38
                            ? `${booking.time} ${booking.customerName}`
                            : formatTimeRange(booking.time, booking.durationMin)}
                          {isNew ? <Text style={styles.newTag}>  NY</Text> : null}
                        </Text>
                        {blockHeight >= 38 && (
                          <Text numberOfLines={1} style={[styles.blockName, { color: palette.text }]}>
                            {booking.customerName || 'Kunde'}
                          </Text>
                        )}
                        {blockHeight >= 56 && (
                          <Text numberOfLines={1} style={[styles.blockService, { color: palette.text }]}>
                            {booking.serviceName}
                            {showStaff && booking.staffName ? ` · ${booking.staffName.split(' ')[0]}` : ''}
                          </Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })}

                {column.isToday && nowMin >= startMin && nowMin <= endMin && (
                  <View style={[styles.nowLine, { top: (nowMin - startMin) * PER_MINUTE }]}>
                    <View style={styles.nowDot} />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerCell: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 12, paddingBottom: 32, paddingRight: 8 },
  grid: { flexDirection: 'row' },
  hourLabel: {
    position: 'absolute',
    right: 8,
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textMuted,
  },
  column: {
    flex: 1,
    backgroundColor: colors.divider,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.border,
  },
  openArea: { position: 'absolute', left: 0, right: 0, backgroundColor: colors.surface },
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  closedTag: { alignItems: 'center', paddingTop: 12 },
  block: { position: 'absolute', padding: 2 },
  blockPressed: { opacity: 0.75 },
  blockInner: {
    flex: 1,
    borderRadius: radius.sm,
    borderLeftWidth: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  blockTime: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15 },
  blockName: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 17 },
  blockService: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  newTag: { fontFamily: fonts.extrabold, fontSize: 10, color: colors.primary },
  nowLine: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: colors.danger },
  nowDot: {
    position: 'absolute',
    left: -5,
    top: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
  },
});
