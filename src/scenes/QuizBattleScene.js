// 턴제 퀴즈 배틀 — 포켓몬식 전투에 관찰 학습을 결합했습니다.
//   내 턴: 관찰 퀴즈에 답해 공격 (정답 = 동물 기력 -1)
//   동물 턴: 오답이면 "헷갈리기 공격" (내 하트 -1) → 관찰 단서를 다시 읽고 같은 문제 재도전
//   기력을 모두 빼면 친구가 되어 도감에 등록! 하트가 다 닳으면 잠시 후퇴(불이익 없음).
import Phaser from "phaser/dist/phaser-arcade-physics.min.js";
import { animalById } from "../data/animals.js";
import { animalEmoji } from "../data/regions.js";
import { buildQuestions } from "../systems/QuizBuilder.js";
import {
  buildObservationDetails,
  buildQuickFacts,
  getHintSection,
  getQuestionTypeLabel,
  withParticle
} from "../systems/ObservationBuilder.js";
import { collectAnimal, isCollected, regionStatus } from "../systems/ProgressStore.js";
import { ensureAnimalTexture, ensureBallTexture } from "../world/AnimalSprites.js";
import {
  KOREAN_FONT,
  createWoodButton,
  createWoodPanel,
  createHeartRow,
  fitTextToBox,
  playEmote
} from "../ui/UiHelpers.js";

const MAX_HEARTS = 3;
const HINT_LOCK_MS = 2500;
const ENCOUNTER_INTRO_MS = 650;
const OBSERVATION_AUTO_ADVANCE_MS = 260;

const BATTLE_LAYOUT = Object.freeze({
  intro: {
    enemy: { x: 500, y: 92 },
    player: { x: 150, y: 272, scale: 3 },
    enemyPlatform: { x: 500, y: 148, width: 144, height: 30 },
    playerPlatform: { x: 150, y: 314, width: 176, height: 46 }
  },
  observe: {
    panel: { x: 320, y: 200, width: 600, height: 300 },
    photo: { x: 320, y: 111, width: 384, height: 120 },
    stage: { x: 320, y: 187, width: 544, height: 28 },
    learning: { x: 320, y: 236, width: 544, height: 68 }
  },
  overview: {
    panel: { x: 320, y: 196, width: 600, height: 292 },
    photo: { x: 320, y: 158, width: 384, height: 176 }
  },
  battle: {
    enemy: { x: 528, y: 88 },
    player: { x: 130, y: 134, scale: 1.5 },
    enemyPlatform: { x: 528, y: 148, width: 124, height: 24 },
    playerPlatform: { x: 130, y: 166, width: 124, height: 16 },
    enemyStatus: { x: 120, y: 73 },
    playerStatus: { x: 352, y: 147 }
  },
  question: {
    panel: { x: 320, y: 196, width: 616, height: 52 },
    optionY: [245, 284, 323],
    optionHeight: 36
  },
  hint: {
    panel: { x: 320, y: 264, width: 600, height: 172 }
  }
});

export default class QuizBattleScene extends Phaser.Scene {
  constructor() {
    super("QuizBattleScene");
  }

  init(data) {
    this.animalId = data.animalId;
    this.regionId = data.regionId || null;
    this.returnPos = data.returnPos || null;
    this.animal = animalById[this.animalId];
    this.uiNodes = [];
    this.optionButtons = [];
    this.observePage = 0;
    this.observeChecks = { appearance: false, lifestyle: false, habitat: false };
    this.observationStage = "overview";
    this.phase = "intro";
    this.busy = false;
    this.ballThrown = false;
    this.returningToOverworld = false;
  }

