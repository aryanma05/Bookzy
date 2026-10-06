import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { colors, radius, shadows } from '@/constants/theme';

const QUESTIONS = [
  {
    question: 'Hvordan booker jeg en time?',
    answer:
      'Finn salongen, trykk «Book» ved behandlingen du vil ha, og velg hvem du vil gå til, dag og tid. Når du bekrefter, er timen reservert med en gang.',
  },
  {
    question: 'Hvordan betaler jeg?',
    answer: 'Du betaler direkte i salongen etter behandlingen. Prisen du ser i appen er det salongen har oppgitt.',
  },
  {
    question: 'Kan jeg flytte eller avbestille en time?',
    answer:
      'Ja. Åpne timen under «Timer» og velg «Endre tid» eller «Avbestill». Hver salong har en frist for dette – etter fristen må du ringe salongen direkte.',
  },
  {
    question: 'Hva betyr «Hvem som helst»?',
    answer: 'Da får du første ledige ansatt på tidspunktet du velger. Det gir som regel flest ledige tider.',
  },
  {
    question: 'Får jeg påminnelse før timen?',
    answer:
      'I appen får du et varsel dagen før (eller to timer før hvis du booker samme dag). Du kan slå påminnelser av og på under Profil.',
  },
  {
    question: 'Hvem kan se anmeldelsen min?',
    answer: 'Anmeldelser er offentlige og vises med fornavnet ditt og forbokstaven i etternavnet. Du kan bare anmelde timer du faktisk har hatt.',
  },
];

function Item({ question, answer, last }: { question: string; answer: string; last: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.item, !last && styles.divider]}>
      <Pressable style={styles.question} onPress={() => setOpen((value) => !value)} accessibilityRole="button">
        <Text variant="bodyStrong" style={styles.flex}>{question}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </Pressable>
      {open && (
        <Animated.View entering={FadeIn.duration(200)}>
          <Text variant="body" color={colors.textSecondary} style={styles.answer}>{answer}</Text>
        </Animated.View>
      )}
    </View>
  );
}

export default function HelpScreen() {
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Vanlige spørsmål" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          {QUESTIONS.map((item, index) => (
            <Item key={item.question} {...item} last={index === QUESTIONS.length - 1} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: 20 },
  card: { borderRadius: radius.lg, backgroundColor: colors.surface, paddingHorizontal: 16, ...shadows.card },
  item: { paddingVertical: 16 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  question: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  answer: { marginTop: 10 },
});
