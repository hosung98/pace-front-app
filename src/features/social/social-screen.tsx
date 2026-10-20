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
import { SymbolView } from 'expo-symbols';

import { PaceErrorDialog } from '@/components/pace-feedback';
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
    imageUrl: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1000&q=82',
    location: '서울 반포 한강공원',
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
    imageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1000&q=82',
    location: '서울숲 러닝 코스',
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
    imageUrl: 'https://images.unsplash.com/photo-1502904550040-7534597429ae?auto=format&fit=crop&w=1000&q=82',
    location: '남산 둘레길',
    distance: '3.60 km',
    pace: "7'10'' /km",
    reactions: 5,
  },
];

type SocialSection = 'feed' | 'friends' | 'mine';
const visibilityOptions = [
  { value: 'followers', label: '팔로워' },
  { value: 'public', label: '전체 공개' },
  { value: 'private', label: '나만 보기' },
] as const;

type PostVisibility = (typeof visibilityOptions)[number]['value'];

export function SocialScreen() {
  const [section, setSection] = useState<SocialSection>('feed');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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
        setErrorMessage('사진을 첨부하려면 사진 라이브러리 접근을 허용해 주세요.');
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
      setErrorMessage('사진을 불러오지 못했어요. 다시 시도해 주세요.');
    }
  };

  return (
    <TabScreenShell
      eyebrow="PACE COMMUNITY"
      title="러닝 피드"
      description="친구들의 오늘을 구경하고 함께 응원해요.">
      <View style={styles.sectionTabs}>
        {([
          ['feed', '피드'],
          ['friends', '친구 찾기'],
          ['mine', '내 활동'],
        ] as const).map(([key, label]) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected: section === key }}
            onPress={() => {
              setSection(key);
              setMessage('');
            }}
            style={[styles.sectionTab, section === key && styles.sectionTabActive]}>
            <Text style={[styles.sectionTabText, section === key && styles.sectionTabTextActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {section === 'feed' ? <>
      <View style={styles.previewNotice}>
        <Text style={styles.previewNoticeText}>
          샘플 피드입니다. 응원·댓글·게시 기능은 서버 연동 후 사용할 수 있어요.
        </Text>
      </View>
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
            disabled
            style={[styles.publishButton, styles.disabledButton]}>
            <Text style={styles.publishButtonText}>서버 연동 후 게시할 수 있어요</Text>
          </Pressable>
        </View>
      ) : null}

      {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}

      <View style={styles.feedHeading}>
        <Text style={styles.feedTitle}>샘플 러닝</Text>
        <Text style={styles.feedCount}>미리보기</Text>
      </View>
      {posts.map((post) => (
          <View key={post.id} style={[tabScreenStyles.card, styles.postCard]}>
            <View style={styles.postHeader}>
              <View style={styles.avatarRing}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{post.initials}</Text></View>
              </View>
              <View style={styles.postAuthor}>
                <Text style={styles.authorName}>{post.name}</Text>
                <Text style={styles.postLocation}>{post.location}</Text>
              </View>
              <Text style={styles.more}>···</Text>
            </View>
            <Image
              accessibilityLabel={`${post.name}의 러닝 사진`}
              source={{ uri: post.imageUrl }}
              style={styles.postPhoto}
              resizeMode="cover"
            />
            <View style={styles.postActions}>
              <View style={styles.primaryActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="응원은 서버 연동 후 사용할 수 있어요"
                  disabled
                  style={[styles.iconButton, styles.disabledAction]}>
                  <Text style={styles.actionIcon}>♡</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="댓글은 서버 연동 후 사용할 수 있어요"
                  disabled
                  style={[styles.iconButton, styles.disabledAction]}>
                  <SymbolView
                    name={{
                      ios: 'bubble.left',
                      android: 'chat_bubble_outline',
                      web: 'chat_bubble_outline',
                    }}
                    size={20}
                    tintColor={C.text}
                    weight="regular"
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="공유 기능은 서버 연동 후 사용할 수 있어요"
                  disabled
                  style={[styles.iconButton, styles.disabledAction]}>
                  <SymbolView
                    name={{
                      ios: 'paperplane',
                      android: 'send',
                      web: 'send',
                    }}
                    size={19}
                    tintColor={C.text}
                    weight="regular"
                  />
                </Pressable>
              </View>
              <Text style={styles.postTime}>{post.time}</Text>
            </View>
            <Text style={styles.likesCount}>
              샘플 · {post.reactions}명이 응원해요
            </Text>
            <Text style={styles.caption}>
              <Text style={styles.captionName}>{post.name} </Text>
              {post.message}
            </Text>
            <View style={styles.runPreview}>
              <View style={styles.runMetric}>
                <Text style={styles.runDistance}>{post.distance}</Text>
                <Text style={styles.runLabel}>거리</Text>
              </View>
              <View style={styles.runMetric}>
                <Text style={styles.paceValue}>{post.pace}</Text>
                <Text style={styles.runLabel}>평균 페이스</Text>
              </View>
              <View style={styles.routeGlyph}><Text style={styles.routeGlyphText}>↗</Text></View>
            </View>
          </View>
      ))}
      </> : section === 'friends' ? (
        <View style={styles.friendsPage}>
          <Text style={styles.pageTitle}>러닝 친구 찾기</Text>
          <Text style={styles.pageDescription}>닉네임이나 별칭으로 러닝 친구를 찾아보세요.</Text>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              accessibilityLabel="닉네임 또는 별칭으로 친구 검색"
              onChangeText={setSearchQuery}
              placeholder="닉네임 또는 별칭"
              placeholderTextColor={C.subtle}
              returnKeyType="search"
              style={styles.searchInput}
              value={searchQuery}
            />
            {searchQuery ? (
              <Pressable accessibilityRole="button" accessibilityLabel="검색어 지우기" onPress={() => setSearchQuery('')}>
                <Text style={styles.clearSearch}>×</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.apiNotice}>
            <Text style={styles.apiNoticeTitle}>친구 검색은 아직 준비 중이에요</Text>
            <Text style={styles.apiNoticeText}>
              검색 결과와 친구 요청은 계정 서버에 연결된 뒤 표시됩니다.
              지금은 실제 결과가 아닌 샘플을 보여주지 않아요.
            </Text>
            {searchQuery.trim() ? (
              <Text style={styles.searchHint}>
                “{searchQuery.trim()}” 검색은 API 연동 후 이용할 수 있어요.
              </Text>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={styles.myActivity}>
          <View style={styles.myProfileCard}>
            <PersonAvatar initials="나" large />
            <View style={styles.personCopy}>
              <Text style={styles.personName}>PACE 러너</Text>
              <Text style={styles.personDetail}>내 게시물은 계정 연동 후 표시됩니다.</Text>
            </View>
          </View>
          <View style={styles.activityStats}>
            <ActivityStat value="—" label="게시물" />
            <ActivityStat value="—" label="친구" />
            <ActivityStat value="—" label="이번 주" />
          </View>
          <View style={styles.myPostsHeading}>
            <Text style={styles.pageTitle}>내 게시물</Text>
            <Text style={styles.activityBadge}>미리보기</Text>
          </View>
          <View style={styles.apiNotice}>
            <Text style={styles.apiNoticeTitle}>내 게시물이 아직 없어요</Text>
            <Text style={styles.apiNoticeText}>
              게시물과 러닝 기록은 로그인 및 서버 연동 후 이곳에 표시됩니다.
            </Text>
          </View>
        </View>
      )}
      <PaceErrorDialog
        message={errorMessage}
        onClose={() => setErrorMessage(null)}
      />
    </TabScreenShell>
  );
}

function PersonAvatar({ initials, large = false }: Readonly<{ initials: string; large?: boolean }>) {
  return (
    <View style={[styles.personAvatar, large && styles.personAvatarLarge]}>
      <Text style={[styles.avatarText, large && styles.largeAvatarText]}>{initials}</Text>
    </View>
  );
}

function ActivityStat({ value, label }: Readonly<{ value: string; label: string }>) {
  return (
    <View style={styles.activityStat}>
      <Text style={styles.activityValue}>{value}</Text>
      <Text style={styles.personDetail}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTabs: { marginTop: 6, marginBottom: 17, padding: 4, flexDirection: 'row', gap: 4, borderRadius: 14, backgroundColor: C.surface },
  sectionTab: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  sectionTabActive: { backgroundColor: '#303A22' },
  sectionTabText: { color: C.muted, fontSize: 10, fontWeight: '600' },
  sectionTabTextActive: { color: C.accent },
  createPostButton: { minHeight: 58, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  createAvatar: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#303A22' },
  createPostPrompt: { flex: 1, color: C.muted, fontSize: 10 },
  createPostAction: { color: C.accent, fontSize: 10, fontWeight: '700' },
  composer: { marginTop: 12 },
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
  disabledAction: { opacity: 0.42 },
  characterCount: { color: C.subtle, fontSize: 9 },
  visibilityTitle: { marginTop: 8, color: C.muted, fontSize: 9 },
  visibilityOptions: { marginTop: 9, flexDirection: 'row', gap: 7 },
  visibilityOption: { flex: 1, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: C.raised },
  visibilityOptionActive: { backgroundColor: '#303A22', borderWidth: 1, borderColor: '#718A35' },
  visibilityText: { color: C.muted, fontSize: 9, fontWeight: '500' },
  visibilityTextActive: { color: C.accent, fontWeight: '700' },
  publishButton: { minHeight: 44, marginTop: 13, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: C.accent },
  publishButtonText: { color: C.accentInk, fontSize: 11, fontWeight: '700' },
  message: { marginTop: 9, color: C.muted, fontSize: 10, lineHeight: 16 },
  feedHeading: { marginTop: 23, marginBottom: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  feedTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
  feedCount: { color: C.accent, fontSize: 10 },
  previewNotice: { marginBottom: 12, padding: 12, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  previewNoticeText: { color: C.muted, fontSize: 10, lineHeight: 15 },
  postHeader: { minHeight: 62, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  postCard: { marginTop: 13, padding: 0, overflow: 'hidden' },
  friendsPage: { gap: 0 },
  pageTitle: { marginTop: 4, color: C.text, fontSize: 15, fontWeight: '700' },
  pageDescription: { marginTop: 5, color: C.muted, fontSize: 10, lineHeight: 15 },
  searchBox: { minHeight: 44, marginTop: 15, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  searchIcon: { color: C.muted, fontSize: 20 },
  searchInput: { flex: 1, paddingVertical: 8, color: C.text, fontSize: 11 },
  clearSearch: { color: C.muted, fontSize: 20, paddingHorizontal: 4 },
  apiNotice: { marginTop: 15, padding: 16, gap: 8, borderRadius: 15, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  apiNoticeTitle: { color: C.text, fontSize: 12, fontWeight: '700' },
  apiNoticeText: { color: C.muted, fontSize: 10, lineHeight: 16 },
  searchHint: { color: C.accent, fontSize: 10, lineHeight: 15 },
  personAvatar: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#303A22' },
  personAvatarLarge: { width: 54, height: 54, borderRadius: 27 },
  largeAvatarText: { fontSize: 17 },
  personCopy: { flex: 1, gap: 4 },
  personName: { color: C.text, fontSize: 11, fontWeight: '700' },
  personDetail: { color: C.subtle, fontSize: 9 },
  myActivity: { gap: 12 },
  myProfileCard: { marginTop: 2, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  activityStats: { paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-around', borderRadius: 15, backgroundColor: C.surface },
  activityStat: { alignItems: 'center', gap: 4 },
  activityValue: { color: C.text, fontSize: 13, fontWeight: '700' },
  myPostsHeading: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activityBadge: { color: C.accent, fontSize: 9, fontWeight: '600' },
  avatarRing: { width: 39, height: 39, padding: 2, borderRadius: 20, borderWidth: 1.5, borderColor: C.accent },
  avatar: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#303A22' },
  avatarText: { color: C.accent, fontSize: 13, fontWeight: '700' },
  postAuthor: { flex: 1, marginLeft: 10, gap: 3 },
  authorName: { color: C.text, fontSize: 11, fontWeight: '700' },
  postTime: { color: C.subtle, fontSize: 9 },
  postLocation: { color: C.muted, fontSize: 9 },
  more: { color: C.subtle, fontSize: 20 },
  postPhoto: { width: '100%', aspectRatio: 4 / 3, backgroundColor: C.raised },
  postActions: { paddingHorizontal: 14, paddingTop: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  primaryActions: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  iconButton: { minWidth: 34, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  actionIcon: { color: C.text, fontSize: 23, lineHeight: 28 },
  likesCount: { marginTop: 1, paddingHorizontal: 14, color: C.text, fontSize: 11, fontWeight: '700' },
  caption: { marginTop: 7, paddingHorizontal: 14, color: C.text, fontSize: 11, lineHeight: 17 },
  captionName: { color: C.text, fontWeight: '700' },
  runPreview: { margin: 14, marginTop: 12, padding: 13, flexDirection: 'row', alignItems: 'center', borderRadius: 13, backgroundColor: C.raised },
  runMetric: { flex: 1 },
  runDistance: { color: C.accent, fontSize: 15, fontWeight: '700' },
  runLabel: { marginTop: 4, color: C.subtle, fontSize: 9 },
  paceValue: { color: C.text, fontSize: 11, fontWeight: '600' },
  routeGlyph: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#303A22' },
  routeGlyphText: { color: C.accent, fontSize: 18 },
  pressed: { opacity: 0.75 },
});
