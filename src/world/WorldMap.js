// 오버월드 지형 — 지역마다 한 장씩 그린 고해상 픽셀 배경 5장(768×1088)을 이어 붙입니다.
// 타일·소품은 코드로 찍지 않습니다. 배경 그림 안에 이미 들어 있습니다.
// 통행·수영·문 판정은 그림이 아니라 G5 스냅샷(src/data/world-layout.json)의 칸 집합을 그대로 씁니다.
// 스냅샷은 모든 문이 열린 상태라, 잠긴 문만 길 위 두 칸을 막고 울타리 조각과 '잠김' 표찰을 얹습니다.
// 필수 배경이 빠지면 로드 오류를 드러내며 저품질 대체 그림으로 숨기지 않습니다.
import Phaser from "phaser/dist/phaser-arcade-physics.min.js";
import { TILE, MAP_W, MAP_H, PATH_Y, regions, gates } from "../data/regions.js";
import aroundArt from "../assets/detailed-pixel/overworld-around.webp?url";
import landArt from "../assets/detailed-pixel/overworld-land.webp?url";
import freshwaterArt from "../assets/detailed-pixel/overworld-freshwater.webp?url";
import seaArt from "../assets/detailed-pixel/overworld-sea.webp?url";
import specialArt from "../assets/detailed-pixel/overworld-special.webp?url";
import { KOREAN_FONT } from "../ui/UiHelpers.js";
import layout from "../data/world-layout.json";

const BG_COLOR = 0xaccec1;                        // 지도 바깥 배경 (Sprout 연한 민트 물)
const REGION_W = (MAP_W * TILE) / regions.length; // 지역 한 장이 덮는 폭 — 768px (24칸)
const REGION_H = MAP_H * TILE;                    // 1088px (34칸)
const BARRIER_FRAME = 4;                          // Fences 시트의 세로 울타리 한 칸

const REGION_URLS = {
  around: aroundArt,
  land: landArt,
  freshwater: freshwaterArt,
  sea: seaArt,
  special: specialArt
};

/** 지역 배경 이미지 — 배열 순서가 곧 가로 위치입니다 (0 · 768 · 1536 · 2304 · 3072). */
export const REGION_ART = regions.map((region, index) => ({
  key: `overworld-${region.id}`,
  url: REGION_URLS[region.id],
  x: index * REGION_W
}));

export default class WorldMap {
  constructor(scene, { isGateOpen = () => false } = {}) {
    this.scene = scene;
    this.isGateOpenFn = isGateOpen;
    // 실제 게임에서 캡처한 스냅샷을 그대로 씁니다 (이후 block/unblock은 이 위에 얹힙니다).
    this.blocked = new Set(layout.blocked);
    this.reserved = new Set(layout.reserved); // 장식을 두면 안 되는 칸 (길·스폰 주변·문·물가)
    this.waterTiles = new Set(layout.water);
    this.lockMarkers = {}; // gate.from → 잠금 표찰 컨테이너
    this.gateFences = {};  // gate.from → 길을 막는 울타리 조각
  }

  key(tx, ty) {
    return `${tx},${ty}`;
  }

  block(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return;
    this.blocked.add(this.key(tx, ty));
  }

  unblock(tx, ty) {
    this.blocked.delete(this.key(tx, ty));
  }

  isFree(tx, ty) {
    const k = this.key(tx, ty);
    return !this.blocked.has(k) && !this.reserved.has(k) && !this.waterTiles.has(k);
  }

  isWaterTile(tx, ty) {
    return this.waterTiles.has(this.key(tx, ty));
  }

