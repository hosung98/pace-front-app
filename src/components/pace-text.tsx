import { StyleSheet, Text, type TextProps } from 'react-native';

export function PaceText({ style, ...props }: TextProps) {
  const weight = StyleSheet.flatten(style)?.fontWeight;
  let fontFamily = 'Pretendard-Regular';
  if (weight === 'bold' || Number(weight) >= 700) {
    fontFamily = 'Pretendard-Bold';
  } else if (Number(weight) >= 500) {
    fontFamily = 'Pretendard-SemiBold';
  }

  return <Text {...props} style={[style, { fontFamily, fontWeight: 'normal' }]} />;
}
