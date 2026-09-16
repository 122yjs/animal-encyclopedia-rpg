// 에셋 로드 → 타이틀로 이동
// 타이틀에 필요한 그림만 받습니다 — 지역 배경(768×1088 × 5장)과 동물 아틀라스는 월드맵이 받습니다.
// Sprout Lands 시트는 타이틀 장식·캐릭터 애니메이션·잠긴 문 울타리에 남은 것만 16px로 자릅니다.
import Phaser from "phaser/dist/phaser-arcade-physics.min.js";
import titleParkUrl from "../assets/detailed-pixel/title-park.webp?url";
import { KOREAN_FONT } from "../ui/UiHelpers.js";

const TITLE_ART_KEY = "title-park";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    const label = this.add.text(0, 0, "동물도감 모험 준비 중...", {
      fontFamily: KOREAN_FONT,
      fontSize: "20px",
      color: "#f4ebc8"
    }).setOrigin(0.5);
    const track = this.add.rectangle(0, 0, 240, 16, 0x5c536a, 0.9);
    const bar = this.add.rectangle(0, 0, 4, 12, 0xcbd784).setOrigin(0, 0.5);

    const layoutLoader = () => {
      const w = this.scale.gameSize.width;
      const h = this.scale.gameSize.height;
      this.cameras.main.setSize(w, h);
      label.setPosition(w / 2, h / 2 - 24);
      track.setPosition(w / 2, h / 2 + 24);
      bar.setPosition(w / 2 - 118, h / 2 + 24);
    };
    layoutLoader();
    this.scale.on("resize", layoutLoader);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off("resize", layoutLoader));

    this.load.on("progress", (value) => {
      bar.width = Math.max(4, 236 * value);
    });

    const base = "assets/sprout-lands";

    // ── 타이틀 배경 ──
    this.load.image(TITLE_ART_KEY, titleParkUrl);

    // ── 잠긴 문 울타리 (16×16) — 문이 닫힐 때 길을 막는 조각 ──
    this.load.spritesheet("tiles-fence", `${base}/sprites/Tilesets/Fences.png`, {
      frameWidth: 16, frameHeight: 16
    });

    // ── 캐릭터 (플레이어 48×48, 4×4: 아래/위/왼쪽/오른쪽) ──
    this.load.spritesheet("player", `${base}/sprites/Characters/Basic Charakter Spritesheet.png`, {
      frameWidth: 48, frameHeight: 48
    });
    this.load.spritesheet("celebration-player-happy", `${base}/celebration/celebration-player-happy.png`, {
      frameWidth: 32, frameHeight: 32
    });
    this.load.spritesheet("failure-player-gentle", `${base}/failure/failure-player-gentle.png`, {
      frameWidth: 32, frameHeight: 32
    });
    this.load.spritesheet("npc-chicken", `${base}/sprites/Characters/Free Chicken Sprites.png`, {
      frameWidth: 16, frameHeight: 16
    });
    this.load.spritesheet("npc-cow", `${base}/sprites/Characters/Free Cow Sprites.png`, {
      frameWidth: 32, frameHeight: 32
    });

  }

  create() {
    this.createPlayerAnims();
    this.createCelebrationAnims();
    this.createFailureAnims();
    this.createNpcAnims();
    // 고해상 픽셀 그림을 화면에 맞춰 줄일 때는 선형 보간이 디테일을 살립니다.
    if (this.textures.exists(TITLE_ART_KEY)) {
      this.textures.get(TITLE_ART_KEY).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
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
      // 수영: 기존 시트 각 방향 0·1열 두 자세 (발은 오버월드에서 crop)
      this.anims.create({
        key: `swim-${dir}`,
        frames: this.anims.generateFrameNumbers("player", { frames: [start, start + 1] }),
        frameRate: 4,
        repeat: -1
      });
    });
  }

  createCelebrationAnims() {
    if (this.anims.exists("celebration-player-happy")) return;
    // Sprout Lands 원본 이모트의 준비 자세와 눈웃음 자세를 차례로 재생합니다.
    this.anims.create({
      key: "celebration-player-happy",
      frames: this.anims.generateFrameNumbers("celebration-player-happy", { frames: [0, 1] }),
      frameRate: 6,
      // 한 번 재생한 뒤 마지막 눈웃음 프레임을 유지해 결과 화면에서도 표정이 보이게 합니다.
      repeat: 0
    });
  }

  createFailureAnims() {
    if (this.anims.exists("failure-player-gentle")) return;
    // 원본의 작은 실망 표정만 한 번 재생하고, 마지막 눈 감은 자세를 유지합니다.
    this.anims.create({
      key: "failure-player-gentle",
      frames: this.anims.generateFrameNumbers("failure-player-gentle", { frames: [0, 1, 2] }),
      frameRate: 6,
      repeat: 0
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

}
