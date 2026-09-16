// 월드맵 허브 — 지형 지도에서 현재 위치와 목적지를 구분해 탐험합니다.
import Phaser from "phaser/dist/phaser-arcade-physics.min.js";
import worldMapUrl from "../assets/detailed-pixel/world-map.webp?url";
import { regions } from "../data/regions.js";
import { createScreen, createElement, createButton } from "../ui/ScreenUi.js";
import { masterStatus, regionStatus, hasBadge } from "../systems/ProgressStore.js";
import { REGION_ART } from "../world/WorldMap.js";
import { GENERATED_ANIMAL_ATLASES, preloadAnimalAtlases, createAnimalTextures } from "../world/AnimalSprites.js";
import "../ui/navigation-screen.css";

const PLAYER_ART = new URL(`${import.meta.env.BASE_URL}assets/sprout-lands/sprites/Characters/Basic Charakter Spritesheet.png`, document.baseURI).href;

/** 탐험(오버월드) 전에 받아 둘 그림 — 지역 배경 5장 + 동물 아틀라스 5장. */
const EXPLORATION_KEYS = [
  ...REGION_ART.map(({ key }) => key),
  ...GENERATED_ANIMAL_ATLASES.map((atlas) => atlas.key)
];

const ORDER_LABELS = {
  around: "우리 주변",
  land: "땅",
  freshwater: "강·호수",
  sea: "바다",
  special: "특별한 환경"
};

const STOP_LABELS = {
  around: "마을",
  land: "숲",
  freshwater: "강·호수",
  sea: "바다",
  special: "특별한 환경"
};

// 부모 계약 좌표(0~1). 노드·경로·이동이 같은 지점을 씁니다.
const LANDMARKS = {
  around: { x: 0.10, y: 0.66 },
  land: { x: 0.29, y: 0.42 },
  freshwater: { x: 0.50, y: 0.63 },
  sea: { x: 0.70, y: 0.39 },
  special: { x: 0.90, y: 0.57 }
};

let sessionCurrentRegionId = "around";

function validRegionId(regionId) {
  return regions.some((region) => region.id === regionId) ? regionId : null;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function landmarkPercent(regionId) {
  const point = LANDMARKS[regionId] || LANDMARKS.around;
  return { x: point.x * 100, y: point.y * 100 };
}

function regionIndex(regionId) {
  const index = regions.findIndex((region) => region.id === regionId);
  return index < 0 ? 0 : index;
}

function routeIds(fromId, toId) {
  const from = regionIndex(fromId);
  const to = regionIndex(toId);
  const ids = [];
  const step = from <= to ? 1 : -1;
  for (let index = from; index !== to; index += step) ids.push(regions[index].id);
  ids.push(regions[to].id);
  return ids;
}

function windingPath(ids) {
  if (!ids.length) return "";
  const points = ids.map((id) => landmarkPercent(id));
  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy) || 1;
    const side = index % 2 === 0 ? -1 : 1;
    const ox = (-dy / length) * 8 * side;
    const oy = (dx / length) * 8 * side;
    const c1x = start.x + dx * 0.32 + ox;
    const c1y = start.y + dy * 0.32 + oy;
    const c2x = start.x + dx * 0.68 + ox;
    const c2y = start.y + dy * 0.68 + oy;
    path += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  }
  return path;
}

function svgPath(className, pathId) {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("class", className);
  path.setAttribute("fill", "none");
  path.setAttribute("vector-effect", "non-scaling-stroke");
  if (pathId) path.id = pathId;
  return path;
}

export default class WorldMapScene extends Phaser.Scene {
  constructor() {
    super("WorldMapScene");
  }

  init(data = {}) {
    const arrived = validRegionId(data.currentRegionId);
    if (arrived) sessionCurrentRegionId = arrived;
    this.currentRegionId = validRegionId(sessionCurrentRegionId) || "around";
    sessionCurrentRegionId = this.currentRegionId;
    this.requestedRegionId = validRegionId(data.selectedRegionId);
  }

