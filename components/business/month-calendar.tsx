import { StyleSheet, View } from 'react-native';
import { IconButton } from '@/components/ui/icon-button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { colors, fonts } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { addDays, formatMonth, startOfWeek, toDateKey } from '@/lib/schedule';

const WEEKDAYS = ['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'];

type MonthCalendarProps = {
  /** Første dag i måneden som vises */
  month: Date;
  onChangeMonth: (month: Date) => void;
  isSelected: (dateKey: string) => boolean;
  /** Dager som ikke kan velges, f.eks. dager som har vært */
  isDisabled: (date: Date) => boolean;
  /** Dager som er stengt uansett (fast fridag i åpningstidene) */
  isRegularlyClosed?: (date: Date) => boolean;
  onToggle: (dateKey: string) => void;
  canGoBack?: boolean;
};

export function MonthCalendar({
  month,
  onChangeMonth,
  isSelected,
  isDisabled,
  isRegularlyClosed,
  onToggle,
  canGoBack = true,
}: MonthCalendarProps) {
  const first = startOfWeek(month);
  const days = Array.from({ length: 42 }, (_, index) => addDays(first, index));
  // Dropp siste rad hvis den bare har dager fra neste måned
  const visible = days[35].getMonth() !== month.getMonth() ? days.slice(0, 35) : days;
  const todayKey = toDateKey(new Date());

  return (
    <View style={styles.calendar}>
      <View style={styles.header}>
        <IconButton
          icon="chevron-back"
          variant="soft"
          size={36}
          color={canGoBack ? colors.ink : colors.textMuted}
          onPress={() => canGoBack && onChangeMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          accessibilityLabel="Forrige måned"
        />
        <Text variant="subheading" style={styles.month}>{formatMonth(month)}</Text>
        <IconButton
          icon="chevron-forward"
          variant="soft"
          size={36}
          onPress={() => onChangeMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          accessibilityLabel="Neste måned"
        />
      </View>

      <View style={styles.row}>
        {WEEKDAYS.map((day) => (
          <Text key={day} variant="overline" align="center" style={styles.cell}>{day}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {visible.map((date) => {
          const key = toDateKey(date);
          const inMonth = date.getMonth() === month.getMonth();
          const disabled = !inMonth || isDisabled(date) || !!isRegularlyClosed?.(date);
          const selected = inMonth && isSelected(key);
          const regularlyClosed = inMonth && !!isRegularlyClosed?.(date);
          return (
            <View key={key} style={styles.cell}>
              {inMonth && (
                <PressableScale
                  scaleTo={0.9}
                  disabled={disabled}
                  onPress={() => {
                    haptics.select();
                    onToggle(key);
                  }}
                  style={[styles.day, selected && styles.daySelected, key === todayKey && !selected && styles.today]}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled }}
                  accessibilityLabel={`${date.getDate()}.${regularlyClosed ? ' Stengt' : ''}`}
                >
                  <Text
                    style={[
                      styles.dayText,
                      selected && styles.dayTextSelected,
                      disabled && !selected && styles.dayTextDisabled,
                      regularlyClosed && styles.dayTextClosed,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                </PressableScale>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  month: { flex: 1, textAlign: 'center', color: colors.ink },
  row: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  day: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: { backgroundColor: colors.ink },
  today: { borderWidth: 1.5, borderColor: colors.primary },
  dayText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  dayTextSelected: { color: '#FFFFFF' },
  dayTextDisabled: { color: colors.textMuted, opacity: 0.6 },
  dayTextClosed: { textDecorationLine: 'line-through' },
});
