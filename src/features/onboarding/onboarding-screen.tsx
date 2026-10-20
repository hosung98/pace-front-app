import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, PanResponder, Platform, Pressable, ScrollView,
  StyleSheet, useWindowDimensions, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PaceBrand } from '@/components/pace-brand';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

import { OnboardingArt } from './onboarding-art';

const slides = [
  {
    label: 'RECORD YOUR RUN',
    title: '가볍게 시작해요.\n기록은 PACE가 할게요.',
    description: '달린 거리부터 경로, 페이스까지.\n당신은 오롯이 달리는 순간에 집중하세요.',
    keyword: '러닝의 모든 순간을, 한눈에',
  },
  {
    label: 'FIND YOUR PACE',
    title: '빠르지 않아도 괜찮아요.\n어제의 나보다 한 걸음.',
    description: '차곡차곡 쌓이는 나의 러닝 기록.\n작은 변화를 발견하고, 나만의 리듬을 찾아가요.',
    keyword: '비교의 기준은, 언제나 나',
  },
  {
    label: 'RUN TOGETHER',
    title: '혼자여도 좋지만,\n함께라면 더 멀리.',
    description: '달리는 즐거움을 나누고 서로를 응원해요.\n같은 마음으로 달리는 우리, PACE에서 만나요.',
    keyword: '달리기로 이어지는 우리',
  },
] as const;

