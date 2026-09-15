const ART = `${import.meta.env.BASE_URL}assets/detailed-pixel/`;

const BACKDROPS = Object.fromEntries([
  ["around", "battle-around.webp", 0xe5edd6, 0x6f8c49],
  ["land", "battle-land.webp", 0xacc8ad, 0x416951],
  ["freshwater", "battle-freshwater.webp", 0xc8e8e0, 0x5d8c72],
  ["sea", "battle-sea.webp", 0xc0eced, 0x80b8bd],
  ["desert", "battle-desert.webp", 0xf3d797, 0xdab06c],
  // 원본 이미지에서 산양 발판으로 쓸 낮은 바위 평탄면의 세로 비율입니다.
  ["alpine", "battle-alpine.webp", 0xcbdde5, 0x86968a, 0.53],
  ["polar", "battle-polar.webp", 0xd9f0f4, 0xc6e7e8]
].map(([environment, file, sky, ground, groundLine]) => [environment, {
  key: `battle-background-${environment}`, url: ART + file, sky, ground, groundLine
}]));

export function battleBackdropFor(regionId, animalId) {
  if (regionId === "special") {
    if (animalId === "산양") return BACKDROPS.alpine;
    if (["북극곰", "북극여우", "펭귄"].includes(animalId)) return BACKDROPS.polar;
    return BACKDROPS.desert;
  }
  return BACKDROPS[regionId] || BACKDROPS.around;
}
