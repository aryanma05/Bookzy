import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FormScreen } from '@/components/business/form-screen';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { colors, radius, shadows } from '@/constants/theme';
import { useBusiness } from '@/context/BusinessContext';
import { showAlert } from '@/lib/alert';

export default function StaffScreen() {
  const router = useRouter();
  const { salon } = useBusiness();

  if (!salon) return null;

  const solo = salon.staff.length === 1;

  // Hver ansatt lagres på sin egen skjerm. Knappen bekrefter det og går tilbake til menyen.
  const done = () =>
    showAlert('Ansatte er lagret', `Kundene kan booke hos ${solo ? 'deg' : `alle ${salon.staff.length}`}.`, [
      { text: 'OK', onPress: () => (router.canGoBack() ? router.back() : router.replace('/business/salon')) },
    ]);

  return (
    <FormScreen
      title="Ansatte"
      footer={
        <>
          <Button title="Legg til ansatt" icon="person-add-outline" variant="secondary" onPress={() => router.push('/business/staff/new')} style={styles.flex} />
          <Button title="Lagre" onPress={done} style={styles.flex} />
        </>
      }
    >
      <Text variant="body" color={colors.textSecondary}>
        {solo
          ? 'Jobber du alene, trenger du ikke gjøre noe her. Har du ansatte eller leier ut stol, kan kundene velge hvem de vil gå til.'
          : 'Kundene kan velge hvem de vil gå til, eller «hvem som helst». Hver person har sin egen kolonne i kalenderen.'}
      </Text>

      <View style={styles.card}>
        {salon.staff.map((member, index) => (
          <Pressable
            key={member.id}
            onPress={() => router.push(`/business/staff/${member.id}`)}
            style={({ pressed }) => [styles.row, index > 0 && styles.divider, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Avatar name={member.name} size={42} />
            <View style={styles.flex}>
              <Text variant="bodyStrong">{member.name}</Text>
              {member.title ? <Text variant="caption">{member.title}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>

      <Text variant="caption" color={colors.textMuted}>
        Ansatte får ikke egen innlogging ennå – du ser og styrer kalenderen for alle.
      </Text>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden', ...shadows.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  pressed: { backgroundColor: colors.background },
});
