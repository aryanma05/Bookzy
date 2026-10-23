import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FormScreen } from '@/components/business/form-screen';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { TimeSelect } from '@/components/ui/time-select';
import { colors, radius, shadows } from '@/constants/theme';
import { useBusiness } from '@/context/BusinessContext';
import { showAlert } from '@/lib/alert';
import { haptics } from '@/lib/haptics';
import {
  timesOfDay,
  toMinutes,
  toTime,
  WEEK,
  type DayHours,
  type OpeningHours,
  type TimeRange,
  type WeekdayKey,
} from '@/lib/schedule';

const TIMES = timesOfDay();
const WEEKDAYS: WeekdayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri'];

const badHours = (day: DayHours) => toMinutes(day.close) <= toMinutes(day.open);
const badBreaks = (day: DayHours) =>
  (day.breaks ?? []).some(
    (pause) =>
      toMinutes(pause.end) <= toMinutes(pause.start) ||
      toMinutes(pause.start) < toMinutes(day.open) ||
      toMinutes(pause.end) > toMinutes(day.close)
  );

export default function OpeningHoursScreen() {
  const router = useRouter();
  const { salon, saveSalon } = useBusiness();
  const [draft, setDraft] = useState<OpeningHours | null>(null);
  const [flexibleDraft, setFlexibleDraft] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  if (!salon) return null;

  const hours = draft ?? salon.openingHours;
  const flexible = flexibleDraft ?? salon.flexibleHours;
  const invalid = WEEK.filter(({ key }) => {
    const day = hours[key];
    return day && (badHours(day) || badBreaks(day));
  });

  const setDay = (key: WeekdayKey, value: DayHours | null) => setDraft({ ...hours, [key]: value });

  // Uten pauser lagres dagen som før, uten et tomt felt
  const setBreaks = (key: WeekdayKey, day: DayHours, breaks: TimeRange[]) =>
    setDay(key, breaks.length > 0 ? { ...day, breaks } : { open: day.open, close: day.close });

  const addBreak = (key: WeekdayKey, day: DayHours) => {
    haptics.select();
    // Rundt lunsj, men innenfor tidene den dagen
    const start = Math.max(toMinutes(day.open), Math.min(12 * 60, toMinutes(day.close) - 60));
    setBreaks(key, day, [...(day.breaks ?? []), { start: toTime(start), end: toTime(start + 30) }]);
  };

  const toggle = (key: WeekdayKey, open: boolean) => {
    // Ny åpen dag får samme tider som nærmeste åpne dag
    const template = WEEK.map((day) => hours[day.key]).find(Boolean) ?? { open: '09:00', close: '17:00' };
    setDay(key, open ? { ...template } : null);
  };

  const copyMonday = () => {
    const monday = hours.mon;
    if (!monday) return;
    haptics.select();
    setDraft({ ...hours, ...Object.fromEntries(WEEKDAYS.map((key) => [key, { ...monday }])) });
  };

  const save = async () => {
    if (invalid.length > 0) return;
    setSaving(true);
    try {
      // Lagres med alle sju dagene, så stengte dager er tydelig null
      await saveSalon({
        openingHours: Object.fromEntries(WEEK.map(({ key }) => [key, hours[key] ?? null])),
        ...(flexible !== salon.flexibleHours ? { flexibleHours: flexible } : {}),
      });
      haptics.success();
      if (router.canGoBack()) router.back();
      else router.replace('/business/salon');
    } catch (error) {
      console.error('Kunne ikke lagre åpningstider:', error);
      showAlert('Noe gikk galt', 'Kunne ikke lagre åpningstidene. Prøv igjen.');
      setSaving(false);
    }
  };

  return (
    <FormScreen
      title="Åpningstider"
      footer={<Button title="Lagre" loading={saving} disabled={invalid.length > 0} onPress={save} style={styles.flex} />}
    >
      <View style={[styles.card, styles.flexibleRow]}>
        <View style={styles.dayLabel}>
          <Text variant="bodyStrong">Fleksibel salong</Text>
          <Text variant="caption">Ingen åpningstider på siden din. Kundene ser bare de ledige timene.</Text>
        </View>
        <Switch value={flexible} onValueChange={setFlexibleDraft} accessibilityLabel="Fleksibel salong" />
      </View>

      <Text variant="body" color={colors.textSecondary}>
        {flexible
          ? 'Velg likevel når i uka kundene kan booke, så ingen booker en time midt på natta. Enkeltdager du ikke jobber, legger du inn under Fridager.'
          : 'Kundene kan booke timer som er ferdige innen stengetid. Enkeltdager du har fri, legger du inn under Fridager.'}
      </Text>

      <View style={styles.card}>
        {WEEK.map(({ key, label }, index) => {
          const day = hours[key] ?? null;
          const isInvalid = invalid.some((item) => item.key === key);
          return (
            <View key={key} style={[styles.day, index > 0 && styles.divider]}>
              <View style={styles.dayRow}>
                <Switch
                  value={!!day}
                  onValueChange={(open) => toggle(key, open)}
                  accessibilityLabel={flexible ? `Booking ${label.toLowerCase()}` : `${label} åpent`}
                />
                <Text variant="bodyStrong" style={styles.dayLabel}>{label}</Text>
                {day ? (
                  <View style={styles.times}>
                    <TimeSelect
                      value={day.open}
                      options={TIMES}
                      onChange={(open) => setDay(key, { ...day, open })}
                      accessibilityLabel={`Åpner ${label.toLowerCase()}`}
                    />
                    <Text variant="body" color={colors.textMuted}>–</Text>
                    <TimeSelect
                      value={day.close}
                      options={TIMES.filter((time) => time !== '00:00')}
                      onChange={(close) => setDay(key, { ...day, close })}
                      accessibilityLabel={`Stenger ${label.toLowerCase()}`}
                    />
                  </View>
                ) : (
                  <Text variant="body" color={colors.textMuted}>{flexible ? 'Ingen booking' : 'Stengt'}</Text>
                )}
              </View>
              {day?.breaks?.map((pause, breakIndex) => {
                const breaks = day.breaks ?? [];
                const setPause = (next: TimeRange) =>
                  setBreaks(key, day, breaks.map((item, i) => (i === breakIndex ? next : item)));
                return (
                  <View key={breakIndex} style={styles.breakRow}>
                    <Text variant="caption" style={styles.breakLabel}>Pause</Text>
                    <View style={styles.times}>
                      <TimeSelect
                        value={pause.start}
                        options={TIMES}
                        onChange={(start) => setPause({ ...pause, start })}
                        accessibilityLabel={`Pausen starter ${label.toLowerCase()}`}
                      />
                      <Text variant="body" color={colors.textMuted}>–</Text>
                      <TimeSelect
                        value={pause.end}
                        options={TIMES.filter((time) => time !== '00:00')}
                        onChange={(end) => setPause({ ...pause, end })}
                        accessibilityLabel={`Pausen slutter ${label.toLowerCase()}`}
                      />
                    </View>
                    <IconButton
                      icon="close"
                      size={32}
                      color={colors.textMuted}
                      accessibilityLabel={`Fjern pausen ${label.toLowerCase()}`}
                      onPress={() => setBreaks(key, day, breaks.filter((_, i) => i !== breakIndex))}
                    />
                  </View>
                );
              })}
              {day && (
                <Pressable onPress={() => addBreak(key, day)} hitSlop={8} accessibilityRole="button" style={styles.addBreak}>
                  <Text variant="label" color={colors.primary}>+ Legg til pause</Text>
                </Pressable>
              )}
              {isInvalid && day && (
                <Text variant="caption" color={colors.danger} style={styles.dayError}>
                  {badHours(day)
                    ? 'Stengetiden må være etter åpningstiden.'
                    : 'Pausen må være innenfor tidene over, og slutte etter at den starter.'}
                </Text>
              )}
            </View>
          );
        })}
      </View>

      {hours.mon && (
        <Button title="Bruk mandagens tider på alle hverdager" variant="ghost" size="md" onPress={copyMonday} />
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderRadius: radius.lg, backgroundColor: colors.surface, paddingHorizontal: 14, ...shadows.card },
  day: { paddingVertical: 12 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 42 },
  flexibleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  dayLabel: { flex: 1 },
  times: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dayError: { marginTop: 6, textAlign: 'right' },
  breakRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  breakLabel: { flex: 1, textAlign: 'right' },
  addBreak: { alignSelf: 'flex-end', marginTop: 8 },
});
