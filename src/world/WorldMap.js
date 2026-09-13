// 오버월드 지형 빌더 — Sprout Lands 타일을 RenderTexture 한 장에 굽습니다.
// 타일 인덱스 참고 (11칸 시트, index = row*11 + col):
//   블롭(섬) 가장자리: TL0 T1 TR2 / L11 C12 R13 / BL22 B23 BR24
//   평지 채움: 55,56,57,66,67,68  · 꽃 액센트: 60,71
// Grass.png와 Tilled_Dirt_Wide_v2.png(모래)는 같은 배치를 씁니다.
import Phaser from "phaser/dist/phaser-arcade-physics.min.js";
import { TILE, MAP_W, MAP_H, PATH_Y, regions, gates } from "../data/regions.js";
import { KOREAN_FONT } from "../ui/UiHelpers.js";

const FLAT = [55, 55, 56, 66, 66, 67, 57, 68]; // 살짝 섞인 평지
const ACCENT = [60, 71, 58, 69];               // 꽃·풀 무늬
const ICE_TINT = 0xcfe8f8;
const ICE_HILL_TINT = 0xe4f2ff;
const ICE_WATER_TINT = 0xdcf2ff;

export default class WorldMap {
  constructor(scene, { isGateOpen = () => false } = {}) {
    this.scene = scene;
    this.isGateOpenFn = isGateOpen;
    this.blocked = new Set();
    this.reserved = new Set(); // 장식을 두면 안 되는 칸 (길·스폰 주변·문)
    this.waterTiles = new Set();
    this.lockMarkers = {};     // gate.from → 잠금 표시 컨테이너
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

  reserve(tx, ty, radius = 0) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        this.reserved.add(this.key(tx + dx, ty + dy));
      }
    }
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

  // ─── 빌드 ───────────────────────────────────────────────

  build() {
    const scene = this.scene;
    const worldW = MAP_W * TILE;
    const worldH = MAP_H * TILE;

    scene.physics.world.setBounds(0, 0, worldW, worldH);
    scene.cameras.main.setBounds(0, 0, worldW, worldH);
    scene.cameras.main.setBackgroundColor(0x3f7a32);

    this.ground = scene.add.renderTexture(0, 0, worldW, worldH).setOrigin(0, 0).setDepth(0);

    this.reservePathAndSpawns();
    this.paintBaseGround();
    this.paintRoad();
    this.paintWaterBodies();
    this.placeBridge();
    this.paintIceOverlay();
    this.paintBorderFence();
    this.decorateVillage();
    this.decorateForest();
    this.decorateRiver();
    this.decorateBeach();
    this.decorateExtreme();
    this.buildGates();
    return this;
  }

  /** RenderTexture.stamp — draw()와 달리 tint를 지원합니다 */
  stamp(tx, ty, sheet, frame, tint = null) {
    if (!this.scene.textures.exists(sheet)) return;
    this.ground.stamp(sheet, frame, tx * TILE, ty * TILE, {
      scaleX: TILE / 16,
      scaleY: TILE / 16,
      originX: 0,
      originY: 0,
      tint: tint ?? 0xffffff
    });
  }

  reservePathAndSpawns() {
    // 큰길 위아래 여유 포함
    for (let tx = 0; tx < MAP_W; tx += 1) {
      for (let ty = PATH_Y[0] - 1; ty <= PATH_Y[1] + 1; ty += 1) {
        this.reserved.add(this.key(tx, ty));
      }
    }
    // 스폰 주변 3×3
    regions.forEach((region) => {
      region.spawns.forEach((s) => this.reserve(s.tx, s.ty, 1));
    });
    // 문 기둥 주변
    gates.forEach((gate) => {
      for (let ty = 0; ty < MAP_H; ty += 1) {
        this.reserved.add(this.key(gate.x - 1, ty));
        this.reserved.add(this.key(gate.x + 1, ty));
      }
    });
  }

  regionTheme(tx) {
    for (const region of regions) {
      if (tx <= region.x1) return region.theme;
    }
    return "village";
  }

  paintBaseGround() {
    for (let ty = 0; ty < MAP_H; ty += 1) {
      for (let tx = 0; tx < MAP_W; tx += 1) {
        const theme = this.regionTheme(tx);
        const noise = (tx * 7 + ty * 13 + ((tx * ty) % 5)) % FLAT.length;
        const accent = (tx * 31 + ty * 17) % 41 === 0;

        if (theme === "extreme") {
          const isIce = tx >= 108;
          if (isIce) {
            this.stamp(tx, ty, "tiles-grass", FLAT[noise], ICE_TINT);
          } else {
            this.stamp(tx, ty, "tiles-sand", FLAT[noise]);
          }
        } else if (theme === "beach" && ty >= 17 && ty <= 20) {
          // 백사장 띠
          this.stamp(tx, ty, "tiles-sand", ty === 17 ? 1 : FLAT[noise]);
        } else {
          this.stamp(tx, ty, "tiles-grass", accent ? ACCENT[(tx + ty) % ACCENT.length] : FLAT[noise]);
        }
      }
    }
    // 사막↔빙하 경계선 (모래 오른쪽 가장자리)
    for (let ty = 1; ty < MAP_H - 1; ty += 1) {
      this.stamp(107, ty, "tiles-sand", 13);
    }
  }

  paintRoad() {
    // 지역을 잇는 2칸 폭 흙길 (모래 블롭 위/아래 가장자리로 띠 모양)
    for (let tx = 1; tx < MAP_W - 1; tx += 1) {
      this.stamp(tx, PATH_Y[0], "tiles-sand", tx === 1 ? 0 : (tx === MAP_W - 2 ? 2 : 1));
      this.stamp(tx, PATH_Y[1], "tiles-sand", tx === 1 ? 22 : (tx === MAP_W - 2 ? 24 : 23));
    }
  }

  // ─── 물 ────────────────────────────────────────────────

  collectRect(set, x0, y0, x1, y1) {
    for (let ty = y0; ty <= y1; ty += 1) {
      for (let tx = x0; tx <= x1; tx += 1) {
        set.add(this.key(tx, ty));
      }
    }
  }

  paintWaterBodies() {
    // 강 (세로) — 다리 위치는 물로 두고 다리가 덮습니다
    const river = new Set();
    this.collectRect(river, 58, 1, 61, MAP_H - 2);
    // 호수
    this.collectRect(river, 52, 23, 66, 31);
    this.paintWaterBody(river, { edgeSheet: "tiles-grass" });
    this.lakeSet = river;

    // 바다 (해변 남쪽)
    const sea = new Set();
    this.collectRect(sea, 73, 21, 95, MAP_H - 2);
    this.paintWaterBody(sea, { edgeSheet: "tiles-sand" });

    // 빙하 연못
    const pond = new Set();
    this.collectRect(pond, 109, 21, 115, 25);
    this.paintWaterBody(pond, {
      edgeSheet: "tiles-grass",
      edgeTint: ICE_TINT,
      waterTint: ICE_WATER_TINT
    });

    this.addWaterShimmer([river, sea, pond]);
  }

  /**
   * 물 영역을 칠하고, 둘레 땅 칸에 블롭 가장자리를 얹어 자연스러운 물가를 만듭니다.
   */
  paintWaterBody(tiles, { edgeSheet = "tiles-grass", edgeTint = null, waterTint = null } = {}) {
    // 물 본체
    tiles.forEach((k) => {
      const [tx, ty] = k.split(",").map(Number);
      this.stamp(tx, ty, "tiles-water", (tx + ty) % 4, waterTint);
      this.block(tx, ty);
      this.waterTiles.add(k);
    });

    // 둘레 가장자리 (물이 살짝 비치는 곡선 물가)
    const edges = new Map();
    tiles.forEach((k) => {
      const [tx, ty] = k.split(",").map(Number);
      [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy]) => {
        const nk = this.key(tx + dx, ty + dy);
        if (!tiles.has(nk)) edges.set(nk, true);
      });
    });

    edges.forEach((_v, k) => {
      const [tx, ty] = k.split(",").map(Number);
      if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return;
      const water = (dx, dy) => tiles.has(this.key(tx + dx, ty + dy));
      const n = water(0, -1);
      const s = water(0, 1);
      const w = water(-1, 0);
      const e = water(1, 0);

      let frame = 12; // 중앙(잘못된 경우 대비)
      if (n && w) frame = 0;
      else if (n && e) frame = 2;
      else if (s && w) frame = 22;
      else if (s && e) frame = 24;
      else if (n) frame = 1;
      else if (s) frame = 23;
      else if (w) frame = 11;
      else if (e) frame = 13;
      else {
        // 대각선만 물인 경우: 반대 방향 모서리
        const nw = water(-1, -1);
        const ne = water(1, -1);
        const sw = water(-1, 1);
        const se = water(1, 1);
        if (nw) frame = 0;
        else if (ne) frame = 2;
        else if (sw) frame = 22;
        else if (se) frame = 24;
      }

      // 아래에 물을 깔고 가장자리를 얹으면 곡선 틈으로 물이 비칩니다
      this.stamp(tx, ty, "tiles-water", (tx + ty) % 4, edgeTint ? ICE_WATER_TINT : null);
      this.stamp(tx, ty, edgeSheet, frame, edgeTint);
      this.reserved.add(k); // 물가에는 장식 금지
    });
  }

  addWaterShimmer(sets) {
    const scene = this.scene;
    let i = 0;
    sets.forEach((tiles) => {
      tiles.forEach((k) => {
        i += 1;
        if (i % 7 !== 0) return;
        const [tx, ty] = k.split(",").map(Number);
        const { x, y } = this.tileCenter(tx, ty);
        const s = scene.add.sprite(x, y, "tiles-water", 0)
          .setDisplaySize(TILE, TILE)
          .setDepth(1)
          .setAlpha(0.55);
        s.play("water-shine");
        s.anims.setProgress(Math.random());
      });
    });
  }

  placeBridge() {
    // 강 위 큰길 다리 (가로 4칸 × 2칸)
    const y0 = PATH_Y[0];
    const cols = [58, 59, 60, 61];
    cols.forEach((tx, i) => {
      const top = i === 0 ? 2 : (i === cols.length - 1 ? 4 : 3);
      const bottom = i === 0 ? 7 : (i === cols.length - 1 ? 9 : 8);
      this.stamp(tx, y0, "obj-bridge", top);
      this.stamp(tx, y0 + 1, "obj-bridge", bottom);
      this.unblock(tx, y0);
      this.unblock(tx, y0 + 1);
      this.waterTiles.delete(this.key(tx, y0));
      this.waterTiles.delete(this.key(tx, y0 + 1));
    });
  }

  /**
   * 빙하 구역 서리 오버레이.
   * RenderTexture의 draw/stamp가 tint를 무시하므로 반투명 얼음색을 덮어 표현합니다.
   */
  paintIceOverlay() {
    this.ground.fill(0x9fd4ee, 0.34, 108 * TILE, 1 * TILE, (MAP_W - 108) * TILE, (MAP_H - 2) * TILE);
  }

  paintBorderFence() {
    for (let tx = 0; tx < MAP_W; tx += 1) {
      this.stamp(tx, 0, "tiles-fence", tx === 0 ? 13 : (tx === MAP_W - 1 ? 15 : 14));
      this.stamp(tx, MAP_H - 1, "tiles-fence", tx === 0 ? 13 : (tx === MAP_W - 1 ? 15 : 14));
      this.block(tx, 0);
      this.block(tx, MAP_H - 1);
    }
    for (let ty = 1; ty < MAP_H - 1; ty += 1) {
      this.stamp(0, ty, "tiles-fence", 4);
      this.stamp(MAP_W - 1, ty, "tiles-fence", 4);
      this.block(0, ty);
      this.block(MAP_W - 1, ty);
    }
  }

  // ─── 지역 장식 ──────────────────────────────────────────

  addImage(tx, ty, sheet, frame, {
    depth = 5,
    size = TILE,
    tint = null,
    block = false,
    offsetY = 0
  } = {}) {
    if (!this.scene.textures.exists(sheet)) return null;
    const { x, y } = this.tileCenter(tx, ty);
    const img = this.scene.add.image(x, y + offsetY, sheet, frame)
      .setDisplaySize(size, size)
      .setDepth(depth);
    if (tint) img.setTint(tint);
    if (block) this.block(tx, ty);
    return img;
  }

  /** 2×2 큰 나무 (윗줄은 플레이어 위에 그려짐) */
  placeTree(tx, ty, { fruit = false, tint = null } = {}) {
    const top = fruit ? [3, 4] : [1, 2];
    const bottom = fruit ? [12, 13] : [10, 11];
    this.addImage(tx, ty, "obj-biom", top[0], { depth: 30, tint });
    this.addImage(tx + 1, ty, "obj-biom", top[1], { depth: 30, tint });
    this.addImage(tx, ty + 1, "obj-biom", bottom[0], { depth: 22, tint, block: true });
    this.addImage(tx + 1, ty + 1, "obj-biom", bottom[1], { depth: 22, tint, block: true });
  }

  placeTreeSmall(tx, ty, { tint = null } = {}) {
    this.addImage(tx, ty, "obj-biom", 0, { depth: 30, tint });
    this.addImage(tx, ty + 1, "obj-biom", 9, { depth: 22, tint, block: true });
  }

  placeDecoIfFree(tx, ty, frame, { block = false, tint = null, depth = 5 } = {}) {
    if (block && !this.isFree(tx, ty)) return;
    this.addImage(tx, ty, "obj-biom", frame, { block, tint, depth });
  }

  placeSign(tx, ty, label) {
    const { x, y } = this.tileCenter(tx, ty);
    const text = this.scene.add.text(x, y, label, {
      fontFamily: KOREAN_FONT,
      fontSize: "11px",
      color: "#3d2410",
      backgroundColor: "#f0d9a0ee",
      padding: { x: 6, y: 3 }
    }).setOrigin(0.5).setDepth(9);
    return text;
  }

  decorateVillage() {
    // 닭장 (3×3)
    if (this.scene.textures.exists("obj-coop")) {
      const { x, y } = this.tileCenter(6, 6);
      this.scene.add.image(x, y, "obj-coop").setDisplaySize(TILE * 3, TILE * 3).setDepth(8);
      for (let dy = 5; dy <= 7; dy += 1) {
        for (let dx = 5; dx <= 7; dx += 1) this.block(dx, dy);
      }
    }
    // 꽃밭 울타리 (문은 아래 가운데)
    this.fenceRect(14, 4, 22, 10, { gate: "bottom" });
    [[16, 6], [18, 5], [20, 6], [17, 8], [19, 8], [15, 7]].forEach(([tx, ty], i) => {
      this.placeDecoIfFree(tx, ty, [24, 25, 26, 32, 33, 34][i % 6]);
    });
    // 마당 장식
    this.placeDecoIfFree(12, 12, 21, { block: true });  // 그루터기
    this.placeDecoIfFree(3, 20, 17, { block: true });   // 바위
    this.placeDecoIfFree(6, 24, 27);                    // 딸기 덤불
    this.placeDecoIfFree(17, 23, 28);
    this.placeTree(10, 8);
    this.placeTreeSmall(13, 19);
    this.placeTreeSmall(3, 8);
    // 마을 안내판
    this.placeSign(4, 14, "🏡 우리 마을");
  }

  decorateForest() {
    const trees = [
      [26, 3], [31, 4], [36, 3], [41, 4], [45, 3],
      [27, 9], [33, 9], [38, 8], [44, 10],
      [26, 19], [32, 20], [38, 19], [43, 21],
      [28, 25], [34, 27], [40, 26], [45, 25], [30, 30], [41, 30]
    ];
    trees.forEach(([tx, ty], i) => {
      if (!this.isFree(tx, ty + 1) || !this.isFree(tx + 1, ty + 1)) return;
      this.placeTree(tx, ty, { fruit: i % 5 === 2 });
    });
    [[29, 7], [42, 12], [27, 22], [36, 22], [44, 27]].forEach(([tx, ty]) => {
      this.placeDecoIfFree(tx, ty, 5 + ((tx + ty) % 4)); // 버섯
    });
    this.placeDecoIfFree(35, 12, 23, { block: true }); // 통나무
    this.placeDecoIfFree(31, 26, 17, { block: true }); // 바위
    this.placeSign(27, 13, "🌳 숲길");
  }

  decorateRiver() {
    // 연잎 (호수 물 위)
    [[54, 26], [57, 29], [62, 25], [64, 29], [53, 24]].forEach(([tx, ty], i) => {
      this.addImage(tx, ty, "obj-biom", i % 2 === 0 ? 43 : 44, { depth: 2 });
    });
    this.placeTree(50, 4);
    this.placeTree(64, 4);
    this.placeTreeSmall(56, 10);
    this.placeDecoIfFree(51, 10, 17, { block: true });
    this.placeDecoIfFree(69, 21, 16);
    this.placeSign(51, 18, "💧 강가");
  }

  decorateBeach() {
    // 갯벌 장식 — 작은 바위·조개 느낌
    [[75, 18], [80, 18], [87, 19], [91, 18], [94, 20]].forEach(([tx, ty]) => {
      this.placeDecoIfFree(tx, ty, 16);
    });
    this.placeDecoIfFree(78, 13, 17, { block: true });
    this.placeTreeSmall(74, 3);
    this.placeTree(90, 4);
    this.placeSign(75, 14, "🌊 바닷가");
  }

  decorateExtreme() {
    // 사막: 바위·마른 통나무
    this.placeDecoIfFree(99, 10, 17, { block: true, tint: 0xffe2c0 });
    this.placeDecoIfFree(105, 20, 16, { tint: 0xffe2c0 });
    this.placeDecoIfFree(101, 25, 23, { block: true, tint: 0xffd9a8 });
    this.placeDecoIfFree(98, 18, 21, { tint: 0xffe2c0 });
    // 빙하: 하얀 언덕(절벽)과 바위
    this.paintIceHill(115, 17, 3, 3);
    this.placeDecoIfFree(110, 12, 17, { block: true, tint: ICE_HILL_TINT });
    this.placeDecoIfFree(117, 22, 16, { tint: ICE_HILL_TINT });
    this.placeSign(99, 13, "🏜️ 사막");
    this.placeSign(110, 18, "🧊 빙하");
  }

  paintIceHill(tx0, ty0, w, h) {
    for (let dy = 0; dy < h; dy += 1) {
      for (let dx = 0; dx < w; dx += 1) {
        const row = dy === 0 ? 0 : (dy === h - 1 ? 2 : 1);
        const col = dx === 0 ? 0 : (dx === w - 1 ? 2 : 1);
        const frame = row * 11 + col;
        this.stamp(tx0 + dx, ty0 + dy, "tiles-hills", frame, ICE_HILL_TINT);
        this.block(tx0 + dx, ty0 + dy);
      }
    }
  }

  /** 울타리 사각형 (gate: "bottom"이면 아래 변 가운데가 뚫립니다) */
  fenceRect(x0, y0, x1, y1, { gate = null } = {}) {
    const gateX = Math.floor((x0 + x1) / 2);
    for (let tx = x0; tx <= x1; tx += 1) {
      this.stamp(tx, y0, "tiles-fence", tx === x0 ? 1 : (tx === x1 ? 3 : 2));
      this.block(tx, y0);
      if (gate === "bottom" && tx === gateX) continue;
      this.stamp(tx, y1, "tiles-fence", tx === x0 ? 9 : (tx === x1 ? 11 : 10));
      this.block(tx, y1);
    }
    for (let ty = y0 + 1; ty < y1; ty += 1) {
      this.stamp(x0, ty, "tiles-fence", 5);
      this.stamp(x1, ty, "tiles-fence", 7);
      this.block(x0, ty);
      this.block(x1, ty);
    }
  }

  // ─── 지역 사이 문 ────────────────────────────────────────

  buildGates() {
    gates.forEach((gate) => {
      for (let ty = 1; ty < MAP_H - 1; ty += 1) {
        if (ty === PATH_Y[0] || ty === PATH_Y[1]) continue; // 문 칸은 아래에서 처리
        this.stamp(gate.x, ty, "tiles-fence", ty === 1 ? 0 : (ty === MAP_H - 2 ? 8 : 4));
        this.block(gate.x, ty);
      }
      if (this.isGateOpenFn(gate.from)) {
        this.openGateTiles(gate);
      } else {
        this.closeGateTiles(gate);
      }
    });
  }

  closeGateTiles(gate) {
    PATH_Y.forEach((ty) => {
      this.stamp(gate.x, ty, "tiles-fence", 4);
      this.block(gate.x, ty);
    });
    const { x, y } = this.tileCenter(gate.x, PATH_Y[0]);
    const marker = this.scene.add.container(x, y + TILE / 2, [
      this.scene.add.circle(0, 0, 15, 0x2d1b0e, 0.78).setStrokeStyle(2, 0xf0d9a0),
      this.scene.add.text(0, 0, "🔒", { fontSize: "15px", fontFamily: KOREAN_FONT }).setOrigin(0.5)
    ]).setDepth(40);
    this.lockMarkers[gate.from] = marker;
  }

  openGateTiles(gate, { sparkle = false } = {}) {
    PATH_Y.forEach((ty, i) => {
      this.stamp(gate.x, ty, "tiles-sand", i === 0 ? 1 : 23);
      this.unblock(gate.x, ty);
    });
    const marker = this.lockMarkers[gate.from];
    if (marker) {
      marker.destroy(true);
      delete this.lockMarkers[gate.from];
    }
    if (sparkle) {
      const { x, y } = this.tileCenter(gate.x, PATH_Y[0]);
      const ring = this.scene.add.circle(x, y + TILE / 2, 10, 0xffe8a0, 0)
        .setStrokeStyle(4, 0xffd84d)
        .setDepth(41);
      this.scene.tweens.add({
        targets: ring,
        scale: 3,
        alpha: 0,
        duration: 700,
        ease: "Cubic.easeOut",
        onComplete: () => ring.destroy()
      });
    }
  }

  /** 배지 획득 시 호출 — 해당 지역에서 나가는 문을 엽니다 */
  unlockGateFrom(regionId) {
    const gate = gates.find((g) => g.from === regionId);
    if (!gate) return null;
    this.openGateTiles(gate, { sparkle: true });
    return gate;
  }
}
