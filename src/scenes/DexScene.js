// 도감 — 지역 탭 + 카드 그리드 (수집: 사진, 미수집: 실루엣 ?)
import Phaser from "phaser/dist/phaser-arcade-physics.min.js";
import { regions, regionById, animalEmoji } from "../data/regions.js";
import { animalById } from "../data/animals.js";
import { readCollected, regionStatus, masterStatus, hasBadge } from "../systems/ProgressStore.js";
import { ensureAnimalTexture } from "../world/AnimalSprites.js";
import { KOREAN_FONT, createWoodButton, createWoodPanel } from "../ui/UiHelpers.js";

export default class DexScene extends Phaser.Scene {
  constructor() {
    super("DexScene");
  }

  init(data = {}) {
    this._leaving = false;
    this.detailRoot = null;
    this.detailCloseButton = null;
    this.detailAnimalId = null;
    this.from = data.from || "TitleScene";
    this.returnPos = data.returnPos || null;
    this.highlightId = data.highlightId || null;
    this.regionId = data.regionId || this.findRegionOf(this.highlightId) || "around";
  }

  findRegionOf(animalId) {
    if (!animalId) return null;
    const region = regions.find((r) => r.spawns.some((s) => s.id === animalId));
    return region?.id || null;
  }

  create() {
    const { width, height } = this.cameras.main;
    this.add.rectangle(width / 2, height / 2, width, height, 0xf3ebd2);
    this.add.rectangle(width / 2, 26, width, 52, 0x8fc47a, 0.4);

    const master = masterStatus();
    this.add.text(16, 14, "📖 동물 도감", {
      fontFamily: KOREAN_FONT, fontSize: "20px", color: "#0f6f68", fontStyle: "bold"
    });
    this.add.text(16, 38, `전체 ${master.count} / ${master.target}${master.complete ? " · 🏆 도감 마스터!" : ""}`, {
      fontFamily: KOREAN_FONT, fontSize: "12px", color: "#5d4a38"
    });

    const backLabel = this.from === "OverworldScene"
      ? "← 탐험으로"
      : this.from === "WorldMapScene"
        ? "← 월드맵"
        : "← 시작으로";
    this.backButton = createWoodButton(this, width - 66, 26, backLabel, () => this.goBack(), {
      width: 116,
      height: 42,
      fontSize: "13px"
    }).setName("dex-back-button");

    this.input.keyboard?.on("keydown-ESC", () => this.goBack());
    this.input.keyboard?.on("keydown-D", () => this.goBack());

    this.buildTabs();
    this.cardNodes = [];
    this.renderRegion();
  }

  goBack() {
    if (this._leaving) return;
    this._leaving = true;
    if (this.detailRoot) {
      this.closeDetail();
      this._leaving = false;
    } else if (this.from === "OverworldScene") {
      this.scene.start("OverworldScene", { returnPos: this.returnPos });
    } else if (this.from === "WorldMapScene") {
      this.scene.start("WorldMapScene", { selectedRegionId: this.regionId });
    } else {
      this.scene.start("TitleScene");
    }
  }

  buildTabs() {
    const { width } = this.cameras.main;
    const tabW = (width - 24) / regions.length;
    this.tabButtons = regions.map((region, i) => {
      const status = regionStatus(region.id);
      const badge = hasBadge(region.id) ? "🎖" : "";
      const label = `${region.emoji} ${region.short} ${status.count}/${status.target}${badge}`;
      const btn = createWoodButton(
        this,
        12 + tabW / 2 + i * tabW,
        72,
        label,
        () => {
          this.regionId = region.id;
          this.refreshTabs();
          this.renderRegion();
        },
        { width: tabW - 6, height: 30, fontSize: "11px" }
      );
      btn.regionId = region.id;
      return btn;
    });
    this.refreshTabs();
  }

