import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader } from '@/components/back-header';
import { PaceButton } from '@/components/pace-button';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';

type Section = Readonly<{ title: string; body: string }>;
const privacy: readonly Section[] = [
  { title: '러닝 성취·회고·이미지 공유', body: 'PACE 러닝으로 주간 목표, 배지 획득 이력과 대표 배지, 개인 최장 거리를 계산합니다. 로그인 계정은 성취와 선택한 컨디션·러닝 메모를 서버에 저장합니다. 게스트 메모는 기기에만 남습니다. 크루 공동 목표에는 현재 멤버의 가입 이후 러닝 거리와 닉네임이 표시됩니다. 공유 카드는 사용자가 OS 공유창으로 선택한 앱에 전달되며 기본적으로 출발·도착 반경 200m를 숨깁니다. 경로의 다른 부분으로 위치가 추정될 수 있으므로 공유 전에 확인해 주세요. 음성 코치에는 녹음이나 마이크 접근이 필요하지 않습니다.' },
  { title: '1. 운영자와 문의', body: 'PACE 운영자 및 개인정보 문의 담당자는 김호성입니다. 문의: hosung0806@gmail.com. 이 문서는 현재 테스트 서비스의 데이터 흐름을 안내하는 초안입니다. 정식 공개 전 서버 소재지·위탁 업체·국외 이전 여부·로그 및 백업 보관기간을 확정하고 법률 검토 후 갱신해야 합니다.' },
  { title: '2. 처리하는 정보와 목적', body: '소셜 로그인 제공자의 식별자, 제공된 이메일·이름, PACE 닉네임·프로필·공개 범위·설정, 인증 토큰을 계정 생성·인증·계정 관리에 사용합니다. 러닝 시작·종료 시각, 거리, 시간, GPS 경로를 기록·통계·동기화에 사용합니다. 크루 가입·역할·신청 및 대결 참가 내역은 커뮤니티 운영에 사용합니다.' },
  { title: '3. 위치 정보와 기기 모드', body: '위치는 사용자가 GPS 러닝을 시작하거나 내 동네 찾기를 선택할 때 사용합니다. 진행 중인 러닝은 화면이 잠겨도 위치를 기록하며 종료하면 수집을 중단합니다. 로그인 전 러닝은 기기에 저장됩니다. 로그인 시 이 기기의 미연결 기록과 GPS 경로가 해당 PACE 계정의 서버로 전송됩니다. 업로드 대기 기록은 기기에 남아 재시도됩니다.' },
  { title: '4. Apple 건강과 생체 인증', body: '별도 선택한 건강 권한으로 오늘 걸음 수와 최근 운동을 기기에서만 조회합니다. 건강 앱에서 읽은 원본은 PACE 서버에 전송하거나 크루·대결 순위에 반영하지 않습니다. 연동 후 완료한 PACE 러닝의 거리와 시각을 건강 앱에 저장합니다. 심박·칼로리·GPS 경로는 건강 앱에 쓰지 않습니다. Face ID·Touch ID 판별은 운영체제가 수행하며 PACE는 얼굴·지문 원본을 수집하거나 서버에 저장하지 않습니다.' },
  { title: '5. 공개되는 정보와 외부 서비스', body: '크루·대결 참여 시 닉네임, 크루 역할, 참여 현황과 집계 러닝 거리가 관련 화면에 표시될 수 있습니다. 건강 앱에서 가져온 운동은 합산하지 않습니다. Google·Apple 로그인, Apple 건강, 운영체제 지도, Expo 앱 빌드·업데이트 서비스를 이용합니다. 각 서비스의 자체 처리는 해당 제공자의 정책을 따릅니다. 공개 전 실제 서버·외부 처리 업체 및 국외 이전 사항의 상세 고지를 확정해야 합니다.' },
  { title: '6. 보관과 삭제', body: '기기 기록·설정은 사용자가 삭제하거나 앱 데이터를 제거할 때까지 기기에 남을 수 있습니다. 앱 삭제 전 미동기화 기록을 확인해 주세요. 로그아웃은 서버 기록 삭제가 아닙니다. 설정 → 계정 및 데이터 삭제로 탈퇴를 요청할 수 있습니다. 현재 서버는 탈퇴 요청 후 계정을 삭제 대기 상태로 전환하고 인증 토큰을 폐기합니다. 물리 삭제·백업·로그의 구체적 보관기간은 운영 정책 확정 전이며 즉시 완전 삭제를 보장하지 않습니다. 상세 삭제 요청은 운영자에게 문의해 주세요.' },
  { title: '7. 이용자의 선택과 권리', body: '프로필 수정, 개별 러닝 삭제, 건강 연동 해제 및 계정 삭제 요청을 앱에서 할 수 있습니다. 개인정보 열람·정정·삭제·처리정지는 문의 이메일로 요청할 수 있습니다. Apple로 가입한 계정 탈퇴에는 Apple 재인증이 필요합니다. 건강 연동을 끄거나 PACE에서 탈퇴해도 건강 앱에 이미 저장한 운동은 남으며 건강 앱에서 직접 삭제할 수 있습니다.' },
  { title: '8. 권한과 보호 조치', body: '위치·건강·사진·생체 인증 등 선택 기능은 필요한 시점에 요청합니다. 거부하면 해당 기능만 제한되며 나머지 기능은 이용할 수 있습니다. iPhone 설정에서 권한을 변경할 수 있습니다. 네이티브 로그인 토큰과 앱 잠금 선호는 SecureStore에 보관합니다. 웹 로그인 세션은 현재 탭 메모리에서만 유지합니다. 기기를 공유할 경우 로그아웃하고 기기 암호를 설정해 주세요.' },
  { title: '9. 변경 안내', body: '작성일: 2026년 10월 26일. 현재 테스트 서비스 기준 안내입니다. 중요한 처리 목적·수집 항목·보관 정책 변경 시 앱 내 문서를 갱신하고 필요한 안내·동의를 진행해야 합니다.' },
];
const terms: readonly Section[] = [
  { title: '서비스 안내', body: 'PACE는 개인 러닝 기록과 크루·대결 참여를 돕는 테스트 서비스입니다. 운영자는 김호성이며 문의는 hosung0806@gmail.com으로 보내 주세요. 본 문서는 테스트 이용 안내 초안이며 정식 출시 전 약관과 관련 법률 검토가 필요합니다.' },
  { title: '안전한 이용', body: '러닝 기록은 GPS·기기 상태에 따라 오차가 있을 수 있습니다. PACE는 의료 기기나 응급 구조 서비스가 아니며 건강·안전을 보장하지 않습니다. 달리는 중에는 화면 조작을 피하고 교통 규칙과 자신의 신체 상태를 우선해 주세요.' },
  { title: '계정과 커뮤니티', body: '본인의 소셜 계정으로 이용하고 다른 사람의 계정·위치 정보를 무단 사용하지 마세요. 크루 초대 코드는 공유한 사람이 바로 가입할 수 있으므로 신중히 전달해 주세요. 허위 기록, 타인 사칭, 괴롭힘 및 권리 침해를 금지합니다. 피해나 오류 신고는 운영자에게 문의할 수 있습니다.' },
  { title: '기록 보관과 기능 범위', body: '기기 모드·오프라인 기록은 해당 기기에 남습니다. 앱 삭제·기기 변경 전 동기화 상태를 확인해 주세요. 테스트 중 기능 변경·중단이나 오류가 발생할 수 있습니다. 대결 자동 출발·GPS 결과 검증 및 실제 푸시 알림 발송은 아직 지원하지 않습니다. 건강 운동 시간에는 일시 정지가 포함될 수 있습니다.' },
  { title: '탈퇴와 데이터', body: '설정에서 계정 삭제를 요청하거나 운영자에게 문의할 수 있습니다. 서버는 삭제 대기 처리 후 로그인을 차단하며 구체적인 물리 삭제·백업 보관 정책은 확정이 필요합니다. Apple 계정은 재인증·연결 해제가 필요하고, 이미 건강 앱에 저장한 운동은 별도로 삭제해야 합니다. 자세한 사항은 개인정보 처리방침을 확인해 주세요.' },
];
const support: readonly Section[] = [
  { title: '문의 · 오류 신고', body: '운영자: 김호성\n이메일: hosung0806@gmail.com\n앱 버전, 사용 기기, 문제가 발생한 화면과 재현 순서를 보내 주세요. 비밀번호·인증 토큰·Apple 비밀키·불필요한 건강 원본은 첨부하지 마세요.' },
  { title: '건강 데이터가 보이지 않아요', body: '건강 앱 → 프로필 → 앱 → PACE에서 읽기·쓰기 권한을 확인해 주세요. 읽기 거부와 데이터가 없는 경우를 앱이 구분할 수는 없습니다. 권한 요청이 멈추면 열린 시스템 권한창을 완료해 주세요. 창이 없다면 앱을 닫았다가 다시 열어 시도해 주세요.' },
  { title: '내 기록이나 계정을 삭제하고 싶어요', body: '기록 목록에서 러닝을 왼쪽으로 밀어 삭제하거나 설정에서 계정 삭제를 요청할 수 있습니다. 앱에서 접근이 어려우면 위 이메일로 삭제 요청을 보내 주세요. 계정 확인을 위해 필요한 절차를 안내합니다. 비밀번호나 인증 토큰은 보내지 마세요. Apple 건강에 저장한 운동은 건강 앱에서 직접 삭제해야 합니다.' },
  { title: 'Face ID가 자주 떠요', body: '앱 잠금을 켠 계정은 앱 시작 또는 백그라운드 5분 이상 이탈 후 인증합니다. 짧은 앱 전환·권한창만으로 재인증하지 않습니다. 원하지 않으면 설정 → Face ID · 기기 암호로 앱 잠금을 꺼 주세요.' },
];

