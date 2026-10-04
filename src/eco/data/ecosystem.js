// 생태계 구성 요소 — 4학년 2학기 「생물과 환경」 1·2차시 (교과서 pp.36–41)
// 동물이 아닌 요소(식물·버섯·햇빛·공기·물·흙·돌)와, 지역마다 '생태 돋보기'로 살펴볼 자리를 적습니다.
// 요소 이름이 곧 id입니다 (animals.js와 같은 규칙).

/** 바구니 두 개 — 교과서 표기 그대로 씁니다. */
export const ECO_KINDS = {
  biotic: { label: "생물 요소", hint: "살아 있는 것" },
  abiotic: { label: "비생물 요소", hint: "살아 있지 않은 것" }
};

/**
 * kind: 어느 바구니가 정답인지.
 * why: 틀렸을 때 보여 주는 한 줄 이유 (정답 바구니 이름이 뒤에 붙습니다).
 * icon: 돋보기 그림을 못 찍었을 때만 쓰는 대체 그림.
 */
export const ecoElements = {
  햇빛: { kind: "abiotic", icon: "☀️", why: "햇빛은 살아 있지 않아요" },
  공기: { kind: "abiotic", icon: "🍃", why: "공기는 움직여도 살아 있지 않아요" },
  물: { kind: "abiotic", icon: "💧", why: "물은 흘러도 살아 있지 않아요" },
  흙: { kind: "abiotic", icon: "🟤", why: "흙은 살아 있지 않아요" },
  돌: { kind: "abiotic", icon: "🪨", why: "돌은 살아 있지 않아요" },
  꽃: { kind: "biotic", icon: "🌼", why: "꽃은 살아 있는 식물이에요" },
  나무: { kind: "biotic", icon: "🌳", why: "나무는 살아 있는 식물이에요" },
  풀: { kind: "biotic", icon: "🌿", why: "풀은 살아 있는 식물이에요" },
  갈대: { kind: "biotic", icon: "🌾", why: "갈대는 살아 있는 식물이에요" },
  버섯: { kind: "biotic", icon: "🍄", why: "버섯은 자라는 생물이에요" },
  미역: { kind: "biotic", icon: "🌱", why: "미역은 자라는 생물이에요" }
};

/** 어느 생태계에나 있는 비생물 요소 (교과서 p.41 생각 넓히기) */
export const COMMON_ABIOTIC = ["햇빛", "공기", "물", "흙"];

/**
 * 지역별 살펴볼 자리. tx·ty는 타일 좌표(소수 가능)로, 배경 그림 속 실제 물체 위에 둡니다.
 * note: 카드에 적는 한 줄 (어디에서 어떤 모습인지).
 * draw: 배경 그림에 없는 것만 코드로 그려 넣습니다 — sunbeam · wind · puddle · seaweed.
 * 특별한 환경(special)은 교과서 쪽수 밖이라 넣지 않습니다.
 */
export const ecoRegions = {
  around: {
    label: "마을 생태계",
    spots: [
      { id: "꽃", tx: 20.5, ty: 6.7, note: "화단에 피어 있어요" },
      { id: "흙", tx: 18.1, ty: 7.5, note: "화단을 덮고 있어요" },
      { id: "나무", tx: 11.4, ty: 8.9, note: "마을에 서 있는 큰 나무" },
      { id: "풀", tx: 11.3, ty: 28.3, note: "풀밭에 자라요" },
      { id: "돌", tx: 3.7, ty: 19.8, note: "풀밭에 놓여 있어요" },
      { id: "물", tx: 16.5, ty: 12.4, note: "비가 와서 고였어요", draw: "puddle" },
      { id: "햇빛", tx: 9.5, ty: 2.6, note: "환하게 비춰요", draw: "sunbeam" },
      { id: "공기", tx: 19.5, ty: 21.0, note: "바람으로 느낄 수 있어요", draw: "wind" }
    ]
  },
  land: {
    label: "숲 생태계",
    spots: [
      { id: "나무", tx: 36.6, ty: 5.1, note: "열매가 달려 있어요" },
      { id: "버섯", tx: 29.4, ty: 6.7, note: "나무 곁에 돋아 있어요" },
      { id: "풀", tx: 34.6, ty: 6.7, note: "숲 바닥에 자라요" },
      { id: "돌", tx: 32.5, ty: 25.6, note: "이끼가 덮여 있어요" },
      { id: "흙", tx: 39.5, ty: 16.2, note: "숲길을 이루고 있어요" },
      { id: "물", tx: 40.7, ty: 18.4, note: "숲속에 고여 있어요", draw: "puddle" },
      { id: "햇빛", tx: 30.6, ty: 2.2, note: "나무 사이로 비춰요", draw: "sunbeam" },
      { id: "공기", tx: 26.8, ty: 29.0, note: "바람으로 느낄 수 있어요", draw: "wind" }
    ]
  },
  freshwater: {
    label: "강 생태계",
    spots: [
      { id: "갈대", tx: 66.5, ty: 21.2, note: "물가에 자라요" },
      { id: "꽃", tx: 68.6, ty: 3.6, note: "강가 풀밭에 피어 있어요" },
      { id: "물", tx: 61.2, ty: 9.6, note: "강을 따라 흘러요" },
      { id: "돌", tx: 61.9, ty: 20.5, note: "물가에 놓여 있어요" },
      { id: "흙", tx: 54.5, ty: 15.5, note: "강가 길을 이루고 있어요" },
      { id: "햇빛", tx: 69.3, ty: 11.6, note: "강물 위까지 비춰요", draw: "sunbeam" },
      { id: "공기", tx: 54.6, ty: 19.2, note: "바람으로 느낄 수 있어요", draw: "wind" }
    ]
  },
  sea: {
    label: "바다 생태계",
    spots: [
      { id: "미역", tx: 90.5, ty: 22.4, note: "바닷속에서 자라요", draw: "seaweed" },
      { id: "풀", tx: 89.2, ty: 8.0, note: "바닷가 언덕에 자라요" },
      { id: "물", tx: 82.5, ty: 21.3, note: "바닷물이 밀려와요" },
      { id: "돌", tx: 84.6, ty: 19.1, note: "모래밭에 놓여 있어요" },
      { id: "흙", tx: 78.5, ty: 18.4, note: "바닷가를 덮은 모래흙" },
      { id: "햇빛", tx: 92.5, ty: 10.5, note: "바다 위까지 비춰요", draw: "sunbeam" },
      { id: "공기", tx: 77.5, ty: 10.5, note: "바닷바람으로 느껴요", draw: "wind" }
    ]
  }
};

/** 정답 판정과 틀렸을 때 이유가 함께 쓰는 단 하나의 기준 */
export function ecoKindOf(elementId) {
  return ecoElements[elementId]?.kind || null;
}

export function ecoSpotsOf(regionId) {
  return ecoRegions[regionId]?.spots || [];
}
