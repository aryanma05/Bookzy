import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FormScreen } from '@/components/business/form-screen';
import { CategoryPicker, FieldGroup, LocationTypePicker } from '@/components/business/salon-fields';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { colors, radius } from '@/constants/theme';
import { useBusiness } from '@/context/BusinessContext';
import { showAlert } from '@/lib/alert';
import { haptics } from '@/lib/haptics';
import type { LocationType } from '@/lib/salons';

export default function BusinessProfileScreen() {
  const router = useRouter();
  const { salon, saveSalon } = useBusiness();

  const [name, setName] = useState(salon?.name ?? '');
  const [category, setCategory] = useState(salon?.category ?? '');
  const [locationType, setLocationType] = useState<LocationType>(salon?.locationType ?? 'salon');
  const [description, setDescription] = useState(salon?.description ?? '');
  const [address, setAddress] = useState(salon?.address ?? '');
  const [area, setArea] = useState(salon?.area ?? '');
  const [phone, setPhone] = useState(salon?.phone ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!salon) return null;

  const isHome = locationType === 'home';

  const save = async () => {
    const missing =
      name.trim().length < 2
        ? 'Skriv inn navnet på bedriften.'
        : !category.trim()
          ? 'Velg eller skriv hva du tilbyr.'
          : !isHome && !address.trim()
            ? 'Skriv inn adressen til salongen.'
            : !area.trim()
              ? 'Skriv inn område eller bydel.'
              : null;
    if (missing) {
      setError(missing);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await saveSalon({ name, category, locationType, description, address, area, phone });
      haptics.success();
      if (router.canGoBack()) router.back();
      else router.replace('/business/salon');
    } catch (saveError) {
      console.error('Kunne ikke lagre profilen:', saveError);
      showAlert('Noe gikk galt', 'Kunne ikke lagre endringene. Prøv igjen.');
      setSaving(false);
    }
  };

  return (
    <FormScreen title="Profil og kontaktinfo" footer={<Button title="Lagre" loading={saving} onPress={save} style={styles.flex} />}>
      <TextField label="Navn" value={name} onChangeText={setName} maxLength={80} />
      <FieldGroup label="Hva tilbyr du?">
        <CategoryPicker value={category} onChange={setCategory} />
      </FieldGroup>
      <TextField
        label="Om bedriften"
        placeholder="Fortell kort om deg, stedet og hva du er god på"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={1000}
      />

      <Text variant="heading" style={styles.heading}>Hvor</Text>
      <LocationTypePicker value={locationType} onChange={setLocationType} />
      <TextField
        label={isHome ? 'Adresse (valgfritt)' : 'Adresse'}
        icon="location-outline"
        value={address}
        onChangeText={setAddress}
        maxLength={120}
        hint={
          salon.requiresApproval
            ? 'Vises bare for kunder du har godkjent. Andre ser bare området.'
            : isHome
              ? 'Står feltet tomt, viser vi bare området. Da må du gi kunden adressen selv.'
              : undefined
        }
      />
      <TextField label="Område eller bydel" value={area} onChangeText={setArea} maxLength={60} />
      <TextField label="Telefon" icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={20} />

      {error && (
        <View style={styles.error}>
          <Text variant="caption" color={colors.danger}>{error}</Text>
        </View>
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  heading: { marginTop: 8 },
  error: { padding: 12, borderRadius: radius.md, backgroundColor: colors.dangerSoft },
});
