// localStorage에 수집 동물·지역 배지를 저장하는 진행 관리자
import { animals, collectedIdAliases } from "../data/animals.js";
import { regions, regionById, REGION_ORDER, totalSpawnCount } from "../data/regions.js";

/** 구버전(레거시 도감)과 같은 키를 써서 수집 진행도를 이어받습니다 */
export const STORAGE_KEY = "animal-encyclopedia-collected-v1";
export const BADGE_KEY = "animal-encyclopedia-region-clear-v1";

const validIds = new Set(animals.map((a) => a.id));

function safeParseIds(raw) {
  try {
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((id) => collectedIdAliases[id] || id)
      .filter((id) => validIds.has(id));
  } catch {
    return [];
  }
}

function safeGetItem(key) {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    if (typeof localStorage === "undefined") return false;
    localStorage.setItem(key, value);
    return true;
  } catch {
    console.warn("진행 기록을 저장할 수 없어요.");
    return false;
  }
}

/** 수집한 동물 id 목록 */
export function readCollected() {
  return safeParseIds(safeGetItem(STORAGE_KEY));
}

export function saveCollected(ids) {
  const unique = [...new Set(ids)].filter((id) => validIds.has(id));
  safeSet(STORAGE_KEY, JSON.stringify(unique));
  return unique;
}

/** 동물을 도감에 등록합니다 */
export function collectAnimal(animalId) {
  const current = new Set(readCollected());
  current.add(animalId);
  return saveCollected([...current]);
}

export function isCollected(animalId) {
  return readCollected().includes(animalId);
}

// ─── 지역 배지 ────────────────────────────────────────────

function readBadgeMap() {
  try {
    const data = JSON.parse(safeGetItem(BADGE_KEY) || "{}");
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

export function hasBadge(regionId) {
  return Boolean(readBadgeMap()[regionId]);
}

export function awardBadge(regionId) {
  const data = readBadgeMap();
  data[regionId] = true;
  safeSet(BADGE_KEY, JSON.stringify(data));
}

export function badgeCount() {
  return REGION_ORDER.filter((id) => hasBadge(id)).length;
}

/** 지역 수집 현황 { count, target, complete } */
export function regionStatus(regionId) {
  const region = regionById[regionId];
  if (!region) return { count: 0, target: 0, complete: false };
  const collected = new Set(readCollected());
  const count = region.spawns.filter((s) => collected.has(s.id)).length;
  const target = region.spawns.length;
  return { count, target, complete: count >= target };
}

/**
 * 배지를 받을 자격이 생겼지만 아직 배지가 없는 지역을 찾습니다.
 * (오버월드로 돌아올 때 축하 연출 + 문 열기에 사용)
 */
export function findNewBadgeRegion() {
  for (const region of regions) {
    if (!hasBadge(region.id) && regionStatus(region.id).complete) {
      return region.id;
    }
  }
  return null;
}

/** 문이 열려 있는지 — 문의 from 지역 배지가 있으면 통과 가능 */
export function isGateOpen(fromRegionId) {
  return hasBadge(fromRegionId);
}

/** 전체 도감 진행 (마스터 판정) */
export function masterStatus() {
  const collected = new Set(readCollected());
  const spawnIds = regions.flatMap((r) => r.spawns.map((s) => s.id));
  const count = spawnIds.filter((id) => collected.has(id)).length;
  return {
    count,
    target: totalSpawnCount(),
    complete: count >= totalSpawnCount() && REGION_ORDER.every((id) => hasBadge(id))
  };
}

/** 처음부터 다시 시작 */
export function resetAll() {
  saveCollected([]);
  safeSet(BADGE_KEY, "{}");
}