  isWalkableLandTile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
    const k = this.key(tx, ty);
    return !this.blocked.has(k) && !this.waterTiles.has(k);
  }

  isShoreWaterTile(tx, ty) {
    if (!this.isWaterTile(tx, ty)) return false;
    return [[0, -1], [1, 0], [0, 1], [-1, 0]]
      .some(([dx, dy]) => this.isWalkableLandTile(tx + dx, ty + dy));
  }

  isBlockedPx(px, py) {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
    return this.blocked.has(this.key(tx, ty));
  }

  tileCenter(tx, ty) {
    return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
  }

  // 카메라 줌을 반영한 화면 기준 글자 크기 (기본 16, 부가 14)
  screenFont(screenPx) {
    const zoom = this.scene.cameras.main.zoom || 1;
    return Math.max(screenPx, Math.ceil(screenPx / zoom));
  }

  // ─── 배경 ───────────────────────────────────────────────

  /** 지역 배경 5장을 768px 간격으로 이어 붙입니다 — 타일 격자도, 코드로 찍는 지형도 없습니다. */
  paintRegionArt() {
    REGION_ART.forEach(({ key, x }) => {
      if (!this.scene.textures.exists(key)) throw new Error(`Missing world background: ${key}`);
      // 고해상 픽셀 그림을 줄일 때는 선형 보간이 디테일을 살립니다.
      this.scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
      this.scene.add.image(x, 0, key)
        .setOrigin(0, 0)
        .setDisplaySize(REGION_W, REGION_H)
        .setDepth(0);
    });
  }

  // ─── 빌드 ───────────────────────────────────────────────

  build() {
    const scene = this.scene;
    scene.physics.world.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
    scene.cameras.main.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
    scene.cameras.main.setBackgroundColor(BG_COLOR);
    this.paintRegionArt();
    this.buildGates();
    return this;
  }

  // ─── 울타리 문 ─────────────────────────────────────────

  /** 문 기둥은 배경 그림에 이미 있습니다. 잠긴 문만 길 위 두 칸을 막습니다. */
  buildGates() {
    gates.forEach((gate) => {
      if (!this.isGateOpenFn(gate.from)) this.closeGateTiles(gate);
    });
  }

  /** 잠긴 문 — 길 두 칸을 막고 울타리 조각과 '잠김' 표찰을 세웁니다. */
  closeGateTiles(gate) {
    PATH_Y.forEach((ty) => this.block(gate.x, ty));
    if (this.gateFences[gate.from]) return; // 이미 막혀 있으면 표찰을 다시 만들지 않습니다

    this.gateFences[gate.from] = PATH_Y
      .map((ty) => this.gateFence(gate.x, ty))
      .filter(Boolean);

    const { x, y } = this.tileCenter(gate.x, PATH_Y[0]);
    const size = this.screenFont(16);
    const text = this.scene.add.text(0, 0, "잠김", {
      fontSize: `${size}px`,
      fontFamily: KOREAN_FONT,
      color: "#f4f0de",
      fontStyle: "bold"
    }).setOrigin(0.5);
    const pad = Math.max(6, Math.round(size * 0.45));
    const w = text.width + pad * 2;
    const h = text.height + Math.round(pad * 0.9);
    const shadow = this.scene.add.rectangle(3, 3, w, h, 0x1b2a26, 0.5);
    const panel = this.scene.add.rectangle(0, 0, w, h, 0x183b3c, 0.86).setStrokeStyle(2, 0xd9af7f);
    this.lockMarkers[gate.from] = this.scene.add.container(x, y + TILE / 2, [shadow, panel, text])
      .setDepth(40);
  }

  /** 길 한 칸을 가로막는 울타리 조각 — 문이 열리면 지웁니다. */
  gateFence(tx, ty) {
    if (!this.scene.textures.exists("tiles-fence")) return null;
    const { x, y } = this.tileCenter(tx, ty);
    return this.scene.add.image(x, y, "tiles-fence", BARRIER_FRAME)
      .setDisplaySize(TILE, TILE)
      .setDepth(1);
  }

  /** 길을 되돌리고 문을 엽니다. sparkle이면 도트 반짝임을 뿌립니다. */
  openGateTiles(gate, { sparkle = false } = {}) {
    PATH_Y.forEach((ty) => this.unblock(gate.x, ty));
    (this.gateFences[gate.from] || []).forEach((fence) => fence.destroy());
    delete this.gateFences[gate.from];

    const marker = this.lockMarkers[gate.from];
    if (marker) {
      marker.destroy(true);
      delete this.lockMarkers[gate.from];
    }
    if (sparkle) this.burstSparkle(gate.x, PATH_Y[0]);
  }

  /** 문이 열릴 때 — 물빛 도트가 둥글게 흩어집니다. */
  burstSparkle(tx, ty) {
    const { x, y } = this.tileCenter(tx, ty);
    const count = 8;
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count;
      const dot = this.scene.add.rectangle(x, y, 8, 8, 0xd8f6ff).setDepth(41);
      this.scene.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * TILE,
        y: y + Math.sin(angle) * TILE,
        alpha: 0,
        duration: 420,
        ease: "Quad.Out",
        onComplete: () => dot.destroy()
      });
    }
  }

  /** 배지를 얻어 문을 열 때 OverworldScene이 호출합니다. */
  unlockGateFrom(gateFrom) {
    const gate = gates.find((g) => g.from === gateFrom);
    if (!gate) return null;
    this.openGateTiles(gate, { sparkle: true });
    return gate;
  }
}