  create() {
    this._starting = false;
    this.explorationLoad = null;
    this.traveling = false;
    this.travelGen = 0;
    this.travelRaf = 0;
    this.orderDialogOpen = false;
    this.orderDialogTargetId = null;
    // Phaser는 Scene 인스턴스를 재사용하므로 새 DOM에 이전 stage 측정값을 쓰지 않습니다.
    this._fitW = null;
    this._fitH = null;
    this._fitMode = null;
    this._mapAligned = false;
    this.cameras.main.setBackgroundColor(0xaccec1);

    const master = masterStatus();
    this.missionRegionId = this.pickMissionRegion();
    this.selectedRegionId = this.requestedRegionId || this.currentRegionId;

    this.ui = createScreen(this, {
      label: "동물도감 월드맵",
      className: "nav-map",
      onEscape: () => {
        if (this.traveling) return;
        if (this.orderDialogOpen) this.closeOrderDialog({ restoreMission: true });
      }
    });
    this.ui.root.style.setProperty("--nav-player", `url("${PLAYER_ART}")`);
    this.ui.root.dataset.currentRegion = this.currentRegionId;
    this.ui.root.dataset.selectedRegion = this.selectedRegionId;
    this.ui.root.dataset.traveling = "false";

    const header = createElement("header", "ui-header nav-map-header");
    header.id = "world-map";
    header.append(
      createElement("h1", "", "동물도감 월드맵"),
      createElement("p", "ui-muted", `도감 ${master.count}/${master.target}`)
    );

    this.viewport = createElement("div", "nav-map-viewport");
    this.viewport.id = "world-map-viewport";
    this.viewport.tabIndex = 0;
    this.viewport.setAttribute("role", "region");
    this.viewport.setAttribute("aria-label", "다섯 서식지가 이어진 지형 탐험 지도. 화살표 또는 아래 지역 버튼으로 서식지를 고릅니다.");

    this.stage = createElement("div", "nav-map-stage");
    this.stage.id = "world-map-stage";

    const art = document.createElement("img");
    art.className = "nav-map-art";
    art.id = "world-map-art";
    art.src = worldMapUrl;
    art.alt = "마을, 숲, 강과 호수, 바다, 사막·고산·북쪽 빙하가 이어진 탐험 지도";
    art.width = 1672;
    art.height = 941;
    art.draggable = false;
    this.mapArt = art;

    const route = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    route.setAttribute("class", "nav-map-route");
    route.id = "world-map-route";
    route.setAttribute("viewBox", "0 0 100 100");
    route.setAttribute("preserveAspectRatio", "none");
    route.setAttribute("aria-hidden", "true");
    this.donePath = svgPath("nav-map-route-done", "world-map-route-done");
    this.futurePath = svgPath("nav-map-route-future", "world-map-route-future");
    this.activePath = svgPath("nav-map-route-active", "world-map-route-active");
    route.append(this.donePath, this.futurePath, this.activePath);

    const nodes = createElement("div", "nav-map-nodes");
    this.nodeButtons = regions.map((region) => {
      const point = landmarkPercent(region.id);
      const button = createButton("", () => this.selectRegion(region.id), { className: "nav-map-node" });
      button.id = `world-map-region-${region.id}`;
      button.dataset.regionId = region.id;
      button.style.left = `${point.x}%`;
      button.style.top = `${point.y}%`;
      button.setAttribute("aria-pressed", "false");
      const pin = createElement("span", "nav-map-node-pin");
      pin.setAttribute("aria-hidden", "true");
      const copy = createElement("span", "nav-map-node-copy");
      copy.append(
        createElement("span", "nav-map-node-label", region.id === "special" ? "특별 환경" : STOP_LABELS[region.id]),
        createElement("span", "nav-map-node-state")
      );
      button.append(pin, copy);
      nodes.append(button);
      return button;
    });

    this.marker = createElement("div", "nav-map-marker");
    this.marker.id = "world-map-marker";
    this.marker.dataset.moving = "false";
    this.marker.dataset.facing = "down";
    this.marker.setAttribute("aria-hidden", "true");
    this.placeMarker(this.currentRegionId);

    this.stage.append(art, route, nodes, this.marker);
    this.viewport.append(this.stage);
    this.applyMapSize = () => this.fitMapStage();
    art.addEventListener("load", this.applyMapSize);
    if (art.complete) this.applyMapSize();

    const dock = createElement("footer", "nav-dock");
    dock.id = "world-map-dock";

    const stops = createElement("nav", "nav-stops");
    stops.id = "world-map-stops";
    stops.setAttribute("aria-label", "다섯 서식지 경로");
    this.stopButtons = regions.map((region) => {
      const button = createButton(STOP_LABELS[region.id], () => this.selectRegion(region.id, { center: true }), {
        className: "nav-stop"
      });
      button.id = `world-map-stop-${region.id}`;
      button.dataset.regionId = region.id;
      button.setAttribute("aria-pressed", "false");
      stops.append(button);
      return button;
    });

    const detail = createElement("article", "ui-card nav-detail");
    this.detailTitle = createElement("h2", "");
    this.detailMeta = createElement("p", "ui-muted nav-detail-meta");
    this.detailBody = createElement("p", "nav-detail-copy");
    detail.append(this.detailTitle, this.detailMeta, this.detailBody);

    const actions = createElement("div", "ui-actions");
    this.primaryButton = createButton("이 지역 탐험", () => this.startSelectedRegion(), { primary: true });
    this.primaryButton.id = "world-map-primary";
    this.dexButton = createButton("도감", () => this.openDex());
    this.dexButton.id = "world-map-dex";
    actions.append(this.primaryButton, this.dexButton);

    this.travelStatus = createElement("p", "nav-map-live");
    this.travelStatus.id = "world-map-travel-status";
    this.travelStatus.setAttribute("aria-live", "polite");
    dock.append(stops, detail, actions, this.travelStatus);

    this.dialog = createElement("div", "nav-dialog");
    this.dialog.id = "world-map-order-dialog";
    this.dialog.hidden = true;
    this.dialog.setAttribute("role", "dialog");
    this.dialog.setAttribute("aria-modal", "true");
    this.dialog.setAttribute("aria-labelledby", "world-map-order-title");
    const dialogCard = createElement("article", "ui-card nav-dialog-card");
    this.dialogTitle = createElement("h2", "", "이 지역으로 이동할까요?");
    this.dialogTitle.id = "world-map-order-title";
    this.dialogBody = createElement("p", "ui-muted");
    const dialogActions = createElement("div", "ui-actions");
    this.dialogConfirm = createButton("이 지역으로 이동", () => this.beginRegion(this.orderDialogTargetId), { primary: true });
    this.dialogConfirm.id = "world-map-order-confirm";
    this.dialogKeep = createButton("취소", () => this.closeOrderDialog({ restoreMission: true }));
    this.dialogKeep.id = "world-map-order-keep";
    dialogActions.append(this.dialogConfirm, this.dialogKeep);
    dialogCard.append(this.dialogTitle, this.dialogBody, dialogActions);
    this.dialog.append(dialogCard);

    this.shell = createElement("div", "nav-map-shell");
    this.shell.append(header, this.viewport, dock);
    this.ui.root.append(this.shell, this.dialog);
    this.ui.root.addEventListener("keydown", (event) => this.onMapKey(event));
    this.viewport.addEventListener("scroll", () => this.refreshOffscreen(), { passive: true });
    this.onViewportResize = () => this.fitMapStage();
    this.resizeObserver = new ResizeObserver(this.onViewportResize);
    this.resizeObserver.observe(this.viewport);
    this.events.once("shutdown", this.teardownMap, this);
    this.events.once("destroy", this.teardownMap, this);

    this.refreshSelection();
    this.fitMapStage();

    // 지역 배경 5장과 동물 아틀라스 5장은 지도에서 백그라운드로 받습니다 (타이틀은 기다리지 않습니다).
    this.ensureExplorationAssets();
  }