export function OnboardingScreen() {
  const [page, setPage] = useState(0);
  const reduceMotion = useReducedMotion() !== false;
  const { width, height } = useWindowDimensions();
  const [contentHeight, setContentHeight] = useState(height - 240);
  const [copyHeight, setCopyHeight] = useState(230);
  const [entrance] = useState(() => new Animated.Value(1));
  const [drag] = useState(() => new Animated.Value(0));
  const scrollRef = useRef<ScrollView>(null);
  const wide = width >= 900;
  const compact = contentHeight < 540;
  const slide = slides[page];
  const last = page === slides.length - 1;
  const visualSpacing = compact ? 42 : 59;
  const availableArtHeight = contentHeight - 24 - visualSpacing - copyHeight;
  const artHeight = Math.max(72, availableArtHeight);
  const mobileArtWidth = Math.min(400, artHeight * 360 / 390);
  const artWidth = Math.min(width - 32, wide ? 440 : mobileArtWidth);
  const needsScroll = !wide && availableArtHeight < 72;

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    drag.setValue(0);
    if (reduceMotion) {
      entrance.setValue(1);
      return;
    }
    entrance.setValue(0);
    const animation = Animated.timing(entrance, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' });
    animation.start();
    return () => animation.stop();
  }, [page, reduceMotion, entrance, drag]);

  const swipe = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) =>
      Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 2,
    onPanResponderGrant: () => drag.stopAnimation(),
    onPanResponderMove: (_, gesture) => {
      if (!reduceMotion) drag.setValue(Math.max(-90, Math.min(90, gesture.dx * 0.35)));
    },
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) > 50 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5) {
        setPage((current) => Math.max(0, Math.min(slides.length - 1, current + (gesture.dx < 0 ? 1 : -1))));
      }
      Animated.timing(drag, { toValue: 0, duration: reduceMotion ? 0 : 180, useNativeDriver: Platform.OS !== 'web' }).start();
    },
    onPanResponderTerminate: () => drag.setValue(0),
  }), [drag, reduceMotion]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={[styles.shell, wide && styles.wideShell]}>
        <View style={styles.header}>
          <PaceBrand />
          {!last ? (
            <Pressable accessibilityRole="button" accessibilityLabel="온보딩 건너뛰고 마지막 화면 보기"
              onPress={() => setPage(slides.length - 1)}
              style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}>
              <Text style={styles.skipText}>건너뛰기</Text>
            </Pressable>
          ) : (
            <View style={styles.headerNote}><View style={styles.tinyDot} /><Text style={styles.headerNoteText}>YOUR PACE, YOUR WAY</Text></View>
          )}
        </View>

        <View style={styles.swipeArea} {...swipe.panHandlers} testID="onboarding-swipe-area"
          onLayout={({ nativeEvent }) => setContentHeight(nativeEvent.layout.height)}>
        <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.scrollContent}
          scrollEnabled={needsScroll} bounces={false} showsVerticalScrollIndicator={false}
          testID="onboarding-content">
          <Animated.View style={[
            styles.content, wide && styles.wideContent,
            { opacity: entrance, transform: [
              { translateX: drag },
              { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
            ] },
          ]}>
            <View style={[styles.visualSection, compact && !wide && styles.compactVisual, wide && styles.wideVisual]}>
              <OnboardingArt page={page} width={artWidth} />
              <Text style={styles.previewNote}>PACE 미리보기 · 예시 데이터</Text>
            </View>

            <View style={[styles.copy, wide && styles.wideCopy]}
              onLayout={({ nativeEvent }) => setCopyHeight(nativeEvent.layout.height)}>
              <View style={[styles.chapter, compact && styles.compactChapter]}>
                <Text style={styles.chapterNumber}>0{page + 1}</Text>
                <View style={styles.chapterLine} />
                <Text style={styles.chapterLabel}>{slide.label}</Text>
              </View>
              <View accessibilityLiveRegion="polite" accessible
                accessibilityLabel={`${page + 1} / 3. ${slide.title.replace('\n', ' ')} ${slide.description.replace('\n', ' ')}`}>
                <Text accessibilityRole="header" style={[styles.title, compact && styles.smallTitle, width < 360 && styles.smallTitle, wide && styles.wideTitle]}>
                  {slide.title}
                </Text>
                <Text style={[styles.description, compact && styles.compactDescription]}>{slide.description}</Text>
              </View>
              <View style={[styles.keywordRow, compact && styles.compactKeywordRow]}>
                <View style={styles.keywordIcon}><Text style={styles.check}>✓</Text></View>
                <Text style={styles.keyword}>{slide.keyword}</Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
        </View>

        <View style={[styles.footer, wide && styles.wideFooter]}>
          <View style={styles.paginationRow}>
            <View style={styles.dots} accessibilityRole="tablist" accessibilityLabel="온보딩 페이지">
              {slides.map((item, index) => (
                <Pressable key={item.label} accessibilityRole="tab"
                  accessibilityLabel={`${index + 1}번째 온보딩: ${item.label}`}
                  accessibilityState={{ selected: index === page }}
                  onPress={() => setPage(index)} style={styles.dotTarget}>
                  <View style={[styles.dot, index === page && styles.activeDot]} />
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button"
              accessibilityLabel={last ? '온보딩 처음부터 다시 보기' : '다음 온보딩'}
              onPress={() => setPage(last ? 0 : page + 1)}
              style={({ pressed }) => [styles.nextButton, last && styles.replayButton, pressed && styles.pressed]}>
              <Text style={[styles.nextText, last && styles.replayText]}>{last ? '처음부터 다시 보기' : '다음'}</Text>
              <Text style={[styles.nextArrow, last && styles.replayText]}>{last ? '↺' : '→'}</Text>
            </Pressable>
          </View>
          <Text style={styles.footerNote}>{last ? '우리의 첫 러닝, 곧 만나요.' : 'EVERY PACE MATTERS.'}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  shell: { flex: 1, width: '100%', maxWidth: 540, alignSelf: 'center' },
  wideShell: { maxWidth: 1120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 28, paddingTop: 14, paddingBottom: 8, minHeight: 68, gap: 12 },
  textButton: { minHeight: 44, justifyContent: 'center', paddingLeft: 12 },
  skipText: { color: C.muted, fontSize: 12 },
  headerNote: { flexDirection: 'row', gap: 6, alignItems: 'center', flexShrink: 1 },
  tinyDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.accent },
  headerNoteText: { color: C.muted, fontSize: 8, fontWeight: '600', letterSpacing: 1.2, flexShrink: 1 },
  scroll: { flex: 1 },
  swipeArea: { flex: 1, overflow: 'hidden', touchAction: 'pan-y' },
  scrollContent: { flexGrow: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingTop: 12, paddingBottom: 12 },
  wideContent: { flexDirection: 'row', alignItems: 'center', gap: 62, paddingVertical: 32, paddingHorizontal: 28 },
  visualSection: { alignItems: 'center', justifyContent: 'center', marginBottom: 29 },
  compactVisual: { marginBottom: 12 },
  wideVisual: { flex: 1, marginBottom: 0 },
  previewNote: { color: C.subtle, fontSize: 9, letterSpacing: 0.4, marginTop: 15 },
  copy: { paddingHorizontal: 28 },
  wideCopy: { flex: 1, paddingHorizontal: 0 },
  chapter: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 19 },
  compactChapter: { marginBottom: 12 },
  chapterNumber: { color: C.accent, fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
  chapterLine: { width: 23, height: 1, backgroundColor: '#4A5239' },
  chapterLabel: { color: C.accent, fontSize: 9, letterSpacing: 2, fontWeight: '600' },
  title: { color: C.text, fontSize: 28, lineHeight: 39, fontWeight: '700', letterSpacing: -1.2 },
  smallTitle: { fontSize: 24, lineHeight: 35 },
  wideTitle: { fontSize: 34, lineHeight: 47, letterSpacing: -1.5 },
  description: { color: C.muted, fontSize: 13, lineHeight: 23, marginTop: 15, letterSpacing: -0.2 },
  compactDescription: { marginTop: 10 },
  keywordRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 20 },
  compactKeywordRow: { marginTop: 12 },
  keywordIcon: { width: 17, height: 17, borderRadius: 9, backgroundColor: '#252E1B', alignItems: 'center', justifyContent: 'center' },
  check: { color: C.accent, fontSize: 10, fontWeight: '700' },
  keyword: { color: '#C8CCBF', fontSize: 11, flexShrink: 1 },
  footer: { paddingHorizontal: 28, paddingBottom: Platform.OS === 'web' ? 4 : 20, paddingTop: 4 },
  wideFooter: { width: 420, alignSelf: 'flex-end', marginRight: 10 },
  paginationRow: { alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  dots: { flexDirection: 'row', alignItems: 'center' },
  dotTarget: { minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dot: { height: 5, width: 5, borderRadius: 3, backgroundColor: '#3F4447' },
  activeDot: { width: 22, backgroundColor: C.accent },
  actions: { flexDirection: 'row', gap: 10 },
  nextButton: { flex: 1, minHeight: 56, paddingVertical: 16, paddingHorizontal: 22, borderRadius: 16, backgroundColor: C.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15 },
  nextText: { color: C.accentInk, fontSize: 14, fontWeight: '700', flexShrink: 1 },
  nextArrow: { color: C.accentInk, fontSize: 22, lineHeight: 24 },
  replayButton: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  replayText: { color: C.text },
  footerNote: { color: C.subtle, fontSize: 8, letterSpacing: 1.8, textAlign: 'center', marginTop: Platform.OS === 'web' ? 10 : 17, marginBottom: Platform.OS === 'web' ? 0 : 7 },
  pressed: { opacity: 0.65 },
});
