import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, shadows } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { Text } from './text';

const ITEM_HEIGHT = 46;

type TimeSelectProps = {
  value: string;
  options: string[];
  onChange: (time: string) => void;
  disabled?: boolean;
  accessibilityLabel: string;
};

/** Felt som viser et klokkeslett og åpner en liste å velge fra. Fungerer likt på mobil og web. */
export function TimeSelect({ value, options, onChange, disabled = false, accessibilityLabel }: TimeSelectProps) {
  const [open, setOpen] = useState(false);
  const listRef = useRef<ScrollView>(null);
  const selectedIndex = Math.max(0, options.indexOf(value));

  const choose = (time: string) => {
    haptics.select();
    onChange(time);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        style={({ pressed }) => [styles.field, pressed && styles.pressed, disabled && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel}: ${value}`}
      >
        <Text style={styles.value}>{value}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Lukk">
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <Text variant="subheading" align="center" style={styles.title}>{accessibilityLabel}</Text>
            <ScrollView
              ref={listRef}
              style={styles.list}
              onLayout={() => listRef.current?.scrollTo({ y: Math.max(0, (selectedIndex - 2) * ITEM_HEIGHT), animated: false })}
            >
              {options.map((time) => {
                const selected = time === value;
                return (
                  <Pressable
                    key={time}
                    onPress={() => choose(time)}
                    style={({ pressed }) => [styles.item, selected && styles.itemSelected, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.itemText, selected && styles.itemTextSelected]}>{time}</Text>
                    {selected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: radius.sm + 2,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: { backgroundColor: colors.background },
  disabled: { opacity: 0.4 },
  value: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: {
    width: '100%',
    maxWidth: 320,
    paddingVertical: 12,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    ...shadows.raised,
  },
  title: { paddingBottom: 8 },
  list: { maxHeight: ITEM_HEIGHT * 7 },
  item: {
    height: ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  itemSelected: { backgroundColor: colors.primarySoft },
  itemText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  itemTextSelected: { fontFamily: fonts.bold, color: colors.primaryDark },
});
