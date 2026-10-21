import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PaceBrand } from '@/components/pace-brand';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';

type TabScreenShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
  disclaimer?: string;
  overlay?: ReactNode;
}>;

export function TabScreenShell({
  eyebrow,
  title,
  description,
  disclaimer = '화면과 데이터는 백엔드 연동 전 미리보기입니다.',
  overlay,
  children,
}: TabScreenShellProps) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.fixedContent}>
        <View style={styles.header}>
          <PaceBrand />
          <View style={styles.previewBadge}>
            <View style={styles.previewDot} />
            <Text style={styles.previewLabel}>미리보기</Text>
          </View>
        </View>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {children}
        <Text style={styles.disclaimer}>{disclaimer}</Text>
      </ScrollView>
      {overlay}
    </SafeAreaView>
  );
}

export const tabScreenStyles = StyleSheet.create({
  card: {
    marginTop: 14,
    padding: 19,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTitle: {
    color: C.text,
    fontSize: 14,
    fontWeight: '700',
  },
  muted: {
    color: C.muted,
    fontSize: 11,
    lineHeight: 17,
  },
  accent: {
    color: C.accent,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
  },
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  fixedContent: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#20251B',
  },
  previewDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.accent,
  },
  previewLabel: {
    color: C.accent,
    fontSize: 10,
    fontWeight: '600',
  },
  heading: {
    paddingTop: 24,
    paddingBottom: 14,
  },
  eyebrow: {
    color: C.accent,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 2,
  },
  title: {
    marginTop: 8,
    color: C.text,
    fontSize: 25,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  description: {
    marginTop: 5,
    color: C.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  disclaimer: {
    marginTop: 22,
    color: C.subtle,
    fontSize: 9,
    lineHeight: 15,
    textAlign: 'center',
  },
});
