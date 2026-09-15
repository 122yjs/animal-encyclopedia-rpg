// 오버월드 — 5개 서식지를 잇는 모험 맵
// 동물 마커에 닿으면 턴제 퀴즈 배틀로, 지역 동물을 모두 모으면 배지와 함께 다음 문이 열립니다.
import Phaser from "phaser/dist/phaser-arcade-physics.min.js";
import { TILE, MAP_H, PATH_Y, regions, regionAtTile, regionById, gates } from "../data/regions.js";
import { animalById } from "../data/animals.js";
import {
  isCollected,
  regionStatus,
  masterStatus,
  hasBadge,
  awardBadge,
  findNewBadgeRegion,
  isGateOpen
} from "../systems/ProgressStore.js";
import WorldMap from "../world/WorldMap.js";
import {
  ANIMAL_SOURCE_FACING,
  ensureAnimalAnimation,
  getAnimalFrame,
  isFlying
} from "../world/AnimalSprites.js";
import { KOREAN_FONT, playEmote } from "../ui/UiHelpers.js";
import {
  createButton,
  createCompletionBadge,
  createElement,
  showCompletionReward
} from "../ui/ScreenUi.js";
import { directionParticle } from "../systems/ObservationBuilder.js";
import "../ui/world-hud.css";

const PLAYER_SPEED = 150;
const SWIM_SPEED = 80;
const PLAYER_SCALE = 1.65;
const ENCOUNTER_WANDER_RADIUS = Object.freeze({
  land: 3,
  water: 4,
  shore: 6
});

/** 카메라 줌과 관계없이 화면에서 logicalPx로 읽히게 월드 폰트 크기를 맞춥니다. */
function screenFontSize(scene, logicalPx) {
  const zoom = scene.cameras.main?.zoom || 1;
  return `${Math.max(1, Math.round(logicalPx / zoom))}px`;
}

function hudHost() {
  return document.getElementById("ui-root") || document.body;
}

