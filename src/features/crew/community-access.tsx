import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader } from '@/components/back-header';
import { PaceButton } from '@/components/pace-button';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';
import { useSession } from '@/features/auth/session-store';

export function CommunitySignIn() {
  const router = useRouter();
  return (
    <View style={styles.card}>
      <Text style={styles.title}>로그인하고 함께 달려요</Text>
      <Text style={styles.description}>크루와 대결은 계정에 저장돼요. Google · Apple 로그인 후 직접 만들거나 초대 코드로 참가할 수 있어요.</Text>
      <PaceButton label="로그인하기" onPress={() => router.push('/login')} />
    </View>
  );
}

export function CommunityAccess({ children }: Readonly<{ children: ReactNode }>) {
  const { session } = useSession();
  if (session) return <View key={session.user.id} style={styles.screen}>{children}</View>;
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}><BackHeader /><CommunitySignIn /></View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24 },
  card: { marginTop: 24, padding: 24, gap: 16, borderWidth: 1, borderColor: C.border, borderRadius: 24, backgroundColor: C.surface },
  title: { color: C.text, fontSize: 20, lineHeight: 28, fontWeight: '700' },
  description: { color: C.muted, fontSize: 13, lineHeight: 22 },
});
