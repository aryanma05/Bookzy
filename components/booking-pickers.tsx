import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/avatar';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { colors, fonts, radius } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import type { StaffMember } from '@/lib/salons';
import { formatDayChip, groupByPeriod, toDateKey, type AvailableTime } from '@/lib/schedule';

export function StaffPicker({
  staff,
  selectedId,
  onSelect,
}: {
  staff: StaffMember[];
  selectedId: string | null;
  onSelect: (staffId: string | null) => void;
}) {
  const options = [{ id: null, name: 'Hvem som helst', title: '' }, ...staff];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.staffRow}>
      {options.map((member) => {
        const selected = member.id === selectedId;
        return (
          <PressableScale
            key={member.id ?? 'any'}
            style={styles.staff}
            onPress={() => {
              haptics.select();
              onSelect(member.id);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            {member.id === null ? (
              <View style={[styles.anyAvatar, selected && styles.anyAvatarSelected]}>
                <Ionicons name="people" size={24} color={selected ? '#FFFFFF' : colors.primary} />
              </View>
            ) : (
              <Avatar name={member.name} size={56} selected={selected} />
            )}
            <Text
              variant="label"
              numberOfLines={member.id === null ? 2 : 1}
              align="center"
              color={selected ? colors.primaryDark : colors.text}
            >
              {member.id === null ? 'Hvem som helst' : member.name.split(' ')[0]}
            </Text>
            {member.id !== null && (
              <Text variant="caption" numberOfLines={1} align="center" color={colors.textMuted} style={styles.staffTitle}>
                {member.title}
              </Text>
            )}
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

export function DateStrip({
  dates,
  selectedKey,
  onSelect,
  isClosed,
}: {
  dates: Date[];
  selectedKey: string;
  onSelect: (dateKey: string) => void;
  isClosed: (date: Date) => boolean;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
      {dates.map((date, index) => {
        const key = toDateKey(date);
        const selected = key === selectedKey;
        const closed = isClosed(date);
        const { weekday, day } = formatDayChip(date);
        return (
          <PressableScale
            key={key}
            scaleTo={0.94}
            onPress={() => {
              haptics.select();
              onSelect(key);
            }}
            style={[styles.dateChip, selected && styles.dateChipSelected, closed && !selected && styles.dateChipClosed]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.weekday, selected && styles.onPrimary]}>{index === 0 ? 'I dag' : weekday}</Text>
            <Text style={[styles.day, selected && styles.onPrimary]}>{day}</Text>
            {closed && <Text style={[styles.closed, selected && styles.onPrimary]}>Stengt</Text>}
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

export function TimeGrid({
  times,
  selected,
  onSelect,
}: {
  times: AvailableTime[];
  selected: string | null;
  onSelect: (time: string) => void;
}) {
  return (
    <View style={styles.periods}>
      {groupByPeriod(times).map((group) => (
        <View key={group.label} style={styles.period}>
          <Text variant="overline">{group.label}</Text>
          <View style={styles.timeWrap}>
            {group.items.map(({ time }) => {
              const isSelected = time === selected;
              return (
                <PressableScale
                  key={time}
                  scaleTo={0.93}
                  onPress={() => {
                    haptics.select();
                    onSelect(time);
                  }}
                  style={[styles.time, isSelected && styles.timeSelected]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text style={[styles.timeText, isSelected && styles.onPrimary]}>{time}</Text>
                </PressableScale>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  staffRow: { paddingHorizontal: 20, gap: 14 },
  staff: { width: 88, alignItems: 'center', gap: 6 },
  anyAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anyAvatarSelected: { backgroundColor: colors.primary },
  staffTitle: { marginTop: -4 },
  dateRow: { paddingHorizontal: 20, gap: 8 },
  dateChip: {
    width: 58,
    height: 72,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateChipClosed: { backgroundColor: colors.background, borderColor: colors.divider },
  weekday: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textSecondary },
  day: { fontFamily: fonts.extrabold, fontSize: 20, lineHeight: 26, color: colors.ink },
  closed: { fontFamily: fonts.medium, fontSize: 10, color: colors.textMuted },
  onPrimary: { color: '#FFFFFF' },
  periods: { gap: 18 },
  period: { gap: 10 },
  timeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  time: {
    width: 76,
    height: 42,
    borderRadius: radius.sm + 2,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  timeText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
});