  refreshTabs() {
    this.tabButtons.forEach((btn) => {
      const active = btn.regionId === this.regionId;
      btn.buttonBg.setTint?.(active ? 0xffe08a : 0xd9c8a8);
      btn.setAlpha(active ? 1 : 0.85);
    });
  }

  renderRegion() {
    this.cardNodes.forEach((n) => n.destroy(true));
    this.cardNodes = [];

    const { width } = this.cameras.main;
    const region = regionById[this.regionId];
    const collected = new Set(readCollected());

    const intro = this.add.text(width / 2, 96, `${region.emoji} ${region.name} — ${region.intro}`, {
      fontFamily: KOREAN_FONT, fontSize: "11px", color: "#5d4a38"
    }).setOrigin(0.5);
    this.cardNodes.push(intro);

    const cols = 4;
    const cardW = 148;
    const cardH = 116;
    const startX = width / 2 - ((cols - 1) * cardW) / 2;
    const startY = 168;

    region.spawns.forEach((spawn, index) => {
      const animal = animalById[spawn.id];
      if (!animal) return;
      const got = collected.has(spawn.id);
      const cx = startX + (index % cols) * cardW;
      const cy = startY + Math.floor(index / cols) * cardH;

      const root = this.add.container(cx, cy);
      root.setName(`dex-card-${spawn.id}`);
      this.cardNodes.push(root);

      const panel = createWoodPanel(this, 0, 2, cardW - 10, cardH - 2, {
        tint: got ? null : 0xcfc4ae
      });
      root.buttonBg = panel;
      if (got) {
        panel.setInteractive({ useHandCursor: true });
        panel.on("pointerdown", () => panel.setTint?.(0xffe08a));
        panel.on("pointerout", () => panel.clearTint?.());
        panel.on("pointerup", () => {
          panel.clearTint?.();
          this.showDetail(spawn.id);
        });
      }
      if (this.highlightId === spawn.id) {
        const glow = this.add.rectangle(0, 0, cardW - 4, cardH - 2, 0xffd84d, 0.25);
        root.add(glow);
      }
      root.add(panel);

      // 사진 or 실루엣
      if (got && animal.image) {
        const key = `animal-${spawn.id}`;
        const holder = this.add.container(0, -14);
        root.add(holder);
        const drawThumb = () => {
          if (!this.textures.exists(key) || !this.scene.isActive()) return;
          holder.add(this.add.image(0, 0, key).setDisplaySize(58, 58));
        };
        if (this.textures.exists(key)) {
          drawThumb();
        } else {
          this.load.image(key, animal.image);
          this.load.once(Phaser.Loader.Events.COMPLETE, drawThumb);
          this.load.start();
        }
      } else {
        // 미수집: 자체 제작 픽셀 실루엣 (모양 힌트) — 없으면 ? 표시
        const miniKey = ensureAnimalTexture(this, spawn.id);
        if (miniKey) {
          const silhouette = this.add.image(0, -14, miniKey).setDisplaySize(48, 48);
          if (!got) {
            silhouette.setTintFill(0x6b5844);
            silhouette.setAlpha(0.85);
          }
          root.add(silhouette);
          if (!got) {
            root.add(this.add.text(16, -28, "?", {
              fontSize: "15px", fontFamily: KOREAN_FONT, color: "#8a6a4a", fontStyle: "bold"
            }).setOrigin(0.5));
          }
        } else {
          const circle = this.add.circle(0, -14, 26, 0x6b5844, got ? 0.25 : 0.75);
          const mark = this.add.text(0, -14, "?", {
            fontSize: "22px", fontFamily: KOREAN_FONT, color: "#fff8e7"
          }).setOrigin(0.5);
          root.add([circle, mark]);
        }
      }

      const title = got ? `${animalEmoji[spawn.id] || ""} ${animal.name}` : "???";
      root.add(this.add.text(0, 20, title, {
        fontFamily: KOREAN_FONT, fontSize: "13px", color: "#3d2410", fontStyle: "bold"
      }).setOrigin(0.5));
      root.add(this.add.text(0, 38, got ? animal.habitat : `${spawn.zone}에서 만나요`, {
        fontFamily: KOREAN_FONT, fontSize: "9px", color: "#6b5a44",
        align: "center", wordWrap: { width: cardW - 30 }
      }).setOrigin(0.5));
    });
  }

