export const onboardingSlides = [
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

export type OnboardingSlide = (typeof onboardingSlides)[number];
