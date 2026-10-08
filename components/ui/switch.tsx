import { Platform, Switch as RNSwitch, type SwitchProps } from 'react-native';
import { colors } from '@/constants/theme';

// react-native-web gjør knotten grønn når bryteren er på, med mindre activeThumbColor er satt
const webProps = Platform.OS === 'web' ? ({ activeThumbColor: '#FFFFFF' } as object) : {};

export function Switch(props: SwitchProps) {
  return <RNSwitch trackColor={{ true: colors.primary, false: colors.border }} {...webProps} {...props} />;
}