/** 뷰포트 가장자리 DOM HUD. createScreen을 쓰지 않아 월드 입력을 유지합니다. */
function createWorldHud({ onMap, onDex }) {
  document.querySelectorAll("[data-world-hud]").forEach((node) => node.remove());

  const root = createElement("div", "world-hud");
  root.dataset.worldHud = "1";

  const panel = createElement("section", "ui-card world-hud__panel");
  panel.setAttribute("aria-label", "탐험 상태");
  const regionEl = createElement("p", "world-hud__region");
  const countEl = createElement("p", "ui-muted world-hud__count");
  const badges = createElement("div", "world-hud__badges");
  const badgeEls = regions.map((region) => {
    const badge = createElement("span", "world-hud__badge", region.short);
    badge.title = region.name;
    badges.append(badge);
    return badge;
  });
  const masterReward = createElement("div", "world-hud__master");
  masterReward.hidden = true;
  masterReward.append(
    createCompletionBadge({ master: true }),
    createElement("span", "", "도감 마스터")
  );
  panel.append(regionEl, countEl, badges, masterReward);

  const actions = createElement("div", "ui-actions world-hud__actions");
  const mapBtn = createButton("지도", () => {
    releaseAll();
    mapBtn.blur();
    onMap();
  });
  mapBtn.name = "overworld-map";
  mapBtn.setAttribute("aria-label", "지도");
  const dexBtn = createButton("도감", () => {
    releaseAll();
    dexBtn.blur();
    onDex();
  }, { primary: true });
  dexBtn.name = "overworld-dex";
  dexBtn.setAttribute("aria-label", "도감");
  actions.append(mapBtn, dexBtn);

  // 아날로그 스틱: 반지름으로만 잡고, 방향은 360도 연속입니다. 4/8방향 칸은 쓰지 않습니다.
  const vector = { x: 0, y: 0 };
  const DEADZONE = 0.12;
  let pointerId = null;
  let originX = 0;
  let originY = 0;
  let travel = 1;

  const pad = createElement("button", "world-hud__pad");
  pad.type = "button";
  pad.dataset.virtualPad = "1";
  pad.setAttribute("aria-label", "이동 스틱. 키보드 화살표 또는 WASD로도 이동합니다.");
  const knob = createElement("span", "world-hud__pad-knob");
  knob.dataset.virtualPadKnob = "1";
  knob.setAttribute("aria-hidden", "true");
  pad.append(knob);

  const placeKnob = (dx, dy) => {
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const releaseAll = () => {
    vector.x = 0;
    vector.y = 0;
    pad.classList.remove("is-held");
    placeKnob(0, 0);
    const held = pointerId;
    pointerId = null;
    if (held != null && pad.hasPointerCapture?.(held)) {
      pad.releasePointerCapture(held);
    }
  };

  const captureGeometry = () => {
    const rect = pad.getBoundingClientRect();
    originX = rect.left + rect.width * 0.5;
    originY = rect.top + rect.height * 0.5;
    const knobSize = knob.getBoundingClientRect().width;
    travel = Math.max(1, (rect.width - knobSize) * 0.5);
  };

  const applyPointer = (event) => {
    let dx = event.clientX - originX;
    let dy = event.clientY - originY;
    const dist = Math.hypot(dx, dy);
    if (dist > travel) {
      dx = (dx / dist) * travel;
      dy = (dy / dist) * travel;
    }
    placeKnob(dx, dy);
    const mag = Math.hypot(dx, dy);
    const dead = travel * DEADZONE;
    if (mag <= dead) {
      vector.x = 0;
      vector.y = 0;
      return;
    }
    // 데드존 바깥부터 0, 가장자리에서 1이 되도록 밀린 거리를 다시 맞춰 줍니다.
    const scaled = (mag - dead) / (travel - dead);
    vector.x = (dx / mag) * scaled;
    vector.y = (dy / mag) * scaled;
  };

  pad.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!event.isPrimary || event.button > 0 || pointerId != null) return;
    pointerId = event.pointerId;
    pad.classList.add("is-held");
    captureGeometry();
    pad.setPointerCapture?.(event.pointerId);
    applyPointer(event);
  });
  pad.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointerId) return;
    event.preventDefault();
    if (event.pointerType === "mouse" && event.buttons === 0) {
      releaseAll();
      return;
    }
    applyPointer(event);
  });
  const onPointerEnd = (event) => {
    if (pointerId == null || event.pointerId !== pointerId) return;
    event.preventDefault();
    releaseAll();
  };
  pad.addEventListener("pointerup", onPointerEnd);
  pad.addEventListener("pointercancel", onPointerEnd);
  pad.addEventListener("lostpointercapture", onPointerEnd);
  pad.addEventListener("contextmenu", (event) => event.preventDefault());
  pad.addEventListener("keydown", (event) => {
    if (event.key === " " || event.key === "Enter") event.preventDefault();
  });

  const toast = createElement("div", "ui-card world-hud__toast");
  toast.hidden = true;
  const banner = createElement("div", "ui-card world-hud__banner");
  banner.hidden = true;
  root.append(panel, actions, pad, toast, banner);
  hudHost().append(root);

  const blockCanvas = (event) => event.stopPropagation();
  [panel, actions, pad, toast, banner].forEach((node) => {
    node.addEventListener("pointerdown", blockCanvas);
    node.addEventListener("pointerup", blockCanvas);
    node.addEventListener("click", blockCanvas);
  });

  const onBlur = () => releaseAll();
  const onVis = () => {
    if (document.hidden) releaseAll();
  };
  const onViewportChange = () => releaseAll();
  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("resize", onViewportChange);
  window.addEventListener("orientationchange", onViewportChange);

  let toastTimer = 0;
  let bannerTimer = 0;

  return {
    root,
    releasePad: releaseAll,
    getVector() {
      return vector;
    },
    refresh({ region, countText, badgesOn, master }) {
      regionEl.textContent = region.name;
      countEl.textContent = countText;
      badgeEls.forEach((node, i) => node.classList.toggle("is-off", !badgesOn[i]));
      masterReward.hidden = !master;
    },
    showToast(text, ms = 2300) {
      window.clearTimeout(toastTimer);
      toast.hidden = false;
      toast.textContent = text;
      toastTimer = window.setTimeout(() => {
        toast.hidden = true;
      }, ms);
    },
    showBanner(text) {
      window.clearTimeout(bannerTimer);
      banner.hidden = false;
      banner.textContent = text;
      bannerTimer = window.setTimeout(() => {
        banner.hidden = true;
      }, 1800);
    },
    destroy() {
      window.clearTimeout(toastTimer);
      window.clearTimeout(bannerTimer);
      releaseAll();
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("orientationchange", onViewportChange);
      root.remove();
    }
  };
}


function encounterSurface(animal) {
  if (!animal?.inWater) return "land";
  if (!animal.hasLegs && !animal.hasWings) return "water";
  return "shore";
}

