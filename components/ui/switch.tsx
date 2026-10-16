import { Platform, StyleSheet, Switch as RNSwitch, type SwitchProps } from 'react-native';
import { colors } from '@/constants/theme';

// react-native-web gjør knotten grønn når bryteren er på, med mindre activeThumbColor er satt
const webProps = Platform.OS === 'web' ? ({ activeThumbColor: '#FFFFFF' } as object) : {};

export function Switch({ style, ...props }: SwitchProps) {
  return (
    <RNSwitch
      trackColor={{ true: colors.primary, false: colors.border }}
      {...webProps}
      {...props}
      style={[styles.switch, style]}
    />
  );
}

const styles = StyleSheet.create({
  // På iOS legger React Native på alignSelf: 'flex-start', så uten dette havner bryteren
  // øverst i raden i stedet for midt på, på linje med teksten.
  switch: { alignSelf: 'center' },
});
