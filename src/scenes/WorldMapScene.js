// 월드맵 허브 — 다섯 서식지를 살펴보고 탐험·도감으로 이동합니다.
import Phaser from "phaser/dist/phaser-arcade-physics.min.js";
import { regions } from "../data/regions.js";
import { KOREAN_FONT, createWoodButton, createWoodPanel } from "../ui/UiHelpers.js";
import { masterStatus, regionStatus, hasBadge } from "../systems/ProgressStore.js";

const MAP_POINTS = [
  { x: 64, y: 138 },
  { x: 192, y: 162 },
  { x: 320, y: 138 },
  { x: 448, y: 162 },
  { x: 576, y: 138 }
];

const ORDER_LABELS = {
  around: "우리 주변",
  land: "땅",
  freshwater: "강·호수",
  sea: "바다",
  special: "특별한 환경"
};

export default class WorldMapScene extends Phaser.Scene {
  constructor() {
    super("WorldMapScene");
  }

  init(data = {}) {
    this.requestedRegionId = data.selectedRegionId || null;
  }

  create() {
    const { width, height } = this.cameras.main;
    this._starting = false;
    this.orderDialogNodes = null;
    this.orderDialogTargetId = null;

    this.createGrassBackground(width, height);
    this.add.rectangle(width / 2, height / 2, width, height, 0x2d1b0e, 0.1);

    const master = masterStatus();
    this.missionRegionId = this.pickMissionRegion();
    this.selectedRegionId = this.pickInitialRegion();

    const header = createWoodPanel(this, width / 2, 42, 592, 72).setName("world-map");
    header.setDepth(20);
    this.add.text(width / 2, 30, "🗺 동물도감 월드맵", {
      fontFamily: KOREAN_FONT,
      fontSize: "27px",
      color: "#3d2410",
      fontStyle: "bold"
    }).setOrigin(0.5).setDepth(21);
    this.add.text(width / 2, 56, `도감 ${master.count}/${master.target} · 잠금 지역도 선택해 먼저 탐험할 수 있어요`, {
      fontFamily: KOREAN_FONT,
      fontSize: "12px",
      color: "#6b4226"
    }).setOrigin(0.5).setDepth(21);

    this.drawRegionRoute();
    this.createSelectionMarkers();
    this.createRegionButtons();

    this.detailPanel = createWoodPanel(this, width / 2, 244, 592, 76).setDepth(30);
    this.detailTitle = this.add.text(42, 220, "", {
      fontFamily: KOREAN_FONT,
      fontSize: "17px",
      color: "#3d2410",
      fontStyle: "bold"
    }).setDepth(31);
    this.detailBody = this.add.text(42, 246, "", {
      fontFamily: KOREAN_FONT,
      fontSize: "10px",
      color: "#6b4226",
      wordWrap: { width: 548 },
      lineSpacing: 1
    }).setDepth(31);

    this.primaryButton = createWoodButton(this, 266, 326, "이 지역 탐험", () => this.startSelectedRegion(), {
      width: 300,
      height: 44,
      fontSize: "16px",
      tint: 0xffe08a,
      depth: 60
    }).setName("world-map-primary");

    this.dexButton = createWoodButton(this, 526, 326, "📖 도감", () => this.openDex(), {
      width: 132,
      height: 44,
      fontSize: "15px",
      depth: 60
    }).setName("world-map-dex");

    this.refreshSelection();
    this.setupKeyboard();
  }

