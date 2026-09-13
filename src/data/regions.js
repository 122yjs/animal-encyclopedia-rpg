// 5개 서식지 지역 정의 — 수집형 턴제 RPG 여정의 축
// 월드는 왼쪽(마을)에서 오른쪽(특별한 환경)으로 이어지는 긴 모험 길입니다.

export const TILE = 32;   // 화면 타일 크기 (원본 16px 픽셀아트 x2)
export const MAP_W = 120; // 월드 가로 타일 수
export const MAP_H = 34;  // 월드 세로 타일 수
export const PATH_Y = [15, 16]; // 지역을 잇는 큰길(세로 위치)

export const REGION_ORDER = ["around", "land", "freshwater", "sea", "special"];

/** 조우 마커와 도감에서 쓰는 동물 이모지 */
export const animalEmoji = {
  "무당벌레": "🐞", "달팽이": "🐌", "고양이": "🐱", "거미": "🕷️",
  "박새": "🐦", "꿀벌": "🐝", "공벌레": "🪲", "개": "🐶",
  "나비": "🦋", "참새": "🐤", "토끼": "🐰", "호랑이": "🐯",
  "뱀": "🐍", "개미": "🐜", "노루": "🦌", "딱따구리": "🪶",
  "붕어": "🐟", "수달": "🦦", "다슬기": "🌀", "송사리": "🐠",
  "메기": "🐡", "개구리": "🐸", "청둥오리": "🦆", "왜가리": "🦢",
  "갈매기": "🕊️", "조개": "🦪", "게": "🦀", "소라": "🐚",
  "돌돔": "🐟", "해삼": "🥒", "돌고래": "🐬", "바다거북": "🐢",
  "낙타": "🐫", "사막여우": "🦊", "사막 뱀": "🐍", "도루묵도마뱀": "🦎",
  "북극곰": "🐻", "북극여우": "🦊", "펭귄": "🐧", "산양": "🐐"
};

/**
 * 지역 정의.
 * x0~x1: 지역이 차지하는 타일 범위. 지역 사이에는 울타리 문(gateX)이 있습니다.
 * spawns: 이 지역에서 만나는 동물과 위치(타일 좌표)·관찰 힌트.
 */