  teardownMap() {
    this.events.off("shutdown", this.teardownMap, this);
    this.events.off("destroy", this.teardownMap, this);
    this.cancelTravel();
    this.mapArt?.removeEventListener("load", this.applyMapSize);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  cancelTravel() {
    this.travelGen += 1;
    if (this.travelRaf) cancelAnimationFrame(this.travelRaf);
    this.travelRaf = 0;
    this.traveling = false;
    if (this.ui?.root?.isConnected) {
      this.ui.root.dataset.traveling = "false";
      delete this.ui.root.dataset.travelFrom;
      delete this.ui.root.dataset.travelTo;
      this.ui.root.removeAttribute("aria-busy");
    }
    if (this.viewport) this.viewport.dataset.panning = "false";
    if (this.marker) this.marker.dataset.moving = "false";
    if (this.activePath) this.activePath.setAttribute("d", "");
  }

  isRegionUnlocked(index) {
    return index === 0 || hasBadge(regions[index - 1].id);
  }

  pickMissionRegion() {
    const nextRegion = regions.find((region, index) => this.isRegionUnlocked(index) && !regionStatus(region.id).complete);
    if (nextRegion) return nextRegion.id;
    const unlocked = regions.filter((_region, index) => this.isRegionUnlocked(index));
    return unlocked.at(-1)?.id || regions[0].id;
  }

  selectRegion(regionId, { center = true } = {}) {
    if (this._starting || this.traveling || this.orderDialogOpen) return;
    if (!validRegionId(regionId)) return;
    this.selectedRegionId = this.selectedRegionId === regionId && regionId !== this.missionRegionId
      ? this.missionRegionId
      : regionId;
    this.refreshSelection();
    if (center) this.centerOn(this.selectedRegionId);
  }

  regionMeta(region, index) {
    const status = regionStatus(region.id);
    const unlocked = this.isRegionUnlocked(index);
    const mission = region.id === this.missionRegionId;
    const parts = [`${status.count}/${status.target}`];
    if (status.complete) parts.push("수집 완료");
    if (hasBadge(region.id)) parts.push("배지 획득");
    return { status, unlocked, mission, summary: parts.join(" · ") };
  }

  placeMarker(regionId) {
    const point = landmarkPercent(regionId);
    this.marker.style.left = `${point.x}%`;
    this.marker.style.top = `${point.y}%`;
    this.marker.dataset.regionId = regionId;
    this.marker.dataset.x = String(point.x);
    this.marker.dataset.y = String(point.y);
  }

  fitMapStage() {
    const viewport = this.viewport;
    const stage = this.stage;
    if (!viewport || !stage || !this.ui?.root) return;
    const naturalW = this.mapArt?.naturalWidth || 1672;
    const naturalH = this.mapArt?.naturalHeight || 941;
    const ratio = naturalW / naturalH;
    this.ui.root.dataset.mapWidth = String(naturalW);
    this.ui.root.dataset.mapHeight = String(naturalH);

    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    if (!vw || !vh) return;

    const fitMode = window.innerHeight > window.innerWidth && vw <= 600 ? "portrait-zoom" : "contain";
    viewport.dataset.mapFit = fitMode;
    this.ui.root.dataset.mapFit = fitMode;
    viewport.style.overflow = fitMode === "portrait-zoom" ? "auto" : "hidden";

    let width = fitMode === "portrait-zoom" ? vw * 1.5 : vw;
    let height = width / ratio;
    if (fitMode === "contain" && height > vh) {
      height = vh;
      width = height * ratio;
    }

    const nextW = Math.round(width);
    const nextH = Math.round(height);
    if (this._fitW === nextW && this._fitH === nextH && this._fitMode === fitMode) {
      this.refreshOffscreen();
      return;
    }
    const previousW = this._fitW;
    const previousMode = this._fitMode;
    const previousCenterX = previousW ? (viewport.scrollLeft + vw / 2) / previousW : 0;
    this._fitW = nextW;
    this._fitH = nextH;
    this._fitMode = fitMode;
    stage.style.width = `${nextW}px`;
    stage.style.height = `${nextH}px`;
    if (fitMode === "portrait-zoom") {
      if (previousMode === fitMode && this._mapAligned) {
        viewport.scrollLeft = Math.max(0, previousCenterX * nextW - vw / 2);
      } else {
        this.centerOn(this.currentRegionId, { instant: true, force: true });
        this._mapAligned = true;
      }
    } else {
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    }
    this.refreshOffscreen();
  }

  revealPoint(point, { instant = false, force = false } = {}) {
    const viewport = this.viewport;
    if (!viewport || this._fitMode !== "portrait-zoom") return;
    const pad = 40;
    const x = this.stage.offsetLeft + this.stage.clientWidth * point.x;
    const y = this.stage.offsetTop + this.stage.clientHeight * point.y;
    const outside = x < viewport.scrollLeft + pad
      || x > viewport.scrollLeft + viewport.clientWidth - pad
      || y < viewport.scrollTop + pad
      || y > viewport.scrollTop + viewport.clientHeight - pad;
    if (!force && !outside) return;
    viewport.scrollTo({
      left: Math.max(0, x - viewport.clientWidth / 2),
      top: Math.max(0, y - viewport.clientHeight / 2),
      behavior: instant ? "auto" : "smooth"
    });
  }

  centerOn(regionId, options = {}) {
    this.revealPoint(LANDMARKS[regionId] || LANDMARKS.around, options);
    this.refreshOffscreen();
  }

  followMarker() {
    this.revealPoint({
      x: Number(this.marker.dataset.x) / 100,
      y: Number(this.marker.dataset.y) / 100
    }, { instant: true });
  }

  refreshOffscreen() {
    if (!this.viewport || !this.nodeButtons) return;
    const box = this.viewport.getBoundingClientRect();
    const pad = 12;
    this.nodeButtons.forEach((button, index) => {
      const rect = button.getBoundingClientRect();
      const visible = rect.right > box.left + pad
        && rect.left < box.right - pad
        && rect.bottom > box.top + pad
        && rect.top < box.bottom - pad;
      button.dataset.offscreen = visible ? "false" : "true";
      const stop = this.stopButtons[index];
      stop.dataset.offscreen = visible ? "false" : "true";
      stop.classList.toggle("is-offscreen", !visible);
    });
    const overflowing = this.viewport.scrollWidth > this.viewport.clientWidth + 2
      || this.viewport.scrollHeight > this.viewport.clientHeight + 2;
    this.viewport.dataset.mapOverflow = overflowing ? "true" : "false";
    this.ui.root.dataset.mapOverflow = overflowing ? "true" : "false";
  }

  setControlsDisabled(disabled) {
    [...this.nodeButtons, ...this.stopButtons, this.primaryButton, this.dexButton, this.dialogConfirm, this.dialogKeep]
      .forEach((button) => {
        button.disabled = disabled;
      });
  }

  refreshSelection() {
    const index = regionIndex(this.selectedRegionId);
    const region = regions[index] || regions[0];
    const selected = this.regionMeta(region, index);
    const currentIndex = regionIndex(this.currentRegionId);

    this.ui.root.dataset.currentRegion = this.currentRegionId;
    this.ui.root.dataset.selectedRegion = region.id;
    this.ui.root.dataset.missionRegion = this.missionRegionId;

    this.nodeButtons.forEach((button, buttonIndex) => {
      const item = regions[buttonIndex];
      const meta = this.regionMeta(item, buttonIndex);
      const isSelected = item.id === region.id;
      const isCurrent = item.id === this.currentRegionId;
      const behind = buttonIndex < currentIndex;
      const ahead = buttonIndex > currentIndex;
      button.classList.toggle("is-recommended", meta.mission);
      button.classList.toggle("is-complete", meta.status.complete);
      button.classList.toggle("is-optional", !meta.unlocked);
      button.classList.toggle("is-current", isCurrent);
      button.classList.toggle("is-selected", isSelected);
      button.classList.toggle("is-behind", behind);
      button.classList.toggle("is-ahead", ahead);
      button.setAttribute("aria-pressed", isSelected ? "true" : "false");
      if (isCurrent) button.setAttribute("aria-current", "location");
      else button.removeAttribute("aria-current");
      const state = isCurrent ? "현재 위치" : "";
      button.querySelector(".nav-map-node-state").textContent = state;
      button.setAttribute("aria-label", [item.name, state, meta.summary].filter(Boolean).join(", "));
    });

    this.stopButtons.forEach((button, buttonIndex) => {
      const item = regions[buttonIndex];
      const meta = this.regionMeta(item, buttonIndex);
      const isSelected = item.id === region.id;
      const isCurrent = item.id === this.currentRegionId;
      button.classList.toggle("is-current", isCurrent);
      button.classList.toggle("is-selected", isSelected);
      button.classList.toggle("is-behind", buttonIndex < currentIndex);
      button.classList.toggle("is-ahead", buttonIndex > currentIndex);
      button.classList.toggle("is-complete", regionStatus(item.id).complete);
      button.setAttribute("aria-pressed", isSelected ? "true" : "false");
      if (isCurrent) button.setAttribute("aria-current", "location");
      else button.removeAttribute("aria-current");
      button.setAttribute("aria-label", [item.name, isCurrent ? "현재 위치" : "", meta.summary].filter(Boolean).join(", "));
    });

    const doneIds = regions.slice(0, currentIndex + 1).map((item) => item.id);
    const futureIds = regions.slice(currentIndex).map((item) => item.id);
    this.donePath.setAttribute("d", windingPath(doneIds));
    this.futurePath.setAttribute("d", windingPath(futureIds));
    if (!this.traveling) this.activePath.setAttribute("d", "");

    this.detailTitle.textContent = region.name;
    this.detailMeta.textContent = selected.summary;
    this.detailBody.textContent = `${region.intro} ${selected.status.complete
      ? "이 지역의 동물을 모두 만났어요. 다시 둘러볼 수 있어요."
      : "동물 마커를 찾아 관찰 퀴즈 배틀에 도전하세요."}`;
    this.primaryButton.textContent = selected.status.complete
      ? `${region.short} 다시 탐험`
      : `${region.short} 탐험 시작`;
    this.refreshOffscreen();
  }

  onMapKey(event) {
    if (this._starting || this.traveling) return;
    if (this.orderDialogOpen) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      this.moveSelection(-1);
      return;
    }
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      this.moveSelection(1);
      return;
    }
    if (event.key === "d" || event.key === "D") {
      event.preventDefault();
      this.openDex();
      return;
    }
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest("#world-map-dex, #world-map-primary, #world-map-order-confirm, #world-map-order-keep")) return;
    event.preventDefault();
    const regionId = event.target.closest("[data-region-id]")?.dataset.regionId;
    if (regionId) {
      this.selectedRegionId = regionId;
      this.refreshSelection();
      this.centerOn(regionId, { instant: true });
    }
    this.startSelectedRegion();
  }

  moveSelection(direction) {
    if (this._starting || this.traveling || this.orderDialogOpen) return;
    const current = regionIndex(this.selectedRegionId);
    const next = Phaser.Math.Clamp(current + direction, 0, regions.length - 1);
    this.selectedRegionId = regions[next]?.id || regions[0].id;
    this.refreshSelection();
    this.centerOn(this.selectedRegionId);
    this.stopButtons[next]?.focus({ preventScroll: true });
  }

  openDex() {
    if (this._starting || this.traveling || this.orderDialogOpen) return;
    this._starting = true;
    this.ui?.destroy();
    this.scene.start("DexScene", {
      from: "WorldMapScene",
      regionId: this.selectedRegionId,
      currentRegionId: this.currentRegionId
    });
  }

  startSelectedRegion() {
    if (this._starting || this.traveling || this.orderDialogOpen) return;
    const index = regionIndex(this.selectedRegionId);
    if (!this.isRegionUnlocked(index)) {
      this.openOrderDialog(this.selectedRegionId);
      return;
    }
    this.beginRegion(this.selectedRegionId);
  }

  openOrderDialog(regionId) {
    const target = regions.find((region) => region.id === regionId);
    const mission = regions.find((region) => region.id === this.missionRegionId) || regions[0];
    if (!target || this.orderDialogOpen || this.traveling) return;
    this.orderDialogOpen = true;
    this.orderDialogTargetId = regionId;
    this.dialogBody.textContent = `권장 순서는 '${ORDER_LABELS[mission.id]}'입니다. '${ORDER_LABELS[target.id]}' 지역으로 이동할까요?`;
    this.dialog.hidden = false;
    this.shell.inert = true;
    this.dialogConfirm.focus();
  }

  closeOrderDialog({ restoreMission = false } = {}) {
    if (!this.orderDialogOpen && this.dialog.hidden) return;
    this.orderDialogOpen = false;
    this.orderDialogTargetId = null;
    this.dialog.hidden = true;
    this.shell.inert = false;
    if (restoreMission) this.selectedRegionId = this.missionRegionId;
    this.refreshSelection();
    this.stopButtons.find((button) => button.dataset.regionId === this.selectedRegionId)?.focus({ preventScroll: true });
  }

  /** 탐험 그림(지역 배경 5장 + 동물 아틀라스 5장)이 모두 준비됐는지 — 아직이거나 실패했으면 false. */
  readyForExploration() {
    return EXPLORATION_KEYS.every((key) => this.textures.exists(key));
  }

  /**
   * 탐험 그림을 받습니다 — 이미 받은 텍스처는 Phaser가 키 충돌로 건너뜁니다.
   * 받는 중이면 같은 약속을 돌려주어 같은 파일을 두 번 받지 않습니다.
   */
  ensureExplorationAssets() {
    if (this.explorationLoad) return this.explorationLoad;
    REGION_ART.forEach(({ key, url }) => this.load.image(key, url));
    preloadAnimalAtlases(this);
    this.explorationLoad = new Promise((resolve) => {
      this.load.once("complete", () => {
        const ready = this.readyForExploration();
        if (ready) createAnimalTextures(this);
        else this.explorationLoad = null; // 실패 — 다음 시도는 빠진 그림만 다시 받습니다
        resolve(ready);
      });
      this.load.start();
    });
    return this.explorationLoad;
  }

  /**
   * 탐험을 시작하기 전에 그림을 기다립니다. 기다리는 동안은 상태를 보여주고 조작을 잠급니다.
   * 못 받으면 지도를 다시 쓸 수 있게 되돌리고 false — 그림 없는 화면으로 넘어가지 않습니다.
   */
  async prepareExploration() {
    if (this.readyForExploration()) return true;
    this.setControlsDisabled(true);
    this.primaryButton.textContent = "탐험 그림 준비 중…";
    this.travelStatus.textContent = "탐험 그림을 준비하고 있어요";
    if (await this.ensureExplorationAssets()) return true;
    this.setControlsDisabled(false);
    this.refreshSelection();
    this.travelStatus.textContent = "탐험 그림을 받지 못했어요. 잠시 뒤 다시 시도해 주세요";
    return false;
  }

  async beginRegion(regionId) {
    if (this._starting || this.traveling || !validRegionId(regionId)) return;
    this.closeOrderDialog();
    const destination = regionId;
    const origin = this.currentRegionId;
    if (origin !== destination) {
      const moved = await this.animateTravel(origin, destination);
      if (!moved || !this.ui?.root?.isConnected) return;
    }
    this._starting = true; // 준비·전환 중에는 지도 조작을 잠급니다
    if (!(await this.prepareExploration())) {
      this._starting = false;
      return;
    }
    sessionCurrentRegionId = destination;
    this.currentRegionId = destination;
    this.ui?.destroy();
    this.scene.start("OverworldScene", { startRegionId: destination });
  }

  animateTravel(fromId, toId) {
    this.traveling = true;
    this.ui.root.dataset.traveling = "true";
    this.ui.root.dataset.travelFrom = fromId;
    this.ui.root.dataset.travelTo = toId;
    this.ui.root.setAttribute("aria-busy", "true");
    this.setControlsDisabled(true);
    this.travelStatus.textContent = `${ORDER_LABELS[fromId]}에서 ${ORDER_LABELS[toId]}(으)로 이동 중`;
    this.viewport.dataset.panning = "true";
    this.marker.dataset.moving = "true";

    if (prefersReducedMotion()) {
      this.placeMarker(toId);
      this.centerOn(toId, { instant: true });
      this.traveling = false;
      this.ui.root.dataset.traveling = "false";
      delete this.ui.root.dataset.travelFrom;
      delete this.ui.root.dataset.travelTo;
      this.ui.root.removeAttribute("aria-busy");
      this.viewport.dataset.panning = "false";
      this.marker.dataset.moving = "false";
      return Promise.resolve(true);
    }

    const ids = routeIds(fromId, toId);
    const origin = LANDMARKS[fromId] || LANDMARKS.around;
    const dest = LANDMARKS[toId] || LANDMARKS.around;
    this.marker.dataset.facing = Math.abs(dest.x - origin.x) >= Math.abs(dest.y - origin.y)
      ? (dest.x >= origin.x ? "right" : "left")
      : (dest.y >= origin.y ? "down" : "up");
    const path = windingPath(ids);
    this.activePath.setAttribute("d", path);
    const length = this.activePath.getTotalLength();
    const duration = 520 * Math.max(1, ids.length - 1);
    const gen = ++this.travelGen;
    const start = performance.now();

    return new Promise((resolve) => {
      const tick = (now) => {
        if (gen !== this.travelGen) {
          resolve(false);
          return;
        }
        const t = Math.min(1, (now - start) / duration);
        const point = this.activePath.getPointAtLength(length * t);
        this.marker.style.left = `${point.x}%`;
        this.marker.style.top = `${point.y}%`;
        this.marker.dataset.x = point.x.toFixed(2);
        this.marker.dataset.y = point.y.toFixed(2);
        this.followMarker();
        if (t < 1) {
          this.travelRaf = requestAnimationFrame(tick);
          return;
        }
        this.travelRaf = 0;
        this.placeMarker(toId);
        this.viewport.dataset.panning = "false";
        this.marker.dataset.moving = "false";
        this.traveling = false;
        this.ui.root.dataset.traveling = "false";
        this.ui.root.removeAttribute("aria-busy");
        resolve(true);
      };
      this.travelRaf = requestAnimationFrame(tick);
    });
  }
}