  createGrassBackground(width, height) {
    const flat = [55, 56, 66, 67, 57, 68];
    const tile = 32;
    for (let ty = 0; ty <= Math.ceil(height / tile); ty += 1) {
      for (let tx = 0; tx <= Math.ceil(width / tile); tx += 1) {
        const frame = (tx * 7 + ty * 13) % 37 === 0 ? 60 : flat[(tx * 3 + ty * 5) % flat.length];
        this.add.image(tx * tile, ty * tile, "tiles-grass", frame)
          .setOrigin(0)
          .setDisplaySize(tile, tile);
      }
    }
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

  pickInitialRegion() {
    if (regions.some((region) => region.id === this.requestedRegionId)) return this.requestedRegionId;
    return this.missionRegionId;
  }

  drawRegionRoute() {
    const route = this.add.graphics().setDepth(8);
    route.lineStyle(8, 0x6b4226, 0.32);
    route.beginPath();
    route.moveTo(MAP_POINTS[0].x, MAP_POINTS[0].y);
    MAP_POINTS.slice(1).forEach((point) => route.lineTo(point.x, point.y));
    route.strokePath();

    route.lineStyle(3, 0xf0d9a0, 0.9);
    route.beginPath();
    route.moveTo(MAP_POINTS[0].x, MAP_POINTS[0].y);
    MAP_POINTS.slice(1).forEach((point) => route.lineTo(point.x, point.y));
    route.strokePath();
  }

  createSelectionMarkers() {
    this.selectionFrame = this.add.rectangle(0, 0, 112, 70, 0xffe08a, 0.08)
      .setStrokeStyle(3, 0xffc44d)
      .setDepth(39)
      .setName("world-map-selection");
    this.mapPlayerPin = this.add.circle(0, 0, 18, 0xfff8e7, 0.94)
      .setStrokeStyle(3, 0x6b4226)
      .setDepth(54)
      .setName("world-map-player-pin");
    this.mapPlayer = this.add.sprite(0, 0, "player", 0)
      .setDisplaySize(44, 44)
      .setDepth(55)
      .setName("world-map-player");
    this.mapPlayer.play("idle-down");
  }

  createRegionButtons() {
    this.regionButtons = regions.map((region, index) => {
      const point = MAP_POINTS[index];
      const unlocked = this.isRegionUnlocked(index);
      const status = regionStatus(region.id);
      const badge = hasBadge(region.id) ? " 🎖" : "";
      const label = unlocked
        ? `${region.emoji} ${region.short}${badge}\n${status.count}/${status.target}`
        : `🔒 ${region.short}\n먼저 가기`;
      const button = createWoodButton(this, point.x, point.y, label, () => this.selectRegion(region.id), {
        width: 106,
        height: 64,
        fontSize: "12px",
        depth: 40
      }).setName(`world-map-region-${region.id}`);
      button.regionId = region.id;
      button.unlocked = unlocked;
      return button;
    });
  }

  selectRegion(regionId) {
    const button = this.regionButtons.find((item) => item.regionId === regionId);
    if (!button || this._starting || this.orderDialogNodes) return;
    this.selectedRegionId = this.selectedRegionId === regionId && regionId !== this.missionRegionId
      ? this.missionRegionId
      : regionId;
    this.refreshSelection();
  }

  refreshSelection() {
    const index = regions.findIndex((region) => region.id === this.selectedRegionId);
    const region = regions[index] || regions[0];
    const status = regionStatus(region.id);
    const unlocked = this.isRegionUnlocked(index);
    const mission = regions.find((item) => item.id === this.missionRegionId) || regions[0];

    this.regionButtons.forEach((button, buttonIndex) => {
      button.unlocked = this.isRegionUnlocked(buttonIndex);
      const selected = button.regionId === region.id;
      button.buttonBg.setTint?.(selected ? 0xffe08a : button.unlocked ? 0xd9c8a8 : 0xb7aa90);
      button.setScale(selected ? 1.04 : 1);
      button.setAlpha(selected ? 1 : button.unlocked ? 0.92 : 0.78);
    });

    const point = MAP_POINTS[index] || MAP_POINTS[0];
    this.selectionFrame.setPosition(point.x, point.y);
    this.mapPlayerPin.setPosition(point.x, point.y - 48);
    this.mapPlayer.setPosition(point.x, point.y - 48);

    this.detailTitle.setText(`${region.emoji} ${region.name} · ${status.count}/${status.target}${hasBadge(region.id) ? " · 배지 획득" : unlocked ? "" : " · 순서 변경 선택"}`);
    this.detailBody.setText(unlocked
      ? `${region.intro}\n${status.complete ? "이 지역의 동물을 모두 만났어요. 다시 둘러볼 수 있어요." : "동물 마커를 찾아 관찰 퀴즈 배틀에 도전하세요."}`
      : `${region.intro}\n현재 미션은 '${ORDER_LABELS[mission.id]}' 순서예요. 이 지역을 먼저 탐험할 수도 있어요.\n같은 지역을 다시 누르면 현재 미션으로 돌아가요.`);
    this.primaryButton.setText(unlocked
      ? status.complete ? `${region.short} 다시 탐험` : `${region.short} 탐험 시작`
      : `${region.short} 먼저 탐험`);
  }

  setupKeyboard() {
    this.input.keyboard?.on("keydown-LEFT", () => this.moveSelection(-1));
    this.input.keyboard?.on("keydown-RIGHT", () => this.moveSelection(1));
    this.input.keyboard?.on("keydown-ENTER", () => this.startSelectedRegion());
    this.input.keyboard?.on("keydown-SPACE", () => this.startSelectedRegion());
    this.input.keyboard?.on("keydown-D", () => this.openDex());
    this.input.keyboard?.on("keydown-ESC", () => {
      if (this.orderDialogNodes) this.closeOrderDialog({ restoreMission: true });
    });
  }

  moveSelection(direction) {
    if (this._starting || this.orderDialogNodes) return;
    const current = regions.findIndex((region) => region.id === this.selectedRegionId);
    const next = Phaser.Math.Clamp(current + direction, 0, regions.length - 1);
    this.selectedRegionId = regions[next]?.id || regions[0].id;
    this.refreshSelection();
  }

  openDex() {
    if (this._starting || this.orderDialogNodes) return;
    this._starting = true;
    this.scene.start("DexScene", {
      from: "WorldMapScene",
      regionId: this.selectedRegionId
    });
  }

  startSelectedRegion() {
    if (this._starting || this.orderDialogNodes) return;
    const index = regions.findIndex((region) => region.id === this.selectedRegionId);
    if (!this.isRegionUnlocked(index)) {
      this.openOrderDialog(this.selectedRegionId);
      return;
    }
    this.beginRegion(this.selectedRegionId);
  }

  openOrderDialog(regionId) {
    const target = regions.find((region) => region.id === regionId);
    const mission = regions.find((region) => region.id === this.missionRegionId) || regions[0];
    if (!target || this.orderDialogNodes) return;

    const { width, height } = this.cameras.main;
    this.orderDialogTargetId = regionId;
    const blocker = this.add.rectangle(width / 2, height / 2, width, height, 0x19261c, 0.72)
      .setScrollFactor(0)
      .setDepth(2000)
      .setInteractive();
    const panel = createWoodPanel(this, width / 2, height / 2, 540, 190)
      .setScrollFactor(0)
      .setDepth(2001)
      .setName("world-map-order-dialog");
    const title = this.add.text(width / 2, 124, "탐험 순서를 바꿀까요?", {
      fontFamily: KOREAN_FONT,
      fontSize: "21px",
      color: "#3d2410",
      fontStyle: "bold"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
    const body = this.add.text(width / 2, 164, `미션이 '${ORDER_LABELS[mission.id]}' 순서예요.\n${ORDER_LABELS[target.id]} 지역으로 먼저 이동할까요?`, {
      fontFamily: KOREAN_FONT,
      fontSize: "13px",
      color: "#5d4a38",
      align: "center",
      lineSpacing: 5
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
    const confirm = createWoodButton(this, 232, 230, "이 지역으로 이동", () => this.beginRegion(regionId), {
      width: 210,
      height: 44,
      fontSize: "15px",
      tint: 0xffe08a,
      depth: 2003
    }).setName("world-map-order-confirm");
    const keep = createWoodButton(this, 456, 230, "현재 순서 유지", () => this.closeOrderDialog({ restoreMission: true }), {
      width: 190,
      height: 44,
      fontSize: "14px",
      depth: 2003
    }).setName("world-map-order-keep");
    this.orderDialogNodes = [blocker, panel, title, body, confirm, keep];
  }

  closeOrderDialog({ restoreMission = false } = {}) {
    this.orderDialogNodes?.forEach((node) => node.destroy(true));
    this.orderDialogNodes = null;
    this.orderDialogTargetId = null;
    if (restoreMission) {
      this.selectedRegionId = this.missionRegionId;
      this.refreshSelection();
    }
  }

  beginRegion(regionId) {
    if (this._starting) return;
    this._starting = true;
    this.closeOrderDialog();
    this.cameras.main.fadeOut(220, 24, 16, 8);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start("OverworldScene", { startRegionId: regionId });
    });
  }
}
