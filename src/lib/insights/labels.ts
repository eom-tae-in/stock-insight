import type { Region, SearchType } from '@/types/database'

export const REGION_LABEL: Record<Region, string> = {
  GLOBAL: '전체',
  US: '미국',
  KR: '한국',
  JP: '일본',
  GB: '영국',
  DE: '독일',
  FR: '프랑스',
  CA: '캐나다',
  AU: '호주',
  IN: '인도',
  BR: '브라질',
  CN: '중국',
  TW: '대만',
  HK: '홍콩',
  SG: '싱가포르',
}
export const SEARCH_TYPE_LABEL: Record<SearchType, string> = {
  WEB: '웹 검색',
  IMAGES: '이미지',
  NEWS: '뉴스',
  YOUTUBE: '유튜브',
  SHOPPING: '쇼핑',
}