export default class OverworldScene extends Phaser.Scene {
  constructor() {
    super("OverworldScene");
  }

  init(data = {}) {
    this.returnPos = data.returnPos || null;
    this.startRegionId = data.startRegionId || null;
    this.avoidEncounterId = data.avoidEncounterId || null;
  }

  create() {
    this.encounterLocked = false;
    this._navigating = false;
    this.celebrationRunning = false;
    this.celebrationGen = 0;
    this.completionReward = null;
    this.gateToastAt = 0;
    this.createdAt = this.time.now;
    this.encounterZones = [];

    try {
      this.world = new WorldMap(this, { isGateOpen });
      this.world.build();
      this.createPlayer();
      this.createNpcs();
      this.createEncounters();
      this.createGateSensors();
      this.createHud();
      this.setupInput();
      this.scale.on("resize", this.onGameResize, this);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardownWorldUi, this);
      this.events.once(Phaser.Scenes.Events.DESTROY, this.teardownWorldUi, this);
      this.time.delayedCall(350, () => this.checkCelebrations());
    } catch (error) {
      console.error("오버월드 생성 실패:", error);
      this.showFatalError(error);
    }
  }

  onGameResize(gameSize) {
    this.cameras.main.setSize(gameSize.width, gameSize.height);
  }

  teardownWorldUi() {
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.teardownWorldUi, this);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.teardownWorldUi, this);
    this.scale.off("resize", this.onGameResize, this);
    this.celebrationGen += 1;
    this.completionReward?.destroy?.();
    this.completionReward = null;
    this.hud?.releasePad?.();
    this.hud?.destroy?.();
    this.hud = null;
    this.pad = null;
  }

  showFatalError(error) {
    const { width, height } = this.cameras.main;
    this.add.rectangle(width / 2, height / 2, width, height, 0x5c536a, 0.92)
      .setScrollFactor(0).setDepth(9000);
    this.add.text(width / 2, height / 2 - 20, "맵을 불러오지 못했어요", {
      fontFamily: KOREAN_FONT, fontSize: screenFontSize(this, 16), color: "#f4ebc8"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(9001);
    this.add.text(width / 2, height / 2 + 20, String(error?.message || error), {
      fontFamily: KOREAN_FONT, fontSize: screenFontSize(this, 14), color: "#cbd784",
      wordWrap: { width: width - 40 }, align: "center"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(9001);
  }

  // ─── 플레이어 ───────────────────────────────────────────

  createPlayer() {
    const startRegion = regionById[this.startRegionId] || regions[0];
    const regionStartTile = startRegion.id === regions[0].id ? 8 : startRegion.x0 + 3;
    const startX = this.returnPos?.x ?? regionStartTile * TILE;
    const startY = this.returnPos?.y ?? (PATH_Y[0] + 1) * TILE;

    this.player = this.physics.add.sprite(startX, startY, "player", 0)
      .setScale(PLAYER_SCALE)
      .setName("overworld-player");
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(20);
    this.player.body.setSize(16, 12);
    this.player.body.setOffset(16, 30);

    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.lastDir = "down";
    // 잔물결은 한 번만 만들고, 수영 중에 위치·크기만 바꿉니다.
    this.swimRipple = this.add.ellipse(startX, startY + 10, 26, 8, 0xb7e4ef, 0.4)
      .setDepth(19)
      .setVisible(false);
    this.syncPlayerSurface(false);

    this.currentRegionId = regionAtTile(Math.floor(startX / TILE)).id;
  }

  /** 발밑 타일(발 Y = sprite.y+12)이 물이면 수영입니다. */
  playerFootInWater() {
    return this.world.isWaterTile(
      Math.floor(this.player.x / TILE),
      Math.floor((this.player.y + 12) / TILE)
    );
  }

  /** 물/땅 전환: crop·잔물결·수영/걷기 애니메이션을 한곳에서 맞춥니다. */
  syncPlayerSurface(moving) {
    const swimming = this.playerFootInWater();
    if (swimming) {
      if (this.player.isCropped === false) this.player.setCrop(0, 0, 48, 29);
      this.player.anims.play(`swim-${this.lastDir}`, true);
    } else {
      if (this.player.isCropped) this.player.setCrop();
      this.player.anims.play(`${moving ? "walk" : "idle"}-${this.lastDir}`, true);
    }
    this.syncSwimRipple(swimming);
  }

  /** 잔물결 타원은 재할당하지 않고 수영 자세 프레임에 맞춰 갱신합니다. */
  syncSwimRipple(swimming) {
    const ripple = this.swimRipple;
    if (!ripple?.active) return;
    if (!swimming) {
      ripple.setVisible(false);
      return;
    }
    const frame = Number(this.player.anims.currentFrame?.textureFrame ?? 0);
    const kicked = frame % 2 === 1;
    ripple.setVisible(true);
    ripple.setPosition(this.player.x, this.player.y + 10);
    ripple.setScale(kicked ? 1.14 : 0.88, kicked ? 0.95 : 1.05);
  }

  // ─── 마을 NPC (분위기용) ─────────────────────────────────

  createNpcs() {
    this.makeNpc("chicken", 8, 10, { x0: 4, y0: 9, x1: 11, y1: 13 }, 26);
    this.makeNpc("chicken", 10, 12, { x0: 4, y0: 10, x1: 11, y1: 13 }, 26);
    this.makeNpc("cow", 12, 13, { x0: 9, y0: 11, x1: 13, y1: 14 }, 44);
  }

  makeNpc(kind, tx, ty, rect, size) {
    const key = kind === "cow" ? "npc-cow" : "npc-chicken";
    if (!this.textures.exists(key)) return;
    const { x, y } = this.world.tileCenter(tx, ty);
    const npc = this.add.sprite(x, y, key, 0).setDepth(12).setDisplaySize(size, size);
    npc.play(`${kind}-idle`);

    const wander = () => {
      if (!npc.active) return;
      const nx = Phaser.Math.Between(rect.x0, rect.x1) * TILE + TILE / 2;
      const ny = Phaser.Math.Between(rect.y0, rect.y1) * TILE + TILE / 2;
      const dist = Phaser.Math.Distance.Between(npc.x, npc.y, nx, ny);
      npc.setFlipX(nx > npc.x); // 원본이 왼쪽을 보는 스프라이트
      npc.play(`${kind}-walk`);
      this.tweens.add({
        targets: npc,
        x: nx,
        y: ny,
        duration: Math.max(700, dist * 22),
        ease: "Sine.easeInOut",
        onComplete: () => {
          if (!npc.active) return;
          npc.play(`${kind}-idle`);
          this.time.delayedCall(Phaser.Math.Between(1200, 3200), wander);
        }
      });
    };
    this.time.delayedCall(Phaser.Math.Between(600, 2000), wander);
  }

  // ─── 동물 조우 마커 ──────────────────────────────────────

  createEncounters() {
    regions.forEach((region) => {
      region.spawns.forEach((spawn) => {
        const animal = animalById[spawn.id];
        if (!animal) return;
        // 물속 스폰에 육상 통행 구멍을 만들지 않습니다.
        if (!this.world.isWaterTile(spawn.tx, spawn.ty)) this.world.unblock(spawn.tx, spawn.ty);
        this.buildMarker(region, spawn, isCollected(spawn.id));
      });
    });
  }

  buildMarker(region, spawn, collected) {
    const animal = animalById[spawn.id];
    const surface = encounterSurface(animal);
    const wanderTiles = this.collectEncounterWanderTiles(region, spawn, surface);
    const startTile = this.pickEncounterStartTile(spawn, wanderTiles, surface);
    const { x, y } = this.world.tileCenter(startTile.tx, startTile.ty);
    const flying = isFlying(spawn.id);
    const frameDesc = getAnimalFrame(spawn.id, 0);

    const parts = [];
    let ring = null;
    if (!collected) {
      ring = this.add.circle(0, 0, 15, 0xcf9dab, 0)
        .setStrokeStyle(2, 0xcf9dab);
      parts.push(ring);
    }
    parts.push(this.add.ellipse(0, 11, 26, 9, 0x5c536a, 0.22));

    const corePx = screenFontSize(this, 16);
    const metaPx = screenFontSize(this, 14);
    let body;
    if (frameDesc?.key && this.textures.exists(frameDesc.key)) {
      body = this.add.sprite(0, flying ? -10 : -4, frameDesc.key, frameDesc.frame)
        .setDisplaySize(flying ? 34 : 38, flying ? 34 : 38)
        .setName(`animal-sprite-${spawn.id}`);
      const animationKey = ensureAnimalAnimation(this, spawn.id);
      if (animationKey) body.play(animationKey);
      parts.push(body);
    } else {
      body = this.add.sprite(0, flying ? -10 : -4)
        .setDisplaySize(flying ? 34 : 38, flying ? 34 : 38)
        .setName(`animal-sprite-${spawn.id}`)
        .setVisible(false);
      parts.push(body);
    }

    if (collected) {
      parts.push(this.add.circle(12, -14, 9, 0xf4ebc8, 0.95).setStrokeStyle(1.5, 0x5c536a));
      parts.push(this.add.text(12, -14, "✓", {
        fontFamily: KOREAN_FONT, fontSize: metaPx, color: "#5c536a", fontStyle: "bold"
      }).setOrigin(0.5));
    }

    parts.push(this.add.text(0, 28, collected ? `${spawn.id} ✓` : spawn.id, {
      fontFamily: KOREAN_FONT,
      fontSize: corePx,
      color: "#5c536a",
      backgroundColor: collected ? "#cbd784dd" : "#f4ebc8dd",
      padding: { x: 5, y: 3 }
    }).setOrigin(0.5));

    const marker = this.add.container(x, y, parts).setDepth(10).setName(`animal-marker-${spawn.id}`);
    marker.animalId = spawn.id;
    marker.animalBody = body;
    marker.lastWanderX = x;
    marker.wanderSurface = surface;
    marker.wanderTiles = wanderTiles;
    marker.currentWanderTile = startTile;
    marker.setAlpha(collected ? 0.9 : 1);

    // 살아있는 느낌 — 둥실(나는 동물) / 콩콩(그 외)
    this.tweens.add({
      targets: body,
      y: body.y - (flying ? 4 : 2),
      duration: flying ? 900 : 650,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      delay: (spawn.tx * 137) % 600
    });

    if (!collected) {
      this.tweens.add({
        targets: ring,
        scale: 1.7,
        alpha: 0,
        duration: 1500,
        repeat: -1,
        ease: "Sine.easeOut",
        onRepeat: () => {
          ring.setScale(1);
          ring.setAlpha(1);
        }
      });
      marker.pulseRing = ring;

      const zoneSize = surface === "water" ? 60 : (surface === "shore" ? 52 : 42);
      const zone = this.add.zone(x, y, zoneSize, zoneSize)
        .setName(`animal-encounter-zone-${spawn.id}`);
      this.physics.add.existing(zone, true);
      // 도망/후퇴 직후 같은 자리에서 곧바로 다시 배틀에 빨려들지 않도록,
      // 플레이어가 마커에서 한 번 떨어진 뒤에만 조우가 무장됩니다.
      zone.setData("armed", false);
      if (spawn.id === this.avoidEncounterId && this.returnPos) {
        zone.setData("armOrigin", { x: this.returnPos.x, y: this.returnPos.y });
        zone.setData("armAfter", this.time.now + 1200);
      }
      this.encounterZones.push(zone);
      marker.encounterZone = zone;
      this.physics.add.overlap(this.player, zone, () => {
        this.tryEncounter(spawn.id, region.id, zone, marker);
      });
      this.scheduleEncounterWander(marker, animal);
    }
  }

  collectEncounterWanderTiles(region, spawn, surface) {
    const tiles = [];
    const radius = ENCOUNTER_WANDER_RADIUS[surface];
    const x0 = Math.max(region.x0, spawn.wanderX?.[0] ?? region.x0, spawn.tx - radius);
    const x1 = Math.min(region.x1, spawn.wanderX?.[1] ?? region.x1, spawn.tx + radius);
    const y0 = Math.max(1, spawn.ty - radius);
    const y1 = Math.min(MAP_H - 2, spawn.ty + radius);

    for (let ty = y0; ty <= y1; ty += 1) {
      for (let tx = x0; tx <= x1; tx += 1) {
        const land = this.world.isWalkableLandTile(tx, ty);
        const water = surface === "water"
          ? this.world.isWaterTile(tx, ty)
          : this.world.isShoreWaterTile(tx, ty);
        const allowed = surface === "water" ? water : (surface === "shore" ? land || water : land);
        if (allowed) tiles.push({ tx, ty, water });
      }
    }

    if (tiles.length > 0) return tiles;
    return [{ tx: spawn.tx, ty: spawn.ty, water: this.world.isWaterTile(spawn.tx, spawn.ty) }];
  }

  pickEncounterStartTile(spawn, tiles, surface) {
    const exact = tiles.find((tile) => tile.tx === spawn.tx && tile.ty === spawn.ty);
    if (exact && surface !== "water") return exact;
    return [...tiles].sort((a, b) => {
      const distanceA = Math.abs(a.tx - spawn.tx) + Math.abs(a.ty - spawn.ty);
      const distanceB = Math.abs(b.tx - spawn.tx) + Math.abs(b.ty - spawn.ty);
      return distanceA - distanceB;
    })[0];
  }

  scheduleEncounterWander(marker, animal, delay = Phaser.Math.Between(700, 2100)) {
    if (!marker?.active || !marker.encounterZone?.active || this.encounterLocked) return;
    marker.wanderTimer?.remove(false);
    marker.wanderTimer = this.time.delayedCall(delay, () => {
      if (!marker.active || !marker.encounterZone?.active || this.encounterLocked) return;
      const current = marker.currentWanderTile;
      const neighbours = marker.wanderTiles.filter((tile) => (
        Math.abs(tile.tx - current.tx) + Math.abs(tile.ty - current.ty) === 1
      ));
      const choices = neighbours.length > 0 ? neighbours : marker.wanderTiles;
      const target = Phaser.Utils.Array.GetRandom(choices);
      this.moveEncounterMarker(marker, target, { animal });
    });
  }

  moveEncounterMarker(marker, targetTile, { animal = animalById[marker?.name?.replace("animal-marker-", "")], duration = null, scheduleNext = true } = {}) {
    if (!marker?.active || !targetTile || !marker.encounterZone?.active) return null;
    marker.wanderTimer?.remove(false);
    this.tweens.killTweensOf(marker);

    const target = this.world.tileCenter(targetTile.tx, targetTile.ty);
    const distance = Phaser.Math.Distance.Between(marker.x, marker.y, target.x, target.y);
    const pace = animal?.crawls ? 38 : (animal?.hasFins ? 17 : 24);
    marker.lastWanderX = marker.x;

    marker.wanderTween = this.tweens.add({
      targets: marker,
      x: target.x,
      y: target.y,
      duration: duration ?? Math.max(650, distance * pace),
      ease: "Sine.easeInOut",
      onUpdate: () => {
        this.syncEncounterFacing(marker);
        this.syncEncounterZone(marker);
      },
      onComplete: () => {
        if (!marker.active) return;
        marker.currentWanderTile = targetTile;
        this.syncEncounterZone(marker);
        if (scheduleNext) this.scheduleEncounterWander(marker, animal, Phaser.Math.Between(900, 2600));
      }
    });
    return marker.wanderTween;
  }

  /** 목표 방향이 아니라 화면에서 실제 움직인 X를 기준으로 동물 그림만 돌립니다. */
  syncEncounterFacing(marker) {
    if (!marker) return;
    const currentX = marker.x;
    const previousX = marker.lastWanderX;
    marker.lastWanderX = currentX;
    if (!Number.isFinite(currentX) || !Number.isFinite(previousX)) return;

    const dx = currentX - previousX;
    if (Math.abs(dx) < 0.01) return;
    const sourceFacing = ANIMAL_SOURCE_FACING[marker.animalId];
    if (sourceFacing === "front" || !sourceFacing) return;
    marker.animalBody?.setFlipX?.(sourceFacing === "left" ? dx > 0 : dx < 0);
  }

  syncEncounterZone(marker) {
    const zone = marker?.encounterZone;
    if (!zone?.active) return;
    zone.setPosition(marker.x, marker.y);
    zone.body?.updateFromGameObject?.();
  }

  tryEncounter(animalId, regionId, zone, marker) {
    if (this.encounterLocked) return;
    if (!zone.getData("armed")) return;
    // 씬 생성 직후 잠깐은 조우 금지 (전환 직후 오작동 방지)
    if (this.time.now - (this.createdAt ?? 0) < 500) return;
    this.encounterLocked = true;
    this.player.setVelocity(0, 0);
    this.syncPlayerSurface(false);
    marker.wanderTimer?.remove(false);
    this.tweens.killTweensOf(marker);
    zone.destroy();

    playEmote(this, this.player.x, this.player.y - 34, "surprise", { depth: 60 });
    this.tweens.add({
      targets: marker,
      scale: 1.18,
      yoyo: true,
      duration: 180,
      repeat: 1
    });

    this.time.delayedCall(700, () => {
      this.cameras.main.fadeOut(220, 24, 16, 8);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start("QuizBattleScene", {
          animalId,
          regionId,
          returnPos: { x: this.player.x, y: this.player.y }
        });
      });
    });
  }

  // ─── 지역 문 안내 ────────────────────────────────────────

  createGateSensors() {
    gates.forEach((gate) => {
      const { x, y } = this.world.tileCenter(gate.x - 1, PATH_Y[0]);
      const sensor = this.add.zone(x, y + TILE / 2, TILE, TILE * 2);
      this.physics.add.existing(sensor, true);
      this.physics.add.overlap(this.player, sensor, () => this.onGateTouched(gate));
    });
  }

  onGateTouched(gate) {
    if (isGateOpen(gate.from)) return;
    const now = this.time.now;
    if (now - this.gateToastAt < 2600) return;
    this.gateToastAt = now;

    const status = regionStatus(gate.from);
    const from = regionById[gate.from];
    const to = regionById[gate.to];
    this.hud?.showToast(
      `잠긴 문 · ${to.name}${directionParticle(to.name)} 갈 수 없어요.\n${from.short} 동물 ${status.count}/${status.target} — 모두 만나면 배지와 함께 열려요!`
    );
  }

  // ─── HUD ────────────────────────────────────────────────

  createHud() {
    this.hud = createWorldHud({
      onMap: () => this.openWorldMap(),
      onDex: () => this.openDex()
    });
    this.pad = this.hud;
    this.refreshHud();
  }

  refreshHud() {
    if (!this.hud) return;
    const region = regionById[this.currentRegionId];
    const status = regionStatus(region.id);
    const master = masterStatus();
    this.hud.refresh({
      region,
      countText: `이 지역 ${status.count}/${status.target} · 전체 도감 ${master.count}/${master.target}`,
      badgesOn: regions.map((item) => hasBadge(item.id)),
      master: hasBadge("master")
    });
  }

  showRegionBanner(region) {
    this.hud?.showBanner(region.name);
  }

  // ─── 배지·마스터 축하 ────────────────────────────────────

  checkCelebrations() {
    if (!this.scene.isActive() || this._navigating || this.celebrationRunning) return;
    const newBadgeRegion = findNewBadgeRegion();
    if (newBadgeRegion) {
      this.celebrateBadge(newBadgeRegion);
      return;
    }
    const master = masterStatus();
    if (master.complete && !hasBadge("master")) {
      awardBadge("master");
      this.refreshHud();
      this.celebrateMaster();
    }
  }

  celebrateBadge(regionId) {
    awardBadge(regionId);
    this.refreshHud();
    this.celebrationRunning = true;
    this.encounterLocked = true;
    this.hud?.releasePad?.();
    this.player.setVelocity(0, 0);

    const region = regionById[regionId];
    const gate = this.world.unlockGateFrom(regionId);
    const nextName = gate ? regionById[gate.to].name : null;
    const celebrationGen = ++this.celebrationGen;

    const showReward = () => {
      if (!this.scene.isActive() || celebrationGen !== this.celebrationGen || this.completionReward) return;
      playEmote(this, this.player.x, this.player.y - 34, "love", { depth: 60 });
      this.completionReward = showCompletionReward(this, {
        regionId,
        nextRegionName: nextName,
        onContinue: () => {
          this.completionReward?.destroy?.();
          this.completionReward = null;
          if (!this.scene.isActive() || celebrationGen !== this.celebrationGen) return;
          this.celebrationRunning = false;
          this.encounterLocked = false;
          this.checkCelebrations();
        }
      });
    };

    if (gate) {
      // 실제로 열린 문을 짧게 보여준 뒤 배지 수여 화면을 엽니다.
      const cam = this.cameras.main;
      const gx = gate.x * TILE;
      const gy = (PATH_Y[0] + 1) * TILE;
      cam.stopFollow();
      cam.pan(gx, gy, 500, "Sine.easeInOut", false, (_c, progress) => {
        if (progress >= 1 && celebrationGen === this.celebrationGen) {
          this.time.delayedCall(400, () => {
            if (!this.scene.isActive() || celebrationGen !== this.celebrationGen) return;
            cam.pan(this.player.x, this.player.y, 500, "Sine.easeInOut", false, (_c2, p2) => {
              if (p2 >= 1 && celebrationGen === this.celebrationGen) {
                cam.startFollow(this.player, true, 0.15, 0.15);
                showReward();
              }
            });
          });
        }
      });
    } else {
      showReward();
    }
  }

  celebrateMaster() {
    this.celebrationRunning = true;
    this.encounterLocked = true;
    this.hud?.releasePad?.();
    this.player.setVelocity(0, 0);
    const celebrationGen = ++this.celebrationGen;
    playEmote(this, this.player.x, this.player.y - 34, "happy", { depth: 60 });
    this.completionReward = showCompletionReward(this, {
      regionId: this.currentRegionId,
      master: true,
      onContinue: () => {
        this.completionReward?.destroy?.();
        this.completionReward = null;
        if (!this.scene.isActive() || celebrationGen !== this.celebrationGen) return;
        this.celebrationRunning = false;
        this.encounterLocked = false;
      }
    });
  }

  // ─── 입력·이동 ──────────────────────────────────────────

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });
    this.navKeys = this.input.keyboard.addKeys({
      dex: Phaser.Input.Keyboard.KeyCodes.C,
      map: Phaser.Input.Keyboard.KeyCodes.M
    });
  }

  openDex() {
    if (this._navigating || this.celebrationRunning || !this.player) return;
    this._navigating = true;
    this.hud?.releasePad?.();
    this.player.setVelocity(0, 0);
    this.scene.start("DexScene", {
      from: "OverworldScene",
      returnPos: { x: this.player.x, y: this.player.y },
      regionId: this.currentRegionId
    });
  }

  openWorldMap() {
    if (this._navigating || this.celebrationRunning) return;
    this._navigating = true;
    this.hud?.releasePad?.();
    this.player?.setVelocity(0, 0);
    this.scene.start("WorldMapScene", { currentRegionId: this.currentRegionId, selectedRegionId: this.currentRegionId });
  }

  update(_time, delta) {
    if (this.navKeys && Phaser.Input.Keyboard.JustDown(this.navKeys.dex)) {
      this.openDex();
      return;
    }
    if (this.navKeys && Phaser.Input.Keyboard.JustDown(this.navKeys.map)) {
      this.openWorldMap();
      return;
    }
    if (!this.player) return;
    if (this.encounterLocked || this._navigating) {
      this.hud?.releasePad?.();
      if (this.encounterLocked) this.syncPlayerSurface(false);
      return;
    }

    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) vx += 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) vy += 1;

    const pad = this.pad?.getVector?.();
    if (pad) {
      vx += pad.x;
      vy += pad.y;
    }

    const speed = this.playerFootInWater() ? SWIM_SPEED : PLAYER_SPEED;
    const len = Math.hypot(vx, vy);
    // 스틱 민 만큼만 걷고, 합친 입력이 1을 넘을 때만 길이를 잘라 대각선 가속을 막습니다.
    if (len > 1) {
      vx = (vx / len) * speed;
      vy = (vy / len) * speed;
    } else if (len > 0) {
      vx *= speed;
      vy *= speed;
    }

    // 발 위치 기준 타일 충돌
    const dt = delta / 1000;
    const footY = this.player.y + 12;
    if (vx !== 0 && this.world.isBlockedPx(this.player.x + vx * dt + Math.sign(vx) * 8, footY)) vx = 0;
    if (vy !== 0 && this.world.isBlockedPx(this.player.x, footY + vy * dt + Math.sign(vy) * 6)) vy = 0;

    this.player.setVelocity(vx, vy);

    const moving = vx !== 0 || vy !== 0;
    if (moving) {
      if (Math.abs(vx) > Math.abs(vy)) {
        this.lastDir = vx < 0 ? "left" : "right";
      } else {
        this.lastDir = vy < 0 ? "up" : "down";
      }
    }
    this.syncPlayerSurface(moving);

    // 조우 무장 — 마커에서 한 번 떨어져야 다시 조우할 수 있음
    for (const zone of this.encounterZones) {
      if (!zone.active || zone.getData("armed")) continue;
      const distanceFromMarker = Phaser.Math.Distance.Between(this.player.x, this.player.y, zone.x, zone.y);
      const armOrigin = zone.getData("armOrigin");
      if (armOrigin) {
        const leftEncounterPoint = Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          armOrigin.x,
          armOrigin.y
        ) > 72;
        if (this.time.now >= zone.getData("armAfter") && leftEncounterPoint && distanceFromMarker > 58) {
          zone.setData("armOrigin", null);
          zone.setData("armed", true);
        }
        continue;
      }
      if (distanceFromMarker > 58) {
        zone.setData("armed", true);
      }
    }

    // 지역 감지
    const regionNow = regionAtTile(Math.floor(this.player.x / TILE));
    if (regionNow.id !== this.currentRegionId) {
      this.currentRegionId = regionNow.id;
      this.refreshHud();
      this.showRegionBanner(regionNow);
    }
  }
}
