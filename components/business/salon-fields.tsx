import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Chip } from '@/components/ui/chip';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { colors, radius } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { CATEGORIES, LOCATION_TYPES, type LocationType } from '@/lib/salons';

export function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text variant="label" style={styles.label}>{label}</Text>
      {children}
      {hint && <Text variant="caption" color={colors.textMuted} style={styles.label}>{hint}</Text>}
    </View>
  );
}

/** Faste kategorier, eller «Annet» der bedriften skriver sin egen. */
export function CategoryPicker({ value, onChange }: { value: string; onChange: (category: string) => void }) {
  const [other, setOther] = useState(() => value !== '' && !CATEGORIES.some((category) => category.name === value));

  return (
    <>
      <View style={styles.chips}>
        {CATEGORIES.map((category) => (
          <Chip
            key={category.name}
            label={category.name}
            icon={category.icon}
            selected={!other && category.name === value}
            onPress={() => {
              setOther(false);
              onChange(category.name);
            }}
          />
        ))}
        <Chip
          label="Annet"
          icon="add-outline"
          selected={other}
          onPress={() => {
            if (!other) onChange('');
            setOther(true);
          }}
        />
      </View>
      {other && (
        <TextField
          placeholder="F.eks. Sminke"
          value={value}
          onChangeText={onChange}
          maxLength={40}
          // Bare når de nettopp trykket «Annet», ikke når profilen åpnes med en egen kategori
          autoFocus={!value}
          accessibilityLabel="Hva tilbyr du?"
        />
      )}
    </>
  );
}

export function LocationTypePicker({ value, onChange }: { value: LocationType; onChange: (type: LocationType) => void }) {
  return (
    <View style={styles.options}>
      {LOCATION_TYPES.map((option) => {
        const selected = option.value === value;
        return (
          <PressableScale
            key={option.value}
            scaleTo={0.97}
            onPress={() => {
              haptics.select();
              onChange(option.value);
            }}
            style={[styles.option, selected && styles.optionSelected]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
          >
            <Ionicons name={option.icon} size={22} color={selected ? colors.primary : colors.textSecondary} />
            <Text variant="bodyStrong" color={selected ? colors.primaryDark : colors.text}>{option.label}</Text>
            <Text variant="caption">{option.description}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  label: { marginLeft: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  options: { flexDirection: 'row', gap: 10 },
  option: {
    flex: 1,
    gap: 4,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
});
