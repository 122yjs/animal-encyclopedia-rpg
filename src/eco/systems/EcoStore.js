// 생태계 확장팩 진행 기록 — 지역마다 생태 돋보기로 찾아 바구니에 넣은 요소
// 기본판 저장 키와 따로 둡니다. 확장팩은 주소(오리진)도 달라 기본판 기록과 섞이지 않습니다.
import { ecoRegions } from "../data/ecosystem.js";

export const ECO_KEY = "animal-encyclopedia-eco-v1";

function readState() {
  try {
    if (typeof localStorage === "undefined") return { found: {} };
    const data = JSON.parse(localStorage.getItem(ECO_KEY) || "{}");
    const found = data && typeof data.found === "object" && data.found ? data.found : {};
    return { found };
  } catch {
    return { found: {} };
  }
}

function writeState(state) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(ECO_KEY, JSON.stringify(state));
  } catch {
    console.warn("생태계 기록을 저장할 수 없어요.");
  }
}

/** 지역에서 찾은 요소 id 목록. 지금 데이터에 있는 자리만 셉니다. */
export function foundIn(regionId) {
  const spots = new Set((ecoRegions[regionId]?.spots || []).map((spot) => spot.id));
  const list = readState().found[regionId];
  return Array.isArray(list) ? list.filter((id) => spots.has(id)) : [];
}

export function isFound(regionId, elementId) {
  return foundIn(regionId).includes(elementId);
}

export function markFound(regionId, elementId) {
  const state = readState();
  const list = new Set(foundIn(regionId));
  list.add(elementId);
  state.found[regionId] = [...list];
  writeState(state);
}

/** 지역 생태계 보드 현황 { count, target, complete }. 보드가 없는 지역은 target 0입니다. */
export function boardStatus(regionId) {
  const target = ecoRegions[regionId]?.spots.length || 0;
  const count = foundIn(regionId).length;
  return { count, target, complete: target > 0 && count >= target };
}

/** 생태 돋보기를 한 번이라도 써 봤는지 — 첫 안내와 개념어 굵게 표시에 씁니다. */
export function hasAnyFound() {
  return Object.keys(ecoRegions).some((regionId) => foundIn(regionId).length > 0);
}
