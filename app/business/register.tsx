import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { FormScreen } from '@/components/business/form-screen';
import { CategoryPicker, FieldGroup, LocationTypePicker } from '@/components/business/salon-fields';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useBusiness } from '@/context/BusinessContext';
import { showAlert } from '@/lib/alert';
import { haptics } from '@/lib/haptics';
import type { LocationType } from '@/lib/salons';

export default function RegisterBusinessScreen() {
  const { profile, displayName } = useAuth();
  const { salon, createBusiness, setBusinessMode } = useBusiness();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [locationType, setLocationType] = useState<LocationType>('home');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [phone, setPhone] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [ownerTitle, setOwnerTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const phoneValue = phone ?? profile?.phone ?? '';
  const ownerNameValue = ownerName ?? (profile?.name || displayName);
  const isHome = locationType === 'home';

  // Når bedriften er opprettet, går vi videre til oppsettet
  if (salon) {
    return <Redirect href="/business/salon" />;
  }

  const submit = async () => {
    if (saving) return;
    const missing =
      name.trim().length < 2
        ? 'Skriv inn navnet på bedriften.'
        : !category
          ? 'Velg hva slags bedrift det er.'
          : !isHome && !address.trim()
            ? 'Skriv inn adressen til salongen.'
            : !area.trim()
              ? 'Skriv inn område eller bydel.'
              : !ownerNameValue.trim()
                ? 'Skriv inn navnet ditt.'
                : null;
    if (missing) {
      setError(missing);
      haptics.warning();
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await createBusiness({
        name,
        category,
        locationType,
        address,
        area,
        phone: phoneValue,
        ownerName: ownerNameValue,
        ownerTitle,
      });
      setBusinessMode(true);
      haptics.success();
    } catch (createError) {
      console.error('Kunne ikke opprette bedrift:', createError);
      showAlert('Noe gikk galt', 'Kunne ikke registrere bedriften. Sjekk nettet og prøv igjen.');
      setSaving(false);
    }
  };

  return (
    <FormScreen
      title="Registrer bedriften"
      backTo="/business"
      footer={<Button title="Opprett bedrift" loading={saving} onPress={submit} style={styles.flex} />}
    >
      <Text variant="body" color={colors.textSecondary}>
        Siden din er skjult for kundene til du har lagt inn tjenester og velger å publisere den.
      </Text>

      <Text variant="heading" style={styles.heading}>Bedriften</Text>
      <TextField label="Navn" placeholder="F.eks. Negler hos Lina" value={name} onChangeText={setName} maxLength={80} />
      <FieldGroup label="Hva tilbyr du?">
        <CategoryPicker value={category} onChange={setCategory} />
      </FieldGroup>
      <FieldGroup label="Hvor tar du imot kunder?">
        <LocationTypePicker value={locationType} onChange={setLocationType} />
      </FieldGroup>
      <TextField
        label={isHome ? 'Adresse (valgfritt)' : 'Adresse'}
        icon="location-outline"
        placeholder="Gate og nummer, sted"
        value={address}
        onChangeText={setAddress}
        maxLength={120}
        hint={
          isHome
            ? 'Vises på siden din. Vil du ikke vise hjemmeadressen, kan du la feltet stå tomt og gi adressen til kunden selv.'
            : undefined
        }
      />
      <TextField label="Område eller bydel" placeholder="F.eks. Grünerløkka" value={area} onChangeText={setArea} maxLength={60} />
      <TextField
        label="Telefon"
        icon="call-outline"
        placeholder="Nummeret kundene kan ringe"
        value={phoneValue}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        maxLength={20}
      />

      <Text variant="heading" style={styles.heading}>Deg</Text>
      <TextField
        label="Navnet ditt"
        icon="person-outline"
        value={ownerNameValue}
        onChangeText={setOwnerName}
        maxLength={60}
        hint="Kundene ser fornavnet ditt når de booker."
      />
      <TextField
        label="Tittel (valgfritt)"
        placeholder="F.eks. Negletekniker"
        value={ownerTitle}
        onChangeText={setOwnerTitle}
        maxLength={40}
      />

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
