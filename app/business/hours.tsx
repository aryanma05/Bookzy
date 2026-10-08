import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FormScreen } from '@/components/business/form-screen';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { TimeSelect } from '@/components/ui/time-select';
import { colors, radius, shadows } from '@/constants/theme';
import { useBusiness } from '@/context/BusinessContext';
import { showAlert } from '@/lib/alert';
import { haptics } from '@/lib/haptics';
import { timesOfDay, toMinutes, WEEK, type DayHours, type OpeningHours, type WeekdayKey } from '@/lib/schedule';

const TIMES = timesOfDay();
const WEEKDAYS: WeekdayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri'];

export default function OpeningHoursScreen() {
  const router = useRouter();
  const { salon, saveSalon } = useBusiness();
  const [draft, setDraft] = useState<OpeningHours | null>(null);
  const [saving, setSaving] = useState(false);

  if (!salon) return null;

  const hours = draft ?? salon.openingHours;
  const invalid = WEEK.filter(({ key }) => {
    const day = hours[key];
    return day && toMinutes(day.close) <= toMinutes(day.open);
  });

  const setDay = (key: WeekdayKey, value: DayHours | null) => setDraft({ ...hours, [key]: value });

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
      await saveSalon({ openingHours: Object.fromEntries(WEEK.map(({ key }) => [key, hours[key] ?? null])) });
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
      <Text variant="body" color={colors.textSecondary}>
        Kundene kan booke timer som er ferdige innen stengetid. Enkeltdager du har fri, legger du inn under Fridager.
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
                  accessibilityLabel={`${label} åpent`}
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
                  <Text variant="body" color={colors.textMuted}>Stengt</Text>
                )}
              </View>
              {isInvalid && (
                <Text variant="caption" color={colors.danger} style={styles.dayError}>
                  Stengetiden må være etter åpningstiden.
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
  dayLabel: { flex: 1 },
  times: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dayError: { marginTop: 6, textAlign: 'right' },
});
