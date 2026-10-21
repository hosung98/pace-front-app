/**
 * Activity regions for crews (시/도 → 시/군/구). Cities that have 구 are kept at city level.
 * The backend should store the same strings (`region_sido`, `region_sigungu`).
 */
export type CrewRegion = Readonly<{ sido: string; sigungu: string | null }>;

export const REGIONS: readonly { sido: string; sigungu: readonly string[] }[] = [
  {
    sido: '서울',
    sigungu: [
      '강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구',
      '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구',
    ],
  },
  { sido: '부산', sigungu: ['강서구', '금정구', '기장군', '남구', '동구', '동래구', '부산진구', '북구', '사상구', '사하구', '서구', '수영구', '연제구', '영도구', '중구', '해운대구'] },
  { sido: '대구', sigungu: ['군위군', '남구', '달서구', '달성군', '동구', '북구', '서구', '수성구', '중구'] },
  { sido: '인천', sigungu: ['강화군', '계양구', '남동구', '동구', '미추홀구', '부평구', '서구', '연수구', '옹진군', '중구'] },
  { sido: '광주', sigungu: ['광산구', '남구', '동구', '북구', '서구'] },
  { sido: '대전', sigungu: ['대덕구', '동구', '서구', '유성구', '중구'] },
  { sido: '울산', sigungu: ['남구', '동구', '북구', '울주군', '중구'] },
  { sido: '세종', sigungu: [] },
  {
    sido: '경기',
    sigungu: [
      '가평군', '고양시', '과천시', '광명시', '광주시', '구리시', '군포시', '김포시', '남양주시', '동두천시', '부천시', '성남시', '수원시',
      '시흥시', '안산시', '안성시', '안양시', '양주시', '양평군', '여주시', '연천군', '오산시', '용인시', '의왕시', '의정부시', '이천시',
      '파주시', '평택시', '포천시', '하남시', '화성시',
    ],
  },
  {
    sido: '강원',
    sigungu: [
      '강릉시', '고성군', '동해시', '삼척시', '속초시', '양구군', '양양군', '영월군', '원주시', '인제군', '정선군', '철원군', '춘천시',
      '태백시', '평창군', '홍천군', '화천군', '횡성군',
    ],
  },
  { sido: '충북', sigungu: ['괴산군', '단양군', '보은군', '영동군', '옥천군', '음성군', '제천시', '증평군', '진천군', '청주시', '충주시'] },
  {
    sido: '충남',
    sigungu: ['계룡시', '공주시', '금산군', '논산시', '당진시', '보령시', '부여군', '서산시', '서천군', '아산시', '예산군', '천안시', '청양군', '태안군', '홍성군'],
  },
  {
    sido: '전북',
    sigungu: ['고창군', '군산시', '김제시', '남원시', '무주군', '부안군', '순창군', '완주군', '익산시', '임실군', '장수군', '전주시', '정읍시', '진안군'],
  },
  {
    sido: '전남',
    sigungu: [
      '강진군', '고흥군', '곡성군', '광양시', '구례군', '나주시', '담양군', '목포시', '무안군', '보성군', '순천시', '신안군', '여수시',
      '영광군', '영암군', '완도군', '장성군', '장흥군', '진도군', '함평군', '해남군', '화순군',
    ],
  },
  {
    sido: '경북',
    sigungu: [
      '경산시', '경주시', '고령군', '구미시', '김천시', '문경시', '봉화군', '상주시', '성주군', '안동시', '영덕군', '영양군', '영주시',
      '영천시', '예천군', '울릉군', '울진군', '의성군', '청도군', '청송군', '칠곡군', '포항시',
    ],
  },
  {
    sido: '경남',
    sigungu: [
      '거제시', '거창군', '고성군', '김해시', '남해군', '밀양시', '사천시', '산청군', '양산시', '의령군', '진주시', '창녕군', '창원시',
      '통영시', '하동군', '함안군', '함양군', '합천군',
    ],
  },
  { sido: '제주', sigungu: ['서귀포시', '제주시'] },
];

export const SIDO_LIST = REGIONS.map((region) => region.sido);

export function sigunguOf(sido: string): readonly string[] {
  return REGIONS.find((region) => region.sido === sido)?.sigungu ?? [];
}

export function formatRegion(region: CrewRegion | null | undefined): string {
  if (!region) return '지역 미정';
  return region.sigungu ? `${region.sido} ${region.sigungu}` : region.sido;
}

/** Long/legacy names returned by geocoders → short 시/도 key used in REGIONS. */
const SIDO_ALIASES: readonly [prefix: string, sido: string][] = [
  ['서울', '서울'],
  ['부산', '부산'],
  ['대구', '대구'],
  ['인천', '인천'],
  ['광주', '광주'],
  ['대전', '대전'],
  ['울산', '울산'],
  ['세종', '세종'],
  ['경기', '경기'],
  ['강원', '강원'],
  ['충청북', '충북'],
  ['충북', '충북'],
  ['충청남', '충남'],
  ['충남', '충남'],
  ['전라북', '전북'],
  ['전북', '전북'],
  ['전라남', '전남'],
  ['전남', '전남'],
  ['경상북', '경북'],
  ['경북', '경북'],
  ['경상남', '경남'],
  ['경남', '경남'],
  ['제주', '제주'],
];

/**
 * Best-effort match of reverse-geocoded address parts (region/city/district/subregion)
 * to a region in REGIONS. Returns null when nothing matches (e.g. outside Korea).
 */
export function matchRegion(parts: readonly (string | null | undefined)[]): CrewRegion | null {
  const tokens = parts
    .filter((part): part is string => Boolean(part))
    .flatMap((part) => part.split(/\s+/))
    .map((token) => token.trim())
    .filter(Boolean);

  const sido = tokens
    .map((token) => SIDO_ALIASES.find(([prefix]) => token.startsWith(prefix))?.[1])
    .find((value): value is string => Boolean(value));
  if (!sido) return null;

  const candidates = sigunguOf(sido);
  // 수원시 장안구 → prefer city-level match; fall back to 구/군 names.
  const sigungu = tokens.find((token) => candidates.includes(token)) ?? null;
  return { sido, sigungu };
}