export function LegalScreen({ kind }: Readonly<{ kind: 'privacy' | 'terms' | 'support' }>) {
  const router = useRouter();
  const [failure, setFailure] = useState<string | null>(null);
  const sections = kind === 'privacy' ? privacy : kind === 'terms' ? terms : support;
  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}><BackHeader />
      <Text style={styles.title}>{kind === 'privacy' ? '개인정보 처리방침' : kind === 'terms' ? '이용약관' : '도움말 · 문의'}</Text>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      {kind !== 'support' ? <Text style={styles.notice}>테스트 서비스 안내 초안 · 2026.10.26{'\n'}정식 공개 전 보관기간·인프라 정보 확정 및 법률 검토가 필요합니다.</Text> : null}
      {sections.map((section) => <View key={section.title} style={styles.section}>
        <Text style={styles.heading}>{section.title}</Text>
        <Text selectable style={styles.body}>{section.body}</Text>
      </View>)}
      <PaceButton label="이메일로 문의하기" variant="secondary" onPress={() => {
        void Linking.openURL('mailto:hosung0806@gmail.com?subject=PACE%20%EB%AC%B8%EC%9D%98').catch((error: unknown) => {
          console.error('문의 이메일 열기 실패', error);
          setFailure('메일 앱을 열지 못했어요. hosung0806@gmail.com으로 직접 보내 주세요.');
        });
      }} />
      {failure ? <Text accessibilityRole="alert" style={styles.body}>{failure}</Text> : null}
      {kind !== 'privacy' ? <PaceButton label="개인정보 처리방침" variant="secondary" onPress={() => router.push('/privacy')} /> : null}
      {kind !== 'terms' ? <PaceButton label="이용약관" variant="secondary" onPress={() => router.push('/terms')} /> : null}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, width: '100%', maxWidth: 560, alignSelf: 'center' },
  screen: { flex: 1, backgroundColor: C.background },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 24, paddingBottom: 40, gap: 24 },
  title: { marginTop: 12, marginBottom: 4, color: C.text, fontSize: 25, fontWeight: '700' },
  notice: { color: C.accent, fontSize: 12, lineHeight: 20, padding: 16, borderRadius: 14, backgroundColor: C.surface },
  section: { gap: 10 },
  heading: { color: C.text, fontSize: 16, fontWeight: '600' },
  body: { color: C.muted, fontSize: 13, lineHeight: 23 },
});
