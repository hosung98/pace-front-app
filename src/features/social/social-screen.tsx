import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import { TabScreenShell, tabScreenStyles } from '@/features/navigation/tab-screen-shell';

const posts = [
  {
    id: 'post_101',
    name: '지수',
    initials: '지',
    time: '12분 전',
    message: '오늘 아침 한강 러닝 완료! 선선한 바람 덕분에 기분 좋게 달렸어요 🏃',
    distance: '5.20 km',
    pace: "6'08'' /km",
    reactions: 12,
  },
  {
    id: 'post_102',
    name: '민준',
    initials: '민',
    time: '1시간 전',
    message: '이번 주 첫 10km 도전 성공했습니다. 응원해 준 러닝 크루 고마워요!',
    distance: '10.04 km',
    pace: "5'52'' /km",
    reactions: 8,
  },
  {
    id: 'post_103',
    name: '서연',
    initials: '서',
    time: '어제',
    message: '천천히 오래 달리기. 오늘도 나만의 페이스를 지켰어요.',
    distance: '3.60 km',
    pace: "7'10'' /km",
    reactions: 5,
  },
];

const visibilityOptions = [
  { value: 'followers', label: '팔로워' },
  { value: 'public', label: '전체 공개' },
  { value: 'private', label: '나만 보기' },
] as const;

type PostVisibility = (typeof visibilityOptions)[number]['value'];

