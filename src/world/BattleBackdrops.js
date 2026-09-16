import aroundArt from "../assets/detailed-pixel/battle-around.webp?url";
import landArt from "../assets/detailed-pixel/battle-land.webp?url";
import freshwaterArt from "../assets/detailed-pixel/battle-freshwater.webp?url";
import seaArt from "../assets/detailed-pixel/battle-sea.webp?url";
import desertArt from "../assets/detailed-pixel/battle-desert.webp?url";
import alpineArt from "../assets/detailed-pixel/battle-alpine.webp?url";
import polarArt from "../assets/detailed-pixel/battle-polar.webp?url";

const BACKDROPS = Object.fromEntries([
  ["around", aroundArt, 0xe5edd6, 0x6f8c49],
  ["land", landArt, 0xacc8ad, 0x416951],
  ["freshwater", freshwaterArt, 0xc8e8e0, 0x5d8c72],
  ["sea", seaArt, 0xc0eced, 0x80b8bd],
  ["desert", desertArt, 0xf3d797, 0xdab06c],
  // 원본 이미지에서 산양 발판으로 쓸 낮은 바위 평탄면의 세로 비율입니다.
  ["alpine", alpineArt, 0xcbdde5, 0x86968a, 0.53],
  ["polar", polarArt, 0xd9f0f4, 0xc6e7e8]
].map(([environment, url, sky, ground, groundLine]) => [environment, {
  key: `battle-background-${environment}`, url, sky, ground, groundLine
}]));

export function battleBackdropFor(regionId, animalId) {
  if (regionId === "special") {
    if (animalId === "산양") return BACKDROPS.alpine;
    if (["북극곰", "북극여우", "펭귄"].includes(animalId)) return BACKDROPS.polar;
    return BACKDROPS.desert;
  }
  return BACKDROPS[regionId] || BACKDROPS.around;
}
