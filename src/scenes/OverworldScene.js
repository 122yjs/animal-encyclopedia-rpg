// 오버월드 — 5개 서식지를 잇는 모험 맵
// 동물 마커에 닿으면 턴제 퀴즈 배틀로, 지역 동물을 모두 모으면 배지와 함께 다음 문이 열립니다.
import Phaser from "phaser/dist/phaser-arcade-physics.min.js";
import { TILE, MAP_H, PATH_Y, regions, regionAtTile, regionById, gates, animalEmoji } from "../data/regions.js";
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
import { ensureAnimalAnimation, ensureAnimalTexture, isFlying } from "../world/AnimalSprites.js";
import {
  KOREAN_FONT,
  createWoodButton,
  createWoodPanel,
  createVirtualPad,
  createDialogPanel,
  playEmote
} from "../ui/UiHelpers.js";
import { directionParticle } from "../systems/ObservationBuilder.js";

const PLAYER_SPEED = 150;
const PLAYER_SCALE = 1.65;
const ENCOUNTER_WANDER_RADIUS = Object.freeze({
  land: 3,
  water: 4,
  shore: 6
});

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
      this.time.delayedCall(350, () => this.checkCelebrations());
    } catch (error) {
      console.error("오버월드 생성 실패:", error);
      this.showFatalError(error);
    }
  }

  showFatalError(error) {
    const { width, height } = this.cameras.main;
    this.add.rectangle(width / 2, height / 2, width, height, 0x2d1b0e, 0.92)
      .setScrollFactor(0).setDepth(9000);
    this.add.text(width / 2, height / 2 - 20, "맵을 불러오지 못했어요", {
      fontFamily: KOREAN_FONT, fontSize: "18px", color: "#fff8e7"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(9001);
    this.add.text(width / 2, height / 2 + 20, String(error?.message || error), {
      fontFamily: KOREAN_FONT, fontSize: "12px", color: "#f0d9a0",
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
    this.player.anims.play("idle-down");

    this.currentRegionId = regionAtTile(Math.floor(startX / TILE)).id;
  }

  // ─── 마을 NPC (분위기용) ─────────────────────────────────

  createNpcs() {
    this.makeNpc("npc-chicken", 8, 10, { x0: 4, y0: 9, x1: 11, y1: 13 }, 26);
    this.makeNpc("npc-chicken", 10, 12, { x0: 4, y0: 10, x1: 11, y1: 13 }, 26);
    this.makeNpc("npc-cow", 12, 13, { x0: 9, y0: 11, x1: 13, y1: 14 }, 44);
  }

  makeNpc(key, tx, ty, rect, size) {
    if (!this.textures.exists(key)) return;
    const { x, y } = this.world.tileCenter(tx, ty);
    const kind = key === "npc-cow" ? "cow" : "chicken";
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
    const texKey = ensureAnimalTexture(this, spawn.id);

    const parts = [];
    let ring = null;
    if (!collected) {
      ring = this.add.circle(0, 0, 15, 0xe8a838, 0)
        .setStrokeStyle(2, 0xe8a838);
      parts.push(ring);
    }
    parts.push(this.add.ellipse(0, 11, 26, 9, 0x2d1b0e, 0.2));

    let body;
    if (texKey) {
      body = this.add.sprite(0, flying ? -10 : -4, texKey)
        .setDisplaySize(flying ? 34 : 38, flying ? 34 : 38)
        .setName(`animal-sprite-${spawn.id}`);
      if (spawn.tx % 2 === 0) body.setFlipX(true);
      const animationKey = ensureAnimalAnimation(this, spawn.id);
      if (animationKey) body.play(animationKey);
      parts.push(body);
    } else {
      body = this.add.text(0, -2, animalEmoji[spawn.id] || "❓", {
        fontSize: "16px", fontFamily: KOREAN_FONT
      }).setOrigin(0.5);
      parts.push(body);
    }

    if (collected) {
      parts.push(this.add.circle(11, -12, 7, 0xd4e8c2, 0.95).setStrokeStyle(1.5, 0x3d7a34));
      parts.push(this.add.text(11, -12, "✓", {
        fontSize: "9px", color: "#2d5a28", fontStyle: "bold"
      }).setOrigin(0.5));
    }

    parts.push(this.add.text(0, 27, collected ? `${spawn.id} ✓` : spawn.id, {
      fontFamily: KOREAN_FONT,
      fontSize: "10px",
      color: collected ? "#2d5a28" : "#3d2410",
      backgroundColor: collected ? "#d4e8c2dd" : "#fff8e7dd",
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5));

    const marker = this.add.container(x, y, parts).setDepth(10).setName(`animal-marker-${spawn.id}`);
    marker.animalBody = body;
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
    const x0 = Math.max(region.x0, spawn.tx - radius);
    const x1 = Math.min(region.x1, spawn.tx + radius);
    const y0 = Math.max(1, spawn.ty - radius);
    const y1 = Math.min(MAP_H - 2, spawn.ty + radius);

    for (let ty = y0; ty <= y1; ty += 1) {
      for (let tx = x0; tx <= x1; tx += 1) {
        const land = this.world.isWalkableLandTile(tx, ty);
        const water = this.world.isShoreWaterTile(tx, ty);
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
    marker.animalBody?.setFlipX?.(target.x > marker.x);

    marker.wanderTween = this.tweens.add({
      targets: marker,
      x: target.x,
      y: target.y,
      duration: duration ?? Math.max(650, distance * pace),
      ease: "Sine.easeInOut",
      onUpdate: () => this.syncEncounterZone(marker),
      onComplete: () => {
        if (!marker.active) return;
        marker.currentWanderTile = targetTile;
        this.syncEncounterZone(marker);
        if (scheduleNext) this.scheduleEncounterWander(marker, animal, Phaser.Math.Between(900, 2600));
      }
    });
    return marker.wanderTween;
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
    this.player.anims.play(`idle-${this.lastDir}`, true);
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
    const toast = createDialogPanel(this, {
      text: `🔒 ${to.name}${directionParticle(to.name)} 가는 문이 잠겨 있어요.\n${from.short} 동물 ${status.count}/${status.target} — 모두 만나면 배지와 함께 열려요!`,
      width: 520,
      height: 74,
      y: 64
    });
    this.time.delayedCall(2300, () => toast.destroy());
  }

  // ─── HUD ────────────────────────────────────────────────

  createHud() {
    const cam = this.cameras.main;

    this.hudPanel = createWoodPanel(this, 132, 48, 246, 82).setScrollFactor(0).setDepth(500);
    this.hudRegion = this.add.text(24, 20, "", {
      fontFamily: KOREAN_FONT, fontSize: "14px", color: "#3d2410", fontStyle: "bold"
    }).setScrollFactor(0).setDepth(501);
    this.hudCount = this.add.text(24, 40, "", {
      fontFamily: KOREAN_FONT, fontSize: "11px", color: "#6b4226"
    }).setScrollFactor(0).setDepth(501);

    // 배지 줄
    this.badgeTexts = regions.map((region, i) => this.add.text(26 + i * 24, 57, region.emoji, {
      fontSize: "14px", fontFamily: KOREAN_FONT
    }).setScrollFactor(0).setDepth(501));

    this.mapButton = createWoodButton(this, cam.width - 148, 28, "🗺 지도", () => this.openWorldMap(), {
      width: 88,
      height: 42,
      fontSize: "13px",
      depth: 2200
    }).setName("overworld-map");

    this.dexButton = createWoodButton(this, cam.width - 50, 28, "📖 도감", () => this.openDex(), {
      width: 92,
      height: 42,
      fontSize: "13px",
      depth: 2200
    }).setName("overworld-dex");

    this.refreshHud();
  }

  refreshHud() {
    const region = regionById[this.currentRegionId];
    const status = regionStatus(region.id);
    const master = masterStatus();
    this.hudRegion.setText(`${region.emoji} ${region.name}`);
    this.hudCount.setText(`이 지역 ${status.count}/${status.target} · 전체 도감 ${master.count}/${master.target}`);
    this.badgeTexts.forEach((text, i) => {
      text.setAlpha(hasBadge(regions[i].id) ? 1 : 0.28);
    });
  }

  showRegionBanner(region) {
    if (this.regionBanner) this.regionBanner.destroy(true);
    const cam = this.cameras.main;
    const banner = this.add.container(cam.width / 2, 30).setDepth(600).setScrollFactor(0).setAlpha(0);
    banner.add(createWoodPanel(this, 0, 0, 230, 38));
    banner.add(this.add.text(0, 0, `${region.emoji} ${region.name}`, {
      fontFamily: KOREAN_FONT, fontSize: "15px", color: "#3d2410", fontStyle: "bold"
    }).setOrigin(0.5));
    this.regionBanner = banner;
    this.tweens.add({
      targets: banner,
      alpha: 1,
      duration: 220,
      yoyo: true,
      hold: 1400,
      onComplete: () => {
        banner.destroy(true);
        if (this.regionBanner === banner) this.regionBanner = null;
      }
    });
  }

  // ─── 배지·마스터 축하 ────────────────────────────────────

  checkCelebrations() {
    const newBadgeRegion = findNewBadgeRegion();
    if (newBadgeRegion) {
      this.celebrateBadge(newBadgeRegion);
      return;
    }
    const master = masterStatus();
    if (master.complete && !hasBadge("master")) {
      awardBadge("master");
      this.celebrateMaster();
    }
  }

  celebrateBadge(regionId) {
    awardBadge(regionId);
    this.refreshHud();
    this.encounterLocked = true;
    this.player.setVelocity(0, 0);

    const region = regionById[regionId];
    const gate = this.world.unlockGateFrom(regionId);

    const showDialog = () => {
      const nextName = gate ? regionById[gate.to].name : null;
      const dialog = createDialogPanel(this, {
        text: gate
          ? `🎖 ${region.name} 배지 획득!\n${nextName}${directionParticle(nextName)} 가는 문이 활짝 열렸어요!`
          : `🎖 ${region.name} 배지 획득!\n모든 지역을 정복했어요!`,
        width: 540,
        height: 92
      });
      playEmote(this, this.player.x, this.player.y - 34, "love", { depth: 60 });
      this.time.delayedCall(2600, () => {
        dialog.destroy();
        this.encounterLocked = false;
        this.checkCelebrations(); // 마스터 판정 이어서
      });
    };

    if (gate) {
      // 열리는 문을 잠깐 보여주고 돌아옵니다
      const cam = this.cameras.main;
      const gx = gate.x * TILE;
      const gy = (PATH_Y[0] + 1) * TILE;
      cam.stopFollow();
      cam.pan(gx, gy, 650, "Sine.easeInOut", false, (_c, progress) => {
        if (progress === 1) {
          this.cameras.main.flash(240, 255, 236, 160);
          this.time.delayedCall(750, () => {
            cam.pan(this.player.x, this.player.y, 650, "Sine.easeInOut", false, (_c2, p2) => {
              if (p2 === 1) {
                cam.startFollow(this.player, true, 0.15, 0.15);
                showDialog();
              }
            });
          });
        }
      });
    } else {
      showDialog();
    }
  }

  celebrateMaster() {
    this.encounterLocked = true;
    this.player.setVelocity(0, 0);
    const master = masterStatus();
    const dialog = createDialogPanel(this, {
      text: `🏆 도감 마스터 달성! (${master.count}/${master.target})\n다섯 서식지의 동물을 모두 도감에 담았어요. 정말 대단한 탐험가예요!`,
      width: 560,
      height: 96
    });
    playEmote(this, this.player.x, this.player.y - 34, "happy", { depth: 60 });
    this.time.delayedCall(3400, () => {
      dialog.destroy();
      this.encounterLocked = false;
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
    this.pad = createVirtualPad(this);
  }

  openDex() {
    if (this._navigating || !this.player) return;
    this._navigating = true;
    this.player.setVelocity(0, 0);
    this.scene.start("DexScene", {
      from: "OverworldScene",
      returnPos: { x: this.player.x, y: this.player.y },
      regionId: this.currentRegionId
    });
  }

  openWorldMap() {
    if (this._navigating) return;
    this._navigating = true;
    this.player?.setVelocity(0, 0);
    this.scene.start("WorldMapScene", { selectedRegionId: this.currentRegionId });
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
    if (!this.player || this.encounterLocked || this._navigating) return;

    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) vx += 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) vy += 1;

    const pad = this.pad?.getVector?.() || { x: 0, y: 0 };
    vx += pad.x;
    vy += pad.y;

    if (vx !== 0 || vy !== 0) {
      const len = Math.hypot(vx, vy) || 1;
      vx = (vx / len) * PLAYER_SPEED;
      vy = (vy / len) * PLAYER_SPEED;
    }

    // 발 위치 기준 타일 충돌
    const dt = delta / 1000;
    const footY = this.player.y + 12;
    if (vx !== 0 && this.world.isBlockedPx(this.player.x + vx * dt + Math.sign(vx) * 8, footY)) vx = 0;
    if (vy !== 0 && this.world.isBlockedPx(this.player.x, footY + vy * dt + Math.sign(vy) * 6)) vy = 0;

    this.player.setVelocity(vx, vy);

    if (vx === 0 && vy === 0) {
      this.player.anims.play(`idle-${this.lastDir}`, true);
    } else {
      if (Math.abs(vx) > Math.abs(vy)) {
        this.lastDir = vx < 0 ? "left" : "right";
      } else {
        this.lastDir = vy < 0 ? "up" : "down";
      }
      this.player.anims.play(`walk-${this.lastDir}`, true);
    }

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
