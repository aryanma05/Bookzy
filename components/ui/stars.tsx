import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((position) => {
        const name = rating >= position ? 'star' : rating >= position - 0.5 ? 'star-half' : 'star-outline';
        return <Ionicons key={position} name={name} size={size} color={colors.star} />;
      })}
    </View>
  );
}

export function StarInput({ value, onChange, size = 38 }: { value: number; onChange: (value: number) => void; size?: number }) {
  return (
    <View style={[styles.row, styles.inputRow]}>
      {[1, 2, 3, 4, 5].map((position) => (
        <Pressable
          key={position}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={`${position} av 5 stjerner`}
          onPress={() => {
            haptics.select();
            onChange(position);
          }}
        >
          <Ionicons
            name={value >= position ? 'star' : 'star-outline'}
            size={size}
            color={value >= position ? colors.star : colors.border}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 1 },
  inputRow: { gap: 8 },
});