  create() {
    this.cameras.main.fadeIn(240, 24, 16, 8);
    const { width, height } = this.cameras.main;

    if (!this.animal) {
      this.add.text(width / 2, height / 2, "동물을 찾을 수 없어요", {
        fontFamily: KOREAN_FONT, fontSize: "18px", color: "#fff"
      }).setOrigin(0.5);
      this.time.delayedCall(1200, () => this.returnToOverworld());
      return;
    }

    if (isCollected(this.animal.id)) {
      this.add.rectangle(width / 2, height / 2, width, height, 0x3f7a32);
      this.add.text(width / 2, height / 2, `${this.animal.name}은(는) 이미 도감 친구예요!`, {
        fontFamily: KOREAN_FONT, fontSize: "16px", color: "#fff8e7"
      }).setOrigin(0.5);
      this.time.delayedCall(1300, () => this.returnToOverworld());
      return;
    }

    this.observation = buildObservationDetails(this.animal);
    this.quickFacts = buildQuickFacts(this.animal);
    this.questions = buildQuestions(this.animal);
    this.qIndex = 0;
    this.playerHearts = MAX_HEARTS;
    this.enemyGauge = this.questions.length;

    this.buildStage();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cancelObservationAdvance();
      this.game.canvas.style.imageRendering = "pixelated";
    });
    this.showIntro();
  }

  // ─── 전투 무대 ──────────────────────────────────────────

  buildStage() {
    const { width, height } = this.cameras.main;
    const emoji = animalEmoji[this.animal.id] || "❓";

    // 배경 (들판 느낌)
    this.add.rectangle(width / 2, height * 0.32, width, height * 0.64, 0x9ccf7e);
    this.add.rectangle(width / 2, height * 0.82, width, height * 0.36, 0x77b45f);
    this.add.rectangle(width / 2, 10, width, 20, 0xbfe3a0, 0.5);

    // 발판은 단계별 레이아웃에 맞춰 위치와 노출을 바꿉니다.
    this.enemyPlatform = this.add.ellipse(0, 0, 144, 30, 0x639b4d, 0.85).setDepth(2);
    this.playerPlatform = this.add.ellipse(0, 0, 176, 46, 0x639b4d, 0.85).setDepth(2);

    // ── 적(동물) 카드 ──
    this.enemyRoot = this.add.container(0, 0).setDepth(10).setName("enemy-card");
    this.enemyVisualRoot = this.add.container(0, 0);
    const card = createWoodPanel(this, 0, 0, 120, 96);
    const photoBed = this.add.rectangle(0, -8, 104, 64, 0xe7d7b6)
      .setStrokeStyle(2, 0x8a6640);
    this.enemyPhotoHolder = this.add.container(0, -8);
    // 사진이 오기 전까지는 자체 제작 미니 스프라이트(없으면 이모지)로 표시
    const miniKey = ensureAnimalTexture(this, this.animal.id);
    this.enemyEmojiText = miniKey
      ? this.add.image(0, 0, miniKey).setDisplaySize(64, 64)
      : this.add.text(0, 0, emoji, {
        fontSize: "42px", fontFamily: KOREAN_FONT
      }).setOrigin(0.5);
    this.enemyEmojiText.setName("enemy-fallback");
    this.enemyPhotoHolder.add(this.enemyEmojiText);
    const plate = createWoodPanel(this, 0, 34, 104, 22, { tint: 0xffe9bd });
    const nameText = this.add.text(0, 34, `${emoji} ${this.animal.name}`, {
      fontFamily: KOREAN_FONT, fontSize: "11px", color: "#3d2410", fontStyle: "bold"
    }).setOrigin(0.5);
    this.enemyVisualRoot.add([card, photoBed, this.enemyPhotoHolder, plate, nameText]);
    this.enemyRoot.add(this.enemyVisualRoot);

    this.loadEnemyPhoto();

    // ── 플레이어 ──
    this.playerSprite = this.add.sprite(0, 0, "player", 4).setDepth(5).setName("battle-player");
    this.playerSprite.play("idle-up");

    const enemyStatus = this.createStatusCard({
      name: "enemy-status",
      label: `${this.animal.name} 기력`,
      max: this.enemyGauge
    });
    this.enemyStatusRoot = enemyStatus.root;
    this.enemyHearts = enemyStatus.hearts;

    const playerStatus = this.createStatusCard({
      name: "player-status",
      label: "나",
      max: MAX_HEARTS
    });
    this.playerStatusRoot = playerStatus.root;
    this.playerHeartRow = playerStatus.hearts;

    // ── 턴 리본 ──
    this.turnPanel = createWoodPanel(this, width / 2, 20, 300, 36).setDepth(1001);
    this.turnText = this.add.text(width / 2, 20, "", {
      fontFamily: KOREAN_FONT, fontSize: "12px", color: "#3d2410", fontStyle: "bold"
    }).setOrigin(0.5).setDepth(1002);

    // 도망 버튼 (승리 후에는 숨김)
    this.fleeButton = createWoodButton(this, width - 26, 22, "도망", () => {
      if (this.phase === "victory" || this.returningToOverworld) return;
      this.returnToOverworld();
    }, { width: 48, height: 42, fontSize: "12px" }).setName("battle-flee");

    // 레이아웃 기준점은 고정하고 내부 시각 요소만 둥실거리게 합니다.
    this.enemyFloatTween = this.tweens.add({
      targets: this.enemyVisualRoot,
      y: "+=3",
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    this.applyPhaseLayout("intro");
  }

  createStatusCard({ name, label, max }) {
    const root = this.add.container(0, 0)
      .setDepth(1002)
      .setScrollFactor(0)
      .setName(name);
    const panel = createWoodPanel(this, 0, 0, 192, 42, { tint: 0xffedc5 });
    const labelText = this.add.text(-82, 0, label, {
      fontFamily: KOREAN_FONT,
      fontSize: "11px",
      color: "#3d2410",
      fontStyle: "bold"
    }).setOrigin(0, 0.5);
    const hearts = createHeartRow(this, 18, 0, max, { size: 20, gap: 3, depth: 0 });
    root.add([panel, labelText, hearts.container]);
    return { root, hearts };
  }

  setBattleHudVisible(visible) {
    this.enemyStatusRoot?.setVisible(visible);
    this.playerStatusRoot?.setVisible(visible);
  }

  applyPhaseLayout(mode) {
    const isObserve = mode === "observe";
    const isOverview = mode === "overview";
    const isObservation = isObserve || isOverview;
    const isBattle = mode === "battle" || mode === "hint";
    const isIntro = mode === "intro";
    const layout = isIntro ? BATTLE_LAYOUT.intro : BATTLE_LAYOUT.battle;
    const enemyLayout = layout.enemy;

    this.presentationMode = mode;
    this.game.canvas.style.imageRendering = isObservation ? "auto" : "pixelated";
    this.enemyRoot?.setPosition(enemyLayout.x, enemyLayout.y).setVisible(!isObservation).setScale(1).setAngle(0);

    if (isBattle) {
      this.enemyFloatTween?.restart();
    } else {
      this.enemyFloatTween?.pause();
      if (this.enemyVisualRoot) this.enemyVisualRoot.y = 0;
    }

    if (isObservation) {
      this.playerSprite?.setVisible(false);
      this.enemyPlatform?.setVisible(false);
      this.playerPlatform?.setVisible(false);
      this.setBattleHudVisible(false);
      return;
    }

    this.playerSprite
      ?.setVisible(true)
      .setPosition(layout.player.x, layout.player.y)
      .setScale(layout.player.scale)
      .clearTint();

    this.enemyPlatform
      ?.setVisible(true)
      .setPosition(layout.enemyPlatform.x, layout.enemyPlatform.y)
      .setDisplaySize(layout.enemyPlatform.width, layout.enemyPlatform.height);
    this.playerPlatform
      ?.setVisible(true)
      .setPosition(layout.playerPlatform.x, layout.playerPlatform.y)
      .setDisplaySize(layout.playerPlatform.width, layout.playerPlatform.height);

    this.setBattleHudVisible(isBattle);
    if (isBattle) {
      this.enemyStatusRoot?.setPosition(BATTLE_LAYOUT.battle.enemyStatus.x, BATTLE_LAYOUT.battle.enemyStatus.y);
      this.playerStatusRoot?.setPosition(BATTLE_LAYOUT.battle.playerStatus.x, BATTLE_LAYOUT.battle.playerStatus.y);
    }
  }

  loadEnemyPhoto() {
    if (!this.animal.image) return;
    const expectedAnimalId = this.animal.id;
    const expectedHolder = this.enemyPhotoHolder;
    const expectedFallback = this.enemyEmojiText;
    const key = `animal-${this.animal.id}`;
    this.enemyPhotoKey = key;
    const place = () => {
      if (
        !this.textures.exists(key)
        || !this.scene.isActive()
        || this.animal?.id !== expectedAnimalId
        || this.enemyPhotoHolder !== expectedHolder
        || !expectedHolder.active
      ) return;
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
      expectedFallback.setVisible(false);
      this.enemyCardPhoto?.destroy();
      const frame = this.textures.getFrame(key);
      const targetWidth = 104;
      const targetHeight = 64;
      const targetRatio = targetWidth / targetHeight;
      const sourceRatio = frame.width / frame.height;
      let cropX = 0;
      let cropY = 0;
      let cropWidth = frame.width;
      let cropHeight = frame.height;
      if (sourceRatio > targetRatio) {
        cropWidth = frame.height * targetRatio;
        cropX = (frame.width - cropWidth) / 2;
      } else {
        cropHeight = frame.width / targetRatio;
        cropY = (frame.height - cropHeight) / 2;
      }
      const photo = this.add.image(0, 0, key)
        .setCrop(cropX, cropY, cropWidth, cropHeight)
        .setDisplaySize(targetWidth, targetHeight)
        .setName("enemy-photo");
      this.enemyCardPhoto = photo;
      expectedHolder.add(photo);
      this.refreshObservationPhoto();
    };
    if (this.textures.exists(key)) {
      place();
    } else {
      this.load.image(key, this.animal.image);
      this.load.once(Phaser.Loader.Events.COMPLETE, place);
      this.load.start();
    }
  }

  refreshObservationPhoto() {
    const holder = this.overviewPhotoHolder;
    if (!holder?.active) return;
    holder.removeAll(true);
    const isDetails = this.observationStage === "details";
    const photoLayout = isDetails ? BATTLE_LAYOUT.observe.photo : BATTLE_LAYOUT.overview.photo;
    const photoName = isDetails ? "observe-photo" : "overview-photo";
    const fallbackName = isDetails ? "observe-photo-fallback" : "overview-photo-fallback";

    if (this.enemyPhotoKey && this.textures.exists(this.enemyPhotoKey)) {
      const frame = this.textures.getFrame(this.enemyPhotoKey);
      const maxWidth = photoLayout.width - 12;
      const maxHeight = photoLayout.height - 12;
      const scale = Math.min(maxWidth / frame.width, maxHeight / frame.height);
      holder.add(this.add.image(0, 0, this.enemyPhotoKey)
        .setDisplaySize(frame.width * scale, frame.height * scale)
        .setName(photoName));
      return;
    }

    const fallbackKey = ensureAnimalTexture(this, this.animal.id);
    const fallbackSize = isDetails ? 72 : 112;
    const fallbackY = isDetails ? -10 : -6;
    const fallback = fallbackKey
      ? this.add.image(0, fallbackY, fallbackKey).setDisplaySize(fallbackSize, fallbackSize)
      : this.add.text(0, fallbackY, animalEmoji[this.animal.id] || "❓", {
        fontFamily: KOREAN_FONT,
        fontSize: isDetails ? "48px" : "72px"
      }).setOrigin(0.5);
    fallback.setName(fallbackName);
    holder.add(fallback);
    holder.add(this.add.text(0, photoLayout.height / 2 - 12, "전체 사진이 없으면 픽셀 모습으로 관찰해요", {
      fontFamily: KOREAN_FONT,
      fontSize: "10px",
      color: "#6b5a43"
    }).setOrigin(0.5));
  }

  cancelObservationAdvance() {
    this.observationAdvanceTimer?.remove(false);
    this.observationAdvanceTimer = null;
    this.observationAdvancePending = false;
  }

  setTurnLabel(text) {
    this.turnText.setText(text);
    fitTextToBox(this.turnText, { width: 272, height: 24, fontSize: 12, minFontSize: 9 });
  }

  clearDynamicUi() {
    this.uiNodes.forEach((node) => node?.destroy?.(true));
    this.uiNodes = [];
    this.optionButtons.forEach((b) => b.destroy(true));
    this.optionButtons = [];
  }

  track(node) {
    this.uiNodes.push(node);
    return node;
  }

  narrate(text, { height = 96 } = {}) {
    const { width } = this.cameras.main;
    const cam = this.cameras.main;
    const panel = this.track(createWoodPanel(this, width / 2, cam.height - height / 2 - 10, width - 20, height).setDepth(1000));
    const label = this.track(this.add.text(width / 2, cam.height - height / 2 - 10, text, {
      fontFamily: KOREAN_FONT,
      fontSize: "14px",
      color: "#3d2410",
      align: "center",
      lineSpacing: 4,
      wordWrap: { width: width - 70 }
    }).setOrigin(0.5).setDepth(1001));
    fitTextToBox(label, { width: width - 70, height: height - 24, fontSize: 14, minFontSize: 9 });
    return { panel, label };
  }

  // ─── 인트로 → 관찰 ──────────────────────────────────────

  showIntro() {
    this.phase = "intro";
    this.applyPhaseLayout("intro");
    this.setTurnLabel("야생 동물 등장!");
    playEmote(this, 486, 24, "surprise", { depth: 1100 });
    this.narrate(`앗! 야생의 ${this.animal.name}이(가) 나타났어요!\n먼저 차분히 관찰해서 특징을 알아내요.`);

    this.time.delayedCall(ENCOUNTER_INTRO_MS, () => {
      if (this.phase === "intro") this.showObservationOverview();
    });
  }

  showObservationOverview() {
    this.phase = "observe";
    this.observationStage = "overview";
    this.cancelObservationAdvance();
    this.clearDynamicUi();
    this.applyPhaseLayout("overview");
    const { width } = this.cameras.main;
    const overview = BATTLE_LAYOUT.overview;
    const emoji = animalEmoji[this.animal.id] || "";

    this.setTurnLabel(`전체 모습 관찰 · ${this.animal.name}`);
    this.track(createWoodPanel(
      this,
      overview.panel.x,
      overview.panel.y,
      overview.panel.width,
      overview.panel.height
    ).setDepth(999).setName("overview-panel"));

    this.track(this.add.text(width / 2, 55, `${emoji} ${this.animal.name}의 전체 모습을 먼저 살펴봐요`, {
      fontFamily: KOREAN_FONT,
      fontSize: "15px",
      color: "#3d2410",
      fontStyle: "bold"
    }).setOrigin(0.5).setDepth(1001).setName("overview-heading"));

    this.track(this.add.rectangle(
      overview.photo.x,
      overview.photo.y,
      overview.photo.width,
      overview.photo.height,
      0xf7eedb
    ).setStrokeStyle(3, 0x8a6640).setDepth(1000).setName("overview-photo-frame"));
    this.overviewPhotoHolder = this.track(this.add.container(
      overview.photo.x,
      overview.photo.y
    ).setDepth(1001).setName("overview-photo-holder"));
    this.refreshObservationPhoto();

    const startButton = this.track(createWoodButton(
      this,
      width / 2,
      318,
      "🔍 특징 살펴보기",
      () => {
        this.observationStage = "details";
        this.observePage = 0;
        this.showObservation();
      },
      { width: 260, height: 42, fontSize: "14px", tint: 0xffe08a }
    ).setName("primary-action"));
    this.primaryAction = startButton;
  }

  showObservation() {
    this.phase = "observe";
    this.observationStage = "details";
    this.cancelObservationAdvance();
    this.clearDynamicUi();
    this.overviewPhotoHolder = null;
    this.applyPhaseLayout("observe");
    const { width } = this.cameras.main;
    const obs = this.observation;
    const observe = BATTLE_LAYOUT.observe;

    this.setTurnLabel(`관찰하기 · ${this.animal.name}`);

    const pages = [
      { key: "appearance", title: "생김새", body: obs.appearance, check: "몸의 특징을 봤어요" },
      { key: "lifestyle", title: "움직임", body: obs.lifestyle, check: "움직임을 봤어요" },
      { key: "habitat", title: "사는 곳", body: obs.habitatLife, check: "사는 곳을 봤어요" }
    ];
    if (this.observePage < 0) this.observePage = 0;
    if (this.observePage > pages.length - 1) this.observePage = pages.length - 1;
    const page = pages[this.observePage];
    const checked = this.observeChecks[page.key];
    const ready = Object.values(this.observeChecks).every(Boolean);

    this.track(createWoodPanel(
      this,
      observe.panel.x,
      observe.panel.y,
      observe.panel.width,
      observe.panel.height
    ).setDepth(999).setName("observe-panel"));

    this.track(this.add.rectangle(
      observe.photo.x,
      observe.photo.y,
      observe.photo.width,
      observe.photo.height,
      0xf7eedb
    ).setStrokeStyle(3, 0x8a6640).setDepth(1000).setName("observe-photo-frame"));
    this.overviewPhotoHolder = this.track(this.add.container(
      observe.photo.x,
      observe.photo.y
    ).setDepth(1001).setName("observe-photo-holder"));
    this.refreshObservationPhoto();

    this.track(createWoodPanel(
      this,
      observe.stage.x,
      observe.stage.y,
      observe.stage.width,
      observe.stage.height,
      { tint: 0xd9f2e7 }
    ).setDepth(1000).setName("observe-stage-card"));
    this.track(this.add.text(70, observe.stage.y, `학습 ${this.observePage + 1}/3 · ${page.title}`, {
      fontFamily: KOREAN_FONT,
      fontSize: "13px",
      color: "#0b5c55",
      fontStyle: "bold"
    }).setOrigin(0, 0.5).setDepth(1001).setName("observe-stage-label"));
    pages.forEach((item, index) => {
      const color = this.observeChecks[item.key]
        ? 0x4f9b69
        : (index === this.observePage ? 0xd99124 : 0xc7b58e);
      this.track(this.add.rectangle(466 + index * 42, observe.stage.y, 34, 7, color)
        .setStrokeStyle(1, 0x8a6640)
        .setDepth(1001)
        .setName(`observe-progress-${index + 1}`));
    });

    this.track(createWoodPanel(
      this,
      observe.learning.x,
      observe.learning.y,
      observe.learning.width,
      observe.learning.height,
      { tint: 0xfff1c7 }
    ).setDepth(1000).setName("observe-learning-card"));
    this.track(this.add.rectangle(60, observe.learning.y, 6, 44, 0xd99124)
      .setDepth(1001)
      .setName("observe-learning-accent"));
    this.track(this.add.text(76, 214, "관찰 포인트", {
      fontFamily: KOREAN_FONT,
      fontSize: "10px",
      color: "#8a5a16",
      fontStyle: "bold"
    }).setOrigin(0, 0.5).setDepth(1001).setName("observe-learning-label"));

    const observationCopy = this.track(this.add.text(width / 2, 244, page.body, {
      fontFamily: KOREAN_FONT,
      fontSize: "13px",
      color: "#3d2410",
      align: "center",
      lineSpacing: 3,
      wordWrap: { width: 480 }
    }).setOrigin(0.5).setDepth(1001).setName("observe-copy"));
    fitTextToBox(observationCopy, { width: 480, height: 34, fontSize: 13, minFontSize: 10 });

    if (!checked) {
      const checkButton = this.track(createWoodButton(
        this,
        width / 2,
        294,
        `🔍 ${page.check}`,
        () => {
          if (this.observationAdvancePending) return;
          this.observeChecks[page.key] = true;
          checkButton.setText(`✅ ${page.check}`);
          checkButton.setButtonEnabled(false);

          if (this.observePage < pages.length - 1) {
            this.observationAdvancePending = true;
            const checkedPage = this.observePage;
            this.observationAdvanceTimer = this.time.delayedCall(OBSERVATION_AUTO_ADVANCE_MS, () => {
              this.observationAdvanceTimer = null;
              if (
                !this.scene.isActive()
                || this.phase !== "observe"
                || this.observationStage !== "details"
                || this.observePage !== checkedPage
              ) return;
              this.observationAdvancePending = false;
              this.observePage += 1;
              this.showObservation();
            });
          } else {
            this.showObservation();
          }
        },
        { width: 300, height: 42, fontSize: "13px", tint: 0xffe08a }
      ).setName("primary-action"));
      this.primaryAction = checkButton;
    } else if (ready) {
      const battleButton = this.track(createWoodButton(
        this,
        width / 2,
        294,
        "⚔️ 퀴즈 배틀 시작!",
        () => this.startBattle(),
        { width: 300, height: 42, fontSize: "14px", tint: 0xffe08a }
      ).setName("primary-action"));
      this.primaryAction = battleButton;
    } else {
      const completeStatus = this.track(createWoodButton(
        this,
        width / 2,
        294,
        `✅ ${page.check}`,
        () => {},
        { width: 300, height: 42, fontSize: "13px", tint: 0xd8f0c0 }
      ).setName("observe-complete-status"));
      completeStatus.setButtonEnabled(false);
    }

    this.track(createWoodButton(this, 76, 329, this.observePage > 0 ? "← 이전" : "← 전체 사진", () => {
      if (this.observePage > 0) {
        this.observePage -= 1;
        this.showObservation();
      } else {
        this.showObservationOverview();
      }
    }, { width: 116, height: 42, fontSize: "12px" }).setName("observe-previous"));

    if (checked && this.observePage < pages.length - 1) {
      const nextButton = this.track(createWoodButton(this, width - 76, 329, "다음 →", () => {
        this.observePage += 1;
        this.showObservation();
      }, { width: 104, height: 42, fontSize: "12px", tint: 0xffe08a }).setName("primary-action"));
      this.primaryAction = nextButton;
    }
  }

  // ─── 전투 루프 ──────────────────────────────────────────

  startBattle() {
    this.phase = "battle";
    this.qIndex = 0;
    this.busy = false;
    this.showQuestion();
  }

  /** 현재 문제의 정답이 새지 않는 관찰 요약을 만듭니다 */
  buildSafeFacts(hintKey) {
    const facts = this.quickFacts;
    const parts = [];
    if (hintKey !== "habitat") parts.push(`사는 곳: ${facts.habitat}`);
    if (hintKey !== "lifestyle") parts.push(`움직임: ${facts.movement}`);
    if (hintKey !== "appearance" && hintKey !== "adaptation") parts.push(`특징: ${facts.feature}`);
    return parts.join("  ·  ");
  }

  showQuestion() {
    this.phase = "battle";
    this.busy = false;
    this.clearDynamicUi();
    this.applyPhaseLayout("battle");

    const { width } = this.cameras.main;
    const q = this.questions[this.qIndex];
    const typeLabel = getQuestionTypeLabel(q, this.qIndex);

    this.setTurnLabel(`내 턴 · 문제 ${this.qIndex + 1}/${this.questions.length} (${typeLabel})`);

    this.track(createWoodPanel(
      this,
      BATTLE_LAYOUT.question.panel.x,
      BATTLE_LAYOUT.question.panel.y,
      BATTLE_LAYOUT.question.panel.width,
      BATTLE_LAYOUT.question.panel.height
    ).setDepth(1000).setName("question-panel"));

    const factCopy = this.track(this.add.text(width / 2, 190, `📝 ${this.buildSafeFacts(q.hintKey)}`, {
      fontFamily: KOREAN_FONT, fontSize: "10px", color: "#41603a",
      align: "center", wordWrap: { width: width - 60 }
    }).setOrigin(0.5).setDepth(1001).setName("fact-copy"));

    const questionCopy = this.track(this.add.text(width / 2, 205, q.text, {
      fontFamily: KOREAN_FONT, fontSize: "12px", color: "#3d2410", fontStyle: "bold",
      align: "center", lineSpacing: 1, wordWrap: { width: width - 60 }
    }).setOrigin(0.5).setDepth(1001).setName("question-copy"));
    fitTextToBox(factCopy, { width: width - 60, height: 14, fontSize: 10, minFontSize: 8 });
    fitTextToBox(questionCopy, { width: width - 60, height: 20, fontSize: 12, minFontSize: 8 });
    const copyHeight = factCopy.height + 2 + questionCopy.height;
    const copyTop = BATTLE_LAYOUT.question.panel.y - copyHeight / 2;
    factCopy.setY(copyTop + factCopy.height / 2);
    questionCopy.setY(copyTop + factCopy.height + 2 + questionCopy.height / 2);

    q.options.forEach((option, index) => {
      const btn = createWoodButton(
        this,
        width / 2,
        BATTLE_LAYOUT.question.optionY[index],
        option,
        () => this.onAnswer(option),
        { width: width - 24, height: BATTLE_LAYOUT.question.optionHeight, fontSize: "12px" }
      ).setName(`answer-option-${index + 1}`);
      this.optionButtons.push(btn);
    });
  }

  lockOptions() {
    this.optionButtons.forEach((b) => b.setButtonEnabled(false));
  }

  onAnswer(option) {
    if (this.busy || this.phase !== "battle") return;
    this.busy = true;
    this.lockOptions();

    const q = this.questions[this.qIndex];
    if (option === q.correct) {
      this.playerAttack();
    } else {
      this.enemyAttack(q);
    }
  }

  playerAttack() {
    const typeLabel = getQuestionTypeLabel(this.questions[this.qIndex], this.qIndex);
    this.clearDynamicUi();
    this.applyPhaseLayout("battle");
    this.setTurnLabel("공격 성공!");
    this.narrate(`정확한 관찰이에요! ${typeLabel} 공략 성공! ⚡`, { height: 62 });
    playEmote(this, this.playerSprite.x, this.playerSprite.y - 78, "happy", { depth: 1100 });

    // 돌진 → 적 번쩍 + 흔들림 + 기력 감소
    this.tweens.add({
      targets: this.playerSprite,
      x: "+=42",
      duration: 170,
      yoyo: true,
      ease: "Cubic.easeOut"
    });
    this.time.delayedCall(190, () => {
      this.cameras.main.shake(110, 0.0035);
      this.flashEnemy();
      this.enemyGauge -= 1;
      this.enemyHearts.set(this.enemyGauge);
    });

    this.time.delayedCall(1150, () => {
      this.qIndex += 1;
      if (this.enemyGauge <= 0 || this.qIndex >= this.questions.length) {
        this.onVictory();
      } else {
        this.showQuestion();
      }
    });
  }

  flashEnemy() {
    const targets = [];
    const collectTintable = (child) => {
      if (child.setTintFill) targets.push(child);
      child.iterate?.(collectTintable);
    };
    this.enemyRoot.iterate(collectTintable);
    targets.forEach((t) => t.setTintFill(0xffffff));
    this.tweens.add({
      targets: this.enemyRoot,
      x: "+=7",
      duration: 55,
      yoyo: true,
      repeat: 3
    });
    this.time.delayedCall(150, () => {
      targets.forEach((t) => {
        t.clearTint();
      });
    });
  }

  enemyAttack(question) {
    this.clearDynamicUi();
    this.applyPhaseLayout("battle");
    this.setTurnLabel(`${this.animal.name}의 턴!`);
    this.narrate(`앗, 빗나갔어요! ${this.animal.name}의 헷갈리기 공격! 💫`, { height: 62 });

    this.tweens.add({
      targets: this.enemyRoot,
      x: "-=46",
      y: "+=26",
      duration: 200,
      yoyo: true,
      ease: "Cubic.easeOut"
    });
    this.time.delayedCall(230, () => {
      this.cameras.main.shake(150, 0.006);
      this.playerSprite.setTintFill(0xff8080);
      this.time.delayedCall(140, () => this.playerSprite.clearTint());
      this.playerHearts -= 1;
      this.playerHeartRow.set(this.playerHearts);
      playEmote(this, this.playerSprite.x, this.playerSprite.y - 78, "sad", { depth: 1100 });
    });

    this.time.delayedCall(1250, () => {
      if (this.playerHearts <= 0) {
        this.onRetreat();
      } else {
        this.showHint(question.hintKey);
      }
    });
  }

  showHint(hintKey) {
    this.phase = "hint";
    this.clearDynamicUi();
    this.applyPhaseLayout("hint");
    const { width } = this.cameras.main;
    const section = getHintSection(this.animal, hintKey);

    this.setTurnLabel("단서 다시 보기");

    this.track(createWoodPanel(
      this,
      BATTLE_LAYOUT.hint.panel.x,
      BATTLE_LAYOUT.hint.panel.y,
      BATTLE_LAYOUT.hint.panel.width,
      BATTLE_LAYOUT.hint.panel.height,
      { tint: 0xfff0c0 }
    ).setDepth(999).setName("hint-panel"));
    this.track(this.add.text(width / 2, 204, `🔍 ${section.title}`, {
      fontFamily: KOREAN_FONT, fontSize: "14px", color: "#8a5a10", fontStyle: "bold"
    }).setOrigin(0.5).setDepth(1001));
    const hintCopy = this.track(this.add.text(width / 2, 248, section.body, {
      fontFamily: KOREAN_FONT, fontSize: "13px", color: "#3d2410",
      align: "center", lineSpacing: 4, wordWrap: { width: width - 90 }
    }).setOrigin(0.5).setDepth(1001));
    fitTextToBox(hintCopy, { width: width - 90, height: 82, fontSize: 13, minFontSize: 9 });

    const waitBtn = this.track(createWoodButton(
      this,
      width / 2,
      326,
      "단서를 읽는 중이에요…",
      () => {},
      { width: 260, height: 42, fontSize: "13px" }
    ));
    waitBtn.setButtonEnabled(false);

    this.time.delayedCall(HINT_LOCK_MS, () => {
      if (this.phase !== "hint" || !this.scene.isActive()) return;
      waitBtn.destroy(true);
      const idx = this.uiNodes.indexOf(waitBtn);
      if (idx >= 0) this.uiNodes.splice(idx, 1);
      this.track(createWoodButton(
        this,
        width / 2,
        326,
        "💪 같은 문제 다시 도전!",
        () => this.showQuestion(),
        { width: 260, height: 42, fontSize: "13px", tint: 0xffe08a }
      ).setName("primary-action"));
    });
  }

  // ─── 승리 · 후퇴 ────────────────────────────────────────

  // ─── 포획: 도감볼 던지기 ─────────────────────────────────

  onVictory() {
    this.phase = "victory";
    this.clearDynamicUi();
    this.applyPhaseLayout("cinematic");
    this.setTurnLabel("지금이 기회!");
    this.fleeButton?.setVisible(false);

    playEmote(this, this.enemyRoot.x, this.enemyRoot.y - 76, "surprise", { depth: 1100 });
    this.tweens.add({
      targets: this.enemyRoot,
      angle: { from: -3, to: 3 },
      duration: 140,
      yoyo: true,
      repeat: 2
    });

    const { width, height } = this.cameras.main;
    this.narrate(`${this.animal.name}의 기력이 다 빠졌어요!\n도감볼을 던져 친구로 맞이해요!`, { height: 74 });
    this.track(createWoodButton(this, width / 2, height * 0.32, "🎯 도감볼 던지기!", () => this.throwBall(), {
      width: 250,
      height: 46,
      fontSize: "17px",
      tint: 0xffe08a
    }));
  }

  throwBall() {
    if (this.phase !== "victory" || this.ballThrown) return;
    this.ballThrown = true;
    this.clearDynamicUi();
    this.applyPhaseLayout("cinematic");
    this.setTurnLabel("도감볼 던지기!");
    this.narrate("도감볼을 힘껏 던졌다…!", { height: 56 });

    ensureBallTexture(this);
    const startX = this.playerSprite.x + 26;
    const startY = this.playerSprite.y - 52;
    const targetX = this.enemyRoot.x;
    const targetY = this.enemyRoot.y;
    const ball = this.add.image(startX, startY, "dex-ball").setScale(0).setDepth(1200);

    // 던지는 모션: 플레이어가 살짝 앞으로
    this.tweens.add({
      targets: this.playerSprite,
      x: "+=18",
      duration: 150,
      yoyo: true,
      ease: "Cubic.easeOut"
    });
    this.tweens.add({ targets: ball, scale: 2.4, duration: 140, ease: "Back.easeOut" });

    // 포물선 비행 (2차 베지어) + 회전
    const peakX = (startX + targetX) / 2;
    const peakY = Math.min(startY, targetY) - 120;
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 640,
      delay: 140,
      ease: "Sine.easeIn",
      onUpdate: (tw) => {
        const u = tw.getValue();
        const inv = 1 - u;
        ball.x = inv * inv * startX + 2 * inv * u * peakX + u * u * targetX;
        ball.y = inv * inv * startY + 2 * inv * u * peakY + u * u * targetY;
        ball.rotation = u * 9;
      },
      onComplete: () => this.absorbIntoBall(ball, targetX, targetY)
    });
  }

  absorbIntoBall(ball, x, y) {
    this.cameras.main.flash(150, 255, 240, 190);
    this.flashEnemy();
    this.setBattleHudVisible(false);

    // 동물이 볼 속으로 쏙 빨려 들어감
    this.tweens.add({
      targets: this.enemyRoot,
      scale: 0,
      x,
      y: y - 4,
      angle: 24,
      duration: 330,
      ease: "Cubic.easeIn",
      onComplete: () => {
        this.enemyRoot.setVisible(false);
        // 볼이 발판으로 톡 떨어짐
        this.tweens.add({
          targets: ball,
          y: 172,
          scale: 2.7,
          duration: 300,
          ease: "Bounce.easeOut",
          onComplete: () => this.wobbleBall(ball, 0)
        });
      }
    });
  }

  wobbleBall(ball, count) {
    if (count >= 3) {
      this.catchSuccess(ball);
      return;
    }
    const tick = this.add.text(ball.x, ball.y - 34, "딸깍…", {
      fontFamily: KOREAN_FONT,
      fontSize: "12px",
      color: "#fff8e7",
      stroke: "#3a2a18",
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(1201);
    this.tweens.add({
      targets: tick,
      y: tick.y - 9,
      alpha: 0,
      duration: 540,
      onComplete: () => tick.destroy()
    });
    this.tweens.add({
      targets: ball,
      angle: { from: -16, to: 16 },
      duration: 130,
      yoyo: true,
      repeat: 1,
      ease: "Sine.easeInOut",
      onComplete: () => {
        ball.setAngle(0);
        this.time.delayedCall(200, () => this.wobbleBall(ball, count + 1));
      }
    });
  }

  catchSuccess(ball) {
    collectAnimal(this.animal.id);
    this.cameras.main.flash(240, 255, 236, 160);
    playEmote(this, ball.x, ball.y - 46, "love", { depth: 1300 });
    playEmote(this, ball.x - 36, ball.y - 22, "happy", { depth: 1300 });
    this.tweens.add({ targets: ball, scale: 3.1, duration: 150, yoyo: true, repeat: 1 });

    const flashText = this.add.text(ball.x, ball.y - 66, "찰칵! ✨", {
      fontFamily: KOREAN_FONT,
      fontSize: "17px",
      color: "#ffd84d",
      fontStyle: "bold",
      stroke: "#3a2a18",
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(1301);

    this.time.delayedCall(800, () => {
      flashText.destroy();
      this.showCatchResult();
    });
  }

  showCatchResult() {
    this.clearDynamicUi();
    this.setTurnLabel("배틀 승리!");

    const { width, height } = this.cameras.main;
    const emoji = animalEmoji[this.animal.id] || "";
    const name = this.animal.name;
    const status = this.regionId ? regionStatus(this.regionId) : null;
    const extra = status && status.complete
      ? "\n🎖 이 지역 동물을 모두 만났어요! 맵으로 돌아가면 배지를 받아요!"
      : "";

    this.narrate(
      `${emoji} ${name}${withParticle(name)} 친구가 되었어요! 도감에 등록!\n${this.observation.habitatLink}${extra}`,
      { height: 108 }
    );
    this.track(createWoodButton(this, width / 2, height * 0.30 - 22, "📖 도감 보기", () => {
      this.scene.start("DexScene", {
        from: "OverworldScene",
        returnPos: this.returnPos,
        highlightId: this.animal.id,
        regionId: this.regionId
      });
    }, { width: 170, height: 36, fontSize: "14px" }));
    this.track(createWoodButton(this, width / 2, height * 0.30 + 22, "🗺️ 모험으로 돌아가기", () => {
      this.returnToOverworld();
    }, { width: 170, height: 36, fontSize: "14px" }));
  }

  onRetreat() {
    this.phase = "retreat";
    this.clearDynamicUi();
    this.applyPhaseLayout("cinematic");
    this.setTurnLabel("잠시 후퇴…");
    playEmote(this, this.playerSprite.x, this.playerSprite.y - 78, "zzz", { depth: 1100 });
    this.narrate(`기운이 다 빠졌어요… 괜찮아요!\n${this.animal.name}은(는) 그 자리에서 기다려요. 단서를 떠올리고 다시 도전!`, { height: 84 });

    this.time.delayedCall(2200, () => this.returnToOverworld());
  }

  returnToOverworld() {
    if (this.returningToOverworld) return;
    this.returningToOverworld = true;
    this.scene.start("OverworldScene", {
      returnPos: this.returnPos,
      avoidEncounterId: this.animal?.id || null
    });
  }
}
