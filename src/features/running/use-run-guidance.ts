import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Speech from 'expo-speech';
import { runGoalProgress } from './run-goals';
import type { ActiveRun } from './types';

export function useRunGuidance(run: ActiveRun | null, now: number) {
  const last = useRef({ id: '', km: 0, reached: false });
  const [failure, setFailure] = useState<string | null>(null);
  useEffect(() => {
    if (run?.status !== 'running' || AppState.currentState !== 'active') return;
    const km = Math.floor(run.distanceMeters / 1000);
    const goal = runGoalProgress(run, now);
    if (last.current.id !== run.id) {
      last.current = { id: run.id, km, reached: goal?.reached ?? false };
      return;
    }
    const newKm = km > last.current.km;
    const reached = Boolean(goal?.reached && !last.current.reached);
    last.current = { id: run.id, km, reached: goal?.reached ?? false };
    if (!run.voiceGuidance || (!newKm && !reached)) return;
    const seconds = Math.max(0, Math.floor((run.elapsedBeforeSegmentMs + now - run.segmentStartedAt) / 1000));
    const pace = run.distanceMeters > 0 ? Math.round(seconds / (run.distanceMeters / 1000)) : 0;
    const text = reached ? `오늘의 ${goal?.label} 목표를 달성했어요. 나만의 페이스로 계속 달려도 좋아요.`
      : `${km}킬로미터 달렸어요. 평균 페이스 ${Math.floor(pace / 60)}분 ${pace % 60}초입니다.`;
    Speech.speak(text, { language: 'ko-KR', useApplicationAudioSession: false, onError: (error) => {
      console.error('러닝 음성 안내 실패', error);
      setFailure('음성 안내를 재생하지 못했어요. 음량과 무음 모드를 확인해 주세요.');
    } });
  }, [run, now]);
  useEffect(() => {
    const stop = () => { void Speech.stop().catch((error: unknown) => {
      console.error('러닝 음성 중단 실패', error);
      setFailure('음성 안내를 중단하지 못했어요.');
    }); };
    const subscription = AppState.addEventListener('change', (state) => { if (state !== 'active') stop(); });
    return () => { subscription.remove(); stop(); };
  }, []);
  useEffect(() => {
    if (run?.status === 'running') return;
    void Speech.stop().catch((error: unknown) => {
      console.error('러닝 음성 중단 실패', error);
      setFailure('음성 안내를 중단하지 못했어요.');
    });
  }, [run?.status]);
  return failure;
}