export const regions = [
  {
    id: "around",
    name: "우리 주변 마을",
    short: "마을",
    emoji: "🏡",
    x0: 1,
    x1: 23,
    theme: "village",
    intro: "학교와 집 주변, 가까운 곳부터 천천히 관찰해요.",
    spawns: [
      { id: "무당벌레", tx: 16, ty: 6, zone: "꽃밭", tip: "풀잎 위를 살펴보세요" },
      { id: "꿀벌", tx: 20, ty: 8, zone: "꽃밭", tip: "꽃 주위에서 붕붕" },
      { id: "달팽이", tx: 4, ty: 11, zone: "그늘", tip: "축축한 그늘을 보세요" },
      { id: "박새", tx: 13, ty: 21, zone: "나무 곁", tip: "나뭇가지를 올려다봐요" },
      { id: "고양이", tx: 8, ty: 19, zone: "집 앞", tip: "골목을 조용히 걸어요" },
      { id: "개", tx: 14, ty: 25, zone: "마당", tip: "마당에서 반겨줘요" },
      { id: "공벌레", tx: 5, ty: 28, zone: "돌 밑", tip: "돌을 살짝 들춰봐요" },
      { id: "거미", tx: 20, ty: 28, zone: "울타리", tip: "울타리 구석 거미줄" }
    ]
  },
  {
    id: "land",
    name: "땅 위 숲",
    short: "숲",
    emoji: "🌳",
    x0: 25,
    x1: 47,
    theme: "forest",
    intro: "나무가 우거진 숲! 땅에서 사는 동물을 찾아요.",
    spawns: [
      { id: "나비", tx: 28, ty: 6, zone: "풀꽃밭", tip: "꽃 사이를 팔랑팔랑" },
      { id: "참새", tx: 34, ty: 5, zone: "나무 위", tip: "짹짹 소리를 따라가요" },
      { id: "딱따구리", tx: 43, ty: 7, zone: "큰 나무", tip: "나무 두드리는 소리!" },
      { id: "개미", tx: 30, ty: 12, zone: "땅바닥", tip: "줄지어 가는 길을 봐요" },
      { id: "뱀", tx: 40, ty: 12, zone: "수풀", tip: "수풀을 조심조심" },
      { id: "토끼", tx: 29, ty: 22, zone: "풀밭", tip: "긴 귀가 쫑긋" },
      { id: "노루", tx: 37, ty: 26, zone: "숲 안쪽", tip: "조용히 다가가요" },
      { id: "호랑이", tx: 44, ty: 29, zone: "깊은 숲", tip: "숲의 왕을 만나요" }
    ]
  },
  {
    id: "freshwater",
    name: "강과 호수",
    short: "강·호수",
    emoji: "💧",
    x0: 49,
    x1: 71,
    theme: "river",
    intro: "맑은 강과 호수! 물에서 사는 동물을 만나요.",
    spawns: [
      { id: "왜가리", tx: 55, ty: 5, zone: "강가", tip: "긴 다리로 서 있어요" },
      { id: "청둥오리", tx: 64, ty: 8, zone: "물가", tip: "물 위에 둥둥" },
      { id: "수달", tx: 52, ty: 12, zone: "강가 바위", tip: "미끄럼을 좋아해요" },
      { id: "다슬기", tx: 53, ty: 22, zone: "얕은 물가", tip: "물속 바닥을 봐요" },
      { id: "개구리", tx: 51, ty: 27, zone: "연잎 옆", tip: "폴짝! 소리를 들어요" },
      { id: "붕어", tx: 68, ty: 24, zone: "호수 동쪽", tip: "물결을 살펴봐요" },
      { id: "송사리", tx: 69, ty: 28, zone: "얕은 곳", tip: "작은 물고기 떼" },
      { id: "메기", tx: 66, ty: 31, zone: "깊은 곳", tip: "수염이 길어요" }
    ]
  },
  {
    id: "sea",
    name: "바닷가",
    short: "바다",
    emoji: "🌊",
    x0: 73,
    x1: 95,
    theme: "beach",
    intro: "짭짤한 바닷바람! 갯벌과 바다 동물을 찾아요.",
    spawns: [
      { id: "갈매기", tx: 76, ty: 7, zone: "바닷바람 언덕", tip: "끼룩끼룩 하늘을 봐요" },
      { id: "게", tx: 77, ty: 19, zone: "모래밭", tip: "옆으로 걸어 다녀요" },
      { id: "조개", tx: 83, ty: 18, zone: "갯벌", tip: "모래를 파 보세요" },
      { id: "소라", tx: 89, ty: 19, zone: "갯벌", tip: "나선 껍데기를 찾아요" },
      { id: "돌고래", tx: 80, ty: 20, zone: "물가", tip: "물 위로 점프!" },
      { id: "바다거북", tx: 86, ty: 20, zone: "물가", tip: "천천히 헤엄쳐요" },
      { id: "돌돔", tx: 92, ty: 20, zone: "물가 바위", tip: "줄무늬가 보여요" },
      { id: "해삼", tx: 94, ty: 18, zone: "바위 틈", tip: "바다의 오이!" }
    ]
  },
  {
    id: "special",
    name: "특별한 환경",
    short: "사막·극지",
    emoji: "❄️",
    x0: 97,
    x1: 118,
    theme: "extreme",
    intro: "뜨거운 사막과 차가운 극지방! 특별한 동물을 만나요.",
    spawns: [
      { id: "낙타", tx: 100, ty: 7, zone: "사막 언덕", tip: "혹이 두 개? 한 개?" },
      { id: "사막여우", tx: 104, ty: 11, zone: "사막", tip: "큰 귀가 매력 포인트" },
      { id: "사막 뱀", tx: 99, ty: 22, zone: "모래밭", tip: "옆으로 스르륵" },
      { id: "도루묵도마뱀", tx: 103, ty: 27, zone: "모래 속", tip: "모래에 숨어 있어요" },
      { id: "북극곰", tx: 111, ty: 8, zone: "빙하", tip: "하얀 털의 왕" },
      { id: "북극여우", tx: 115, ty: 12, zone: "눈밭", tip: "귀가 작아요" },
      { id: "펭귄", tx: 112, ty: 25, zone: "얼음 물가", tip: "뒤뚱뒤뚱 걸어요" },
      { id: "산양", tx: 116, ty: 28, zone: "바위 절벽", tip: "절벽을 잘 올라요" }
    ]
  }
];

/** 지역 사이 울타리 문 — from 지역의 배지를 얻으면 to 지역으로 가는 문이 열립니다 */
export const gates = [
  { x: 24, from: "around", to: "land" },
  { x: 48, from: "land", to: "freshwater" },
  { x: 72, from: "freshwater", to: "sea" },
  { x: 96, from: "sea", to: "special" }
];

export const regionById = Object.fromEntries(regions.map((r) => [r.id, r]));

/** 플레이어 x(타일)로 현재 지역을 찾습니다 */
export function regionAtTile(tx) {
  for (const region of regions) {
    if (tx <= region.x1) return region;
  }
  return regions[regions.length - 1];
}

/** 전체 스폰 수 (도감 마스터 목표) */
export function totalSpawnCount() {
  return regions.reduce((sum, r) => sum + r.spawns.length, 0);
}
