// 에셋 로드 → 타이틀로 이동
// Sprout Lands 타일·오브젝트·UI를 16px/32px/48px 프레임으로 잘라 씁니다.
import Phaser from "phaser/dist/phaser-arcade-physics.min.js";
import { KOREAN_FONT } from "../ui/UiHelpers.js";
import { preloadAnimalAtlases } from "../world/AnimalSprites.js";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.add.text(w / 2, h / 2 - 24, "동물도감 모험 준비 중...", {
      fontFamily: KOREAN_FONT,
      fontSize: "20px",
      color: "#fff8e7"
    }).setOrigin(0.5);

    this.add.rectangle(w / 2, h / 2 + 24, 240, 16, 0x2d1b0e, 0.4);
    const bar = this.add.rectangle(w / 2 - 118, h / 2 + 24, 4, 12, 0xf0d9a0).setOrigin(0, 0.5);
    this.load.on("progress", (value) => {
      bar.width = Math.max(4, 236 * value);
    });

    const base = "assets/sprout-lands";

    // ── 타일셋 (16×16) ──
    this.load.spritesheet("tiles-grass", `${base}/sprites/Tilesets/Grass.png`, {
      frameWidth: 16, frameHeight: 16
    });
    this.load.spritesheet("tiles-water", `${base}/sprites/Tilesets/Water.png`, {
      frameWidth: 16, frameHeight: 16
    });
    this.load.spritesheet("tiles-hills", `${base}/sprites/Tilesets/Hills.png`, {
      frameWidth: 16, frameHeight: 16
    });
    this.load.spritesheet("tiles-fence", `${base}/sprites/Tilesets/Fences.png`, {
      frameWidth: 16, frameHeight: 16
    });
    // 모래·흙 (사막/해변/길) — Grass와 같은 블롭 배치의 Wide v2 시트
    this.load.spritesheet("tiles-sand", `${base}/sprites/Tilesets/Tilled_Dirt_Wide_v2.png`, {
      frameWidth: 16, frameHeight: 16
    });
    this.load.spritesheet("obj-path", `${base}/sprites/Objects/Paths.png`, {
      frameWidth: 16, frameHeight: 16
    });

    // ── 장식 오브젝트 ──
    this.load.spritesheet("obj-biom", `${base}/sprites/Objects/Basic Grass Biom things 1.png`, {
      frameWidth: 16, frameHeight: 16
    });
    this.load.spritesheet("obj-bridge", `${base}/sprites/Objects/Wood Bridge.png`, {
      frameWidth: 16, frameHeight: 16
    });
    this.load.spritesheet("obj-chest", `${base}/sprites/Objects/Chest.png`, {
      frameWidth: 48, frameHeight: 48
    });
    this.load.image("obj-coop", `${base}/sprites/Objects/Free_Chicken_House.png`);

    // ── 캐릭터 (48×48, 4×4: 아래/위/왼쪽/오른쪽) ──
    this.load.spritesheet("player", `${base}/sprites/Characters/Basic Charakter Spritesheet.png`, {
      frameWidth: 48, frameHeight: 48
    });
    this.load.spritesheet("npc-chicken", `${base}/sprites/Characters/Free Chicken Sprites.png`, {
      frameWidth: 16, frameHeight: 16
    });
    this.load.spritesheet("npc-cow", `${base}/sprites/Characters/Free Cow Sprites.png`, {
      frameWidth: 32, frameHeight: 32
    });
    preloadAnimalAtlases(this);

    // ── UI ──
    this.load.image("ui-dialog", `${base}/ui/Sprite sheets/Dialouge UI/dialog box.png`);
    this.load.image("ui-dialog-tail", `${base}/ui/Sprite sheets/Dialouge UI/dialog box big.png`);
    this.load.spritesheet("ui-hearts", `${base}/ui/emojis-free/emoji style ui/Inventory_Herat_Spritesheet.png`, {
      frameWidth: 16, frameHeight: 16
    });
    this.load.spritesheet("ui-emotes", `${base}/ui/Sprite sheets/Dialouge UI/Emotes/Teemo Basic emote animations sprite sheet.png`, {
      frameWidth: 32, frameHeight: 32
    });
  }

  create() {
    this.createPlayerAnims();
    this.createNpcAnims();
    this.createWaterAnim();
    this.scene.start("TitleScene");
  }

  createPlayerAnims() {
    if (this.anims.exists("walk-down")) return;
    // 각 방향 행의 1~3열이 걷기, 0열이 idle (행: 아래/위/왼쪽/오른쪽)
    const rows = { down: 0, up: 1, left: 2, right: 3 };
    Object.entries(rows).forEach(([dir, row]) => {
      const start = row * 4;
      this.anims.create({
        key: `walk-${dir}`,
        frames: this.anims.generateFrameNumbers("player", {
          frames: [start + 1, start + 2, start + 3, start + 2]
        }),
        frameRate: 8,
        repeat: -1
      });
      this.anims.create({
        key: `idle-${dir}`,
        frames: this.anims.generateFrameNumbers("player", { frames: [start, start + 1] }),
        frameRate: 2,
        repeat: -1
      });
    });
  }

  createNpcAnims() {
    if (!this.anims.exists("chicken-walk") && this.textures.exists("npc-chicken")) {
      this.anims.create({
        key: "chicken-idle",
        frames: this.anims.generateFrameNumbers("npc-chicken", { frames: [0, 1] }),
        frameRate: 3,
        repeat: -1
      });
      this.anims.create({
        key: "chicken-walk",
        frames: this.anims.generateFrameNumbers("npc-chicken", { frames: [4, 5, 6, 7] }),
        frameRate: 8,
        repeat: -1
      });
    }
    if (!this.anims.exists("cow-walk") && this.textures.exists("npc-cow")) {
      this.anims.create({
        key: "cow-idle",
        frames: this.anims.generateFrameNumbers("npc-cow", { frames: [0, 1, 2, 1] }),
        frameRate: 3,
        repeat: -1
      });
      this.anims.create({
        key: "cow-walk",
        frames: this.anims.generateFrameNumbers("npc-cow", { frames: [3, 4] }),
        frameRate: 6,
        repeat: -1
      });
    }
  }

  createWaterAnim() {
    if (!this.anims.exists("water-shine") && this.textures.exists("tiles-water")) {
      this.anims.create({
        key: "water-shine",
        frames: this.anims.generateFrameNumbers("tiles-water", { start: 0, end: 3 }),
        frameRate: 3,
        repeat: -1
      });
    }
  }
}