  showDetail(animalId) {
    if (!readCollected().includes(animalId)) return;
    const animal = animalById[animalId];
    if (!animal) return;

    this.closeDetail();
    this.detailAnimalId = animalId;

    const { width, height } = this.cameras.main;
    const region = regions.find((item) => item.spawns.some((spawn) => spawn.id === animalId));
    const root = this.add.container(0, 0).setDepth(3000).setName("dex-detail");
    const blocker = this.add.rectangle(width / 2, height / 2, width, height, 0x15251d, 0.78)
      .setInteractive();
    const panel = createWoodPanel(this, width / 2, height / 2, 584, 316);
    const portraitFrame = createWoodPanel(this, 124, 142, 160, 156, { tint: 0xd8c79f });
    root.add([blocker, panel, portraitFrame]);

    const portraitKey = `animal-${animalId}`;
    if (this.textures.exists(portraitKey)) {
      root.add(this.add.image(124, 142, portraitKey).setDisplaySize(140, 136));
    } else {
      const fallbackKey = ensureAnimalTexture(this, animalId);
      if (fallbackKey) root.add(this.add.image(124, 142, fallbackKey).setDisplaySize(112, 112));
      else root.add(this.add.text(124, 142, animalEmoji[animalId] || "?", { fontSize: "52px" }).setOrigin(0.5));
    }

    root.add(this.add.text(220, 38, `${animalEmoji[animalId] || ""} ${animal.name}`, {
      fontFamily: KOREAN_FONT,
      fontSize: "24px",
      color: "#3d2410",
      fontStyle: "bold"
    }));
    root.add(this.add.text(220, 70, `${region?.emoji || ""} ${region?.name || animal.habitat} · 교과서 ${animal.page}`, {
      fontFamily: KOREAN_FONT,
      fontSize: "11px",
      color: "#6b4226"
    }));
    root.add(this.add.text(220, 98, `사는 곳  ${animal.habitat}\n움직임  ${animal.move}\n생김새  ${animal.body.join(", ")}`, {
      fontFamily: KOREAN_FONT,
      fontSize: "12px",
      color: "#3d2410",
      lineSpacing: 5,
      wordWrap: { width: 360 }
    }));
    root.add(this.add.text(220, 178, `관찰 포인트\n${animal.point}`, {
      fontFamily: KOREAN_FONT,
      fontSize: "11px",
      color: "#5d4a38",
      fontStyle: "bold",
      lineSpacing: 3,
      wordWrap: { width: 360 }
    }));
    root.add(this.add.text(220, 232, `환경과의 관계\n${animal.relation}`, {
      fontFamily: KOREAN_FONT,
      fontSize: "11px",
      color: "#5d4a38",
      fontStyle: "bold",
      lineSpacing: 3,
      wordWrap: { width: 360 }
    }));
    root.add(this.add.text(124, 242, "✓ 포획 완료", {
      fontFamily: KOREAN_FONT,
      fontSize: "13px",
      color: "#2d6a3f",
      fontStyle: "bold"
    }).setOrigin(0.5));

    this.detailRoot = root;
    this.detailCloseButton = createWoodButton(this, 510, 316, "← 도감으로", () => this.closeDetail(), {
      width: 150,
      height: 40,
      fontSize: "14px",
      tint: 0xffe08a,
      depth: 3100
    }).setName("dex-detail-close");
  }

  closeDetail() {
    this.detailRoot?.destroy(true);
    this.detailCloseButton?.destroy(true);
    this.detailRoot = null;
    this.detailCloseButton = null;
    this.detailAnimalId = null;
  }
}