export function SocialScreen() {
  const [cheeredPosts, setCheeredPosts] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [postMessage, setPostMessage] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility | null>(null);
  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const pickImages = async () => {
    if (selectedImages.length >= 4) {
      setMessage('사진은 게시물 하나에 최대 4장까지 추가할 수 있어요.');
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setMessage('사진을 첨부하려면 사진 라이브러리 접근을 허용해 주세요.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 4 - selectedImages.length,
        quality: 0.85,
      });

      if (!result.canceled) {
        setSelectedImages((current) => [
          ...current,
          ...result.assets.filter(
            (asset) => !current.some((selected) => selected.uri === asset.uri),
          ),
        ].slice(0, 4));
        setMessage('');
      }
    } catch (error) {
      console.error('Unable to select social post images.', error);
      setMessage('사진을 불러오지 못했어요. 다시 시도해 주세요.');
    }
  };

  const toggleCheer = (postId: string) => {
    setCheeredPosts((current) =>
      current.includes(postId)
        ? current.filter((id) => id !== postId)
        : [...current, postId],
    );
  };

  return (
    <TabScreenShell
      eyebrow="PACE COMMUNITY"
      title="함께 달리는 즐거움"
      description="러닝을 나누고 서로의 도전을 응원해요.">
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          if (showComposer) {
            setVisibility(null);
            setPostMessage('');
            setSelectedImages([]);
          }
          setShowComposer((current) => !current);
          setMessage('');
        }}
        style={({ pressed }) => [styles.createPostButton, pressed && styles.pressed]}>
        <View style={styles.createAvatar}><Text style={styles.avatarText}>나</Text></View>
        <Text style={styles.createPostPrompt}>오늘 러닝은 어땠나요?</Text>
        <Text style={styles.createPostAction}>공유하기</Text>
      </Pressable>

      {showComposer ? (
        <View style={[tabScreenStyles.card, styles.composer]}>
          <Text style={styles.composerTitle}>러닝 이야기 나누기</Text>
          <TextInput
            accessibilityLabel="러닝 게시물 내용"
            multiline
            maxLength={220}
            onChangeText={setPostMessage}
            placeholder="오늘의 러닝을 기록해 보세요."
            placeholderTextColor={C.subtle}
            style={styles.composerInput}
            textAlignVertical="top"
            value={postMessage}
          />
          {selectedImages.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageList}>
              {selectedImages.map((asset, index) => (
                <View key={asset.uri} style={styles.imagePreview}>
                  <Image source={{ uri: asset.uri }} style={styles.image} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`선택한 사진 ${index + 1} 삭제`}
                    onPress={() => setSelectedImages((current) => current.filter((item) => item.uri !== asset.uri))}
                    style={styles.removeImageButton}>
                    <Text style={styles.removeImageText}>×</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : null}
          <View style={styles.composerActions}>
            <Pressable
              accessibilityRole="button"
              disabled={selectedImages.length >= 4}
              onPress={pickImages}
              style={({ pressed }) => [
                styles.addImageButton,
                selectedImages.length >= 4 && styles.disabledButton,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.addImageIcon}>▧</Text>
              <Text style={styles.addImageText}>사진 {selectedImages.length}/4</Text>
            </Pressable>
            <Text style={styles.characterCount}>{postMessage.length}/220</Text>
          </View>
          <Text style={styles.visibilityTitle}>누가 볼 수 있나요? 매번 선택할 수 있어요.</Text>
          <View style={styles.visibilityOptions}>
            {visibilityOptions.map((option) => {
              const isSelected = visibility === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setVisibility(option.value)}
                  style={[styles.visibilityOption, isSelected && styles.visibilityOptionActive]}>
                  <Text style={[styles.visibilityText, isSelected && styles.visibilityTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (!visibility) {
                setMessage('게시하기 전에 공개 범위를 선택해 주세요.');
                return;
              }
              setMessage(
                `미리보기: ${visibilityOptions.find((item) => item.value === visibility)?.label} 공개, 사진 ${selectedImages.length}장. 게시 API 연동 후 공유돼요.`,
              );
            }}
            style={({ pressed }) => [styles.publishButton, pressed && styles.pressed]}>
            <Text style={styles.publishButtonText}>러닝 공유하기</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.inviteCard}>
        <View style={styles.inviteMark}><Text style={styles.inviteMarkText}>＋</Text></View>
        <View style={styles.inviteCopy}>
          <Text style={styles.inviteTitle}>러닝 친구를 찾아보세요</Text>
          <Text style={styles.inviteDescription}>친구의 기록을 보고 함께 응원할 수 있어요.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setMessage('친구 찾기는 계정 및 소셜 API 연동 후 사용할 수 있어요.')}
          style={({ pressed }) => [styles.findButton, pressed && styles.pressed]}>
          <Text style={styles.findButtonText}>찾기</Text>
        </Pressable>
      </View>
      {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}

      <View style={styles.feedHeading}>
        <Text style={styles.feedTitle}>친구들의 러닝</Text>
        <Text style={styles.feedCount}>새 소식</Text>
      </View>
      {posts.map((post) => {
        const isCheered = cheeredPosts.includes(post.id);
        return (
          <View key={post.id} style={tabScreenStyles.card}>
            <View style={styles.postHeader}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{post.initials}</Text></View>
              <View style={styles.postAuthor}>
                <Text style={styles.authorName}>{post.name}</Text>
                <Text style={styles.postTime}>{post.time}</Text>
              </View>
              <Text style={styles.more}>···</Text>
            </View>
            <Text style={styles.postMessage}>{post.message}</Text>
            <View style={styles.runPreview}>
              <View>
                <Text style={styles.runDistance}>{post.distance}</Text>
                <Text style={styles.runLabel}>오늘의 러닝</Text>
              </View>
              <View style={styles.runPace}>
                <Text style={styles.paceValue}>{post.pace}</Text>
                <Text style={styles.runLabel}>평균 페이스</Text>
              </View>
              <View style={styles.routeGlyph}><Text style={styles.routeGlyphText}>↗</Text></View>
            </View>
            <View style={styles.postFooter}>
              <Text style={styles.reactionCount}>👏 {post.reactions + (isCheered ? 1 : 0)}명이 응원해요</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isCheered }}
                onPress={() => toggleCheer(post.id)}
                style={({ pressed }) => [styles.cheerButton, isCheered && styles.cheeredButton, pressed && styles.pressed]}>
                <Text style={[styles.cheerText, isCheered && styles.cheeredText]}>
                  {isCheered ? '👏 응원했어요' : '👏 응원하기'}
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </TabScreenShell>
  );
}

const styles = StyleSheet.create({
  createPostButton: { minHeight: 58, marginTop: 8, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  createAvatar: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#303A22' },
  createPostPrompt: { flex: 1, color: C.muted, fontSize: 10 },
  createPostAction: { color: C.accent, fontSize: 10, fontWeight: '700' },
  composer: { marginTop: 10 },
  composerTitle: { color: C.text, fontSize: 13, fontWeight: '700' },
  composerInput: { minHeight: 80, marginTop: 12, padding: 12, color: C.text, fontSize: 11, lineHeight: 18, borderRadius: 12, backgroundColor: C.raised },
  imageList: { gap: 9, paddingTop: 12 },
  imagePreview: { width: 74, height: 74, overflow: 'hidden', borderRadius: 12, backgroundColor: C.raised },
  image: { width: '100%', height: '100%' },
  removeImageButton: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#0C0D0F' },
  removeImageText: { color: C.text, fontSize: 17, lineHeight: 20 },
  composerActions: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addImageButton: { minHeight: 34, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, backgroundColor: '#20251B' },
  addImageIcon: { color: C.accent, fontSize: 15 },
  addImageText: { color: C.accent, fontSize: 9, fontWeight: '600' },
  disabledButton: { opacity: 0.5 },
  characterCount: { color: C.subtle, fontSize: 9 },
  visibilityTitle: { marginTop: 8, color: C.muted, fontSize: 9 },
  visibilityOptions: { marginTop: 9, flexDirection: 'row', gap: 7 },
  visibilityOption: { flex: 1, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: C.raised },
  visibilityOptionActive: { backgroundColor: '#303A22', borderWidth: 1, borderColor: '#718A35' },
  visibilityText: { color: C.muted, fontSize: 9, fontWeight: '500' },
  visibilityTextActive: { color: C.accent, fontWeight: '700' },
  publishButton: { minHeight: 44, marginTop: 13, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: C.accent },
  publishButtonText: { color: C.accentInk, fontSize: 11, fontWeight: '700' },
  inviteCard: { marginTop: 8, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 18, backgroundColor: '#20251B' },
  inviteMark: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#303A22' },
  inviteMarkText: { color: C.accent, fontSize: 23, lineHeight: 25 },
  inviteCopy: { flex: 1 },
  inviteTitle: { color: C.text, fontSize: 11, fontWeight: '700' },
  inviteDescription: { marginTop: 4, color: C.muted, fontSize: 9, lineHeight: 14 },
  findButton: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10, backgroundColor: C.accent },
  findButtonText: { color: C.accentInk, fontSize: 10, fontWeight: '700' },
  message: { marginTop: 9, color: C.muted, fontSize: 10, lineHeight: 16 },
  feedHeading: { marginTop: 26, marginBottom: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  feedTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
  feedCount: { color: C.accent, fontSize: 10 },
  postHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 37, height: 37, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: '#303A22' },
  avatarText: { color: C.accent, fontSize: 13, fontWeight: '700' },
  postAuthor: { flex: 1, marginLeft: 10, gap: 3 },
  authorName: { color: C.text, fontSize: 11, fontWeight: '700' },
  postTime: { color: C.subtle, fontSize: 9 },
  more: { color: C.subtle, fontSize: 20 },
  postMessage: { marginTop: 14, color: C.text, fontSize: 11, lineHeight: 18 },
  runPreview: { marginTop: 14, padding: 14, flexDirection: 'row', alignItems: 'center', borderRadius: 14, backgroundColor: C.raised },
  runDistance: { color: C.accent, fontSize: 17, fontWeight: '700' },
  runLabel: { marginTop: 4, color: C.subtle, fontSize: 9 },
  runPace: { flex: 1, marginLeft: 22 },
  paceValue: { color: C.text, fontSize: 12, fontWeight: '600' },
  routeGlyph: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#303A22' },
  routeGlyphText: { color: C.accent, fontSize: 18 },
  postFooter: { marginTop: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reactionCount: { color: C.muted, fontSize: 9 },
  cheerButton: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: C.raised },
  cheeredButton: { backgroundColor: '#303A22' },
  cheerText: { color: C.muted, fontSize: 9, fontWeight: '600' },
  cheeredText: { color: C.accent },
  pressed: { opacity: 0.75 },
});
