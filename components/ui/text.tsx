import { StyleSheet, Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { colors, fonts } from '@/constants/theme';

export type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'caption'
  | 'overline';

type TextProps = RNTextProps & {
  variant?: TextVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
};

export function Text({ variant = 'body', color, align, style, ...props }: TextProps) {
  return (
    <RNText
      {...props}
      style={[styles[variant], color ? { color } : null, align ? { textAlign: align } : null, style]}
    />
  );
}

const styles = StyleSheet.create({
  display: { fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 37, letterSpacing: -0.6, color: colors.ink },
  title: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 31, letterSpacing: -0.4, color: colors.ink },
  heading: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2, color: colors.ink },
  subheading: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.text },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22, color: colors.text },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.text },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  overline: {
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
});
