import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FormScreen } from '@/components/business/form-screen';
import { FieldGroup } from '@/components/business/salon-fields';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { colors, radius, shadows } from '@/constants/theme';
import { useBusiness } from '@/context/BusinessContext';
import { showAlert } from '@/lib/alert';
import { haptics } from '@/lib/haptics';
import { formatCancellationPolicy } from '@/lib/salons';

const CANCELLATION_OPTIONS = [
  { hours: 0, label: 'Ingen frist' },
  { hours: 2, label: '2 timer' },
  { hours: 12, label: '12 timer' },
  { hours: 24, label: '24 timer' },
  { hours: 48, label: '48 timer' },
];

/** Avbestilling, godkjenning og vilkår: det som bestemmer hvordan kundene kan booke. */
export default function BookingRulesScreen() {
  const router = useRouter();
  const { salon, saveSalon } = useBusiness();

  const [cancellationHours, setCancellationHours] = useState(salon?.cancellationHours ?? 24);
  const [requiresApproval, setRequiresApproval] = useState(salon?.requiresApproval ?? false);
  const [terms, setTerms] = useState(salon?.terms ?? '');
  const [saving, setSaving] = useState(false);

  if (!salon) return null;

  const save = async () => {
    setSaving(true);
    try {
      // Adressen må være med, ellers flyttes den ikke mellom den offentlige siden og private/address når godkjenning slås av eller på
      await saveSalon({ cancellationHours, requiresApproval, terms, address: salon.address });
      haptics.success();
      if (router.canGoBack()) router.back();
      else router.replace('/business/salon');
    } catch (saveError) {
      console.error('Kunne ikke lagre bookingreglene:', saveError);
      showAlert('Noe gikk galt', 'Kunne ikke lagre endringene. Prøv igjen.');
      setSaving(false);
    }
  };

  return (
    <FormScreen title="Bookingregler" footer={<Button title="Lagre" loading={saving} onPress={save} style={styles.flex} />}>
      <FieldGroup label="Hvor lenge før timen kan kundene avbestille selv?" hint={formatCancellationPolicy(cancellationHours)}>
        <View style={styles.chips}>
          {CANCELLATION_OPTIONS.map((option) => (
            <Chip
              key={option.hours}
              label={option.label}
              selected={option.hours === cancellationHours}
              onPress={() => setCancellationHours(option.hours)}
            />
          ))}
        </View>
      </FieldGroup>

      <View style={styles.card}>
        <View style={styles.flex}>
          <Text variant="bodyStrong">Godkjenn bookinger selv</Text>
          <Text variant="caption">
            Kundene sender en forespørsel, og du velger om du vil ta imot dem. Adressen ser de først når du har godkjent timen.
          </Text>
        </View>
        <Switch value={requiresApproval} onValueChange={setRequiresApproval} accessibilityLabel="Godkjenn bookinger selv" />
      </View>

      <TextField
        label="Vilkår (valgfritt)"
        placeholder="F.eks. om forsinkelser, depositum eller hvem som kan bli med"
        value={terms}
        onChangeText={setTerms}
        multiline
        maxLength={2000}
        hint="Kundene må godta vilkårene før de kan booke."
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
});
