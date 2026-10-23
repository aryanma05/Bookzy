import { StyleSheet, View } from 'react-native';
import { colors, radius } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { IconButton } from './icon-button';
import { Text } from './text';

type StepperProps = {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  step: number;
  min: number;
  max: number;
  format?: (value: number) => string;
};

export function Stepper({ label, value, onChange, step, min, max, format = String }: StepperProps) {
  const change = (next: number) => {
    if (next < min || next > max) return;
    haptics.select();
    onChange(next);
  };

  return (
    <View style={styles.wrapper}>
      {label && <Text variant="label" style={styles.label}>{label}</Text>}
      <View style={styles.field}>
        <IconButton
          icon="remove"
          variant="soft"
          size={36}
          color={value <= min ? colors.textMuted : colors.ink}
          // Til nærmeste trinn, så 50 min blir 45 og 60 og ikke 35 og 65
          onPress={() => change(Math.ceil(value / step) * step - step)}
          accessibilityLabel="Mindre"
        />
        <Text variant="subheading" style={styles.value}>{format(value)}</Text>
        <IconButton
          icon="add"
          variant="soft"
          size={36}
          color={value >= max ? colors.textMuted : colors.ink}
          onPress={() => change(Math.floor(value / step) * step + step)}
          accessibilityLabel="Mer"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { marginLeft: 2 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  value: { flex: 1, textAlign: 'center', color: colors.ink },
});
