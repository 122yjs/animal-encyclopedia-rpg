// 턴제 퀴즈 배틀 — 관찰 학습은 ScreenUi, 공격·포획 연출은 캔버스에 둡니다.
import Phaser from "phaser/dist/phaser-arcade-physics.min.js";
import { animalById } from "../data/animals.js";
import { buildQuestions } from "../systems/QuizBuilder.js";
import {
  buildObservationDetails,
  buildQuickFacts,
  getHintSection,
  getQuestionTypeLabel,
  withParticle
} from "../systems/ObservationBuilder.js";
import { collectAnimal, isCollected, regionStatus } from "../systems/ProgressStore.js";
import {
  getAnimalFrame,
  shouldFlipAnimalTowardLeft,
  ensureBallTexture,
  BALL_RADIUS
} from "../world/AnimalSprites.js";
import { battleBackdropFor } from "../world/BattleBackdrops.js";
import { KOREAN_FONT, playEmote } from "../ui/UiHelpers.js";
import { createScreen, createElement, createButton, createPhoto, disposePhotos } from "../ui/ScreenUi.js";
import "../ui/battle-screen.css";

const MAX_HEARTS = 3;
const HINT_LOCK_MS = 2500;
const ENCOUNTER_INTRO_MS = 650;
const OBSERVATION_AUTO_ADVANCE_MS = 260;
const PLAYER_KEY = "player";
const PLAYER_FRAME = "battle-player";
const PLAYER_CELEBRATION_KEY = "celebration-player-happy";
const PLAYER_FAILURE_KEY = "failure-player-gentle";
const PLAYER_CROP = { x: 17, y: 16, width: 14, height: 16 };
const ENEMY_BODY_PX = 96;
const BALL_TEXTURE_PX = 64;
const BALL_THROW_SCALE = 28.8 / BALL_TEXTURE_PX;
const BALL_LAND_SCALE = 32.4 / BALL_TEXTURE_PX;
const BALL_CATCH_SCALE = 37.2 / BALL_TEXTURE_PX;
const GROUND_BALL_KINDS = new Set(["land", "wobble", "success", "reveal"]);

// 픽셀 실루엣용 흰색 텍스처 — 색은 setTint 로 입히고, 가장자리는 계단으로 남깁니다.
const PIXEL_DOT_KEY = "battle-pixel-dot";
const OVAL_TEXTURES = [
  ["battle-platform-enemy", 144, 30],
  ["battle-platform-player", 176, 46],
  ["battle-ball-shadow", 56, 16]
];

function ensurePixelDot(scene) {
  if (!scene.textures.exists(PIXEL_DOT_KEY)) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 1, 1);
    g.generateTexture(PIXEL_DOT_KEY, 1, 1);
    g.destroy();
    scene.textures.get(PIXEL_DOT_KEY).setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  return PIXEL_DOT_KEY;
}

/** 2px 격자로 끊어 그린 타원 — 확대해도 테두리가 계단 픽셀로 보입니다. */
function ensureSteppedOval(scene, key, width, height) {
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xffffff, 1);
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  for (let y = 0; y < height; y += 2) {
    const half = Math.sqrt(Math.max(0, 1 - ((y + 1 - cy) / (height / 2)) ** 2)) * (width / 2);
    const w = Math.round(half * 2) + 1;
    if (w > 1) g.fillRect(Math.round(cx - half), y, w, 2);
  }
  g.generateTexture(key, width, height);
  g.destroy();
  scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

// ─── 배틀 HUD 픽셀 아이콘 ────────────────────────────────
const SVG_NS = "http://www.w3.org/2000/svg";
// 고정된 11×11 하트와 1픽셀 외곽선·하이라이트.
const HEART_BODY_PATH = "M2 0h2v1H2zM7 0h2v1H7zM1 1h4v1H1zM6 1h4v1H6zM0 2h11v1H0zM0 3h11v1H0zM0 4h11v1H0zM1 5h9v1H1zM1 6h9v1H1zM2 7h7v1H2zM3 8h5v1H3zM4 9h3v1H4zM5 10h1v1H5z";
const HEART_LINE_PATH = "M2 -1h2v1H2zM7 -1h2v1H7zM1 0h4v1H1zM6 0h4v1H6zM0 1h11v1H0zM-1 2h13v1H-1zM-1 3h13v1H-1zM-1 4h13v1H-1zM0 5h11v1H0zM0 6h11v1H0zM1 7h9v1H1zM2 8h7v1H2zM3 9h5v1H3zM4 10h3v1H4zM5 11h1v1H5z";
const HEART_SHINE_PATH = "M1 1h2v1H1zM8 1h2v1H8zM1 2h1v1H1zM9 2h1v1H9z";

function svgNode(tag, className) {
  const node = document.createElementNS(SVG_NS, tag);
  if (className) node.setAttribute("class", className);
  return node;
}

function svgPathNode(className, d) {
  const node = svgNode("path", className);
  node.setAttribute("d", d);
  return node;
}

/** 픽셀 하트 — 살아 있으면 코랄, 잃으면 빈 실루엣(색은 battle-screen.css 담당) */
function heartIcon(full) {
  const svg = svgNode("svg", full ? "battle-heart is-full" : "battle-heart is-empty");
  svg.setAttribute("viewBox", "-1 -1 13 13");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.setAttribute("shape-rendering", "crispEdges");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.append(
    svgPathNode("battle-heart__line", HEART_LINE_PATH),
    svgPathNode("battle-heart__body", HEART_BODY_PATH),
    svgPathNode("battle-heart__shine", HEART_SHINE_PATH)
  );
  return svg;
}


export default class QuizBattleScene extends Phaser.Scene {
  constructor() {
    super("QuizBattleScene");
  }

  init(data) {
    this.animalId = data.animalId;
    this.regionId = data.regionId || null;
    this.returnPos = data.returnPos || null;
    this.animal = animalById[this.animalId];
    this.observePage = 0;
    this.observeChecks = { appearance: false, lifestyle: false, habitat: false };
    this.observationStage = "overview";
    this.phase = "intro";
    this.busy = false;
    this.ballThrown = false;
    this.collectedOnce = false;
    this.returningToOverworld = false;
    this.ui = null;
    this.viewGen = 0;
    this.actionGen = 0;
    this.photoState = "loading";
    this.optionButtons = [];
    this.photoGateControls = [];
    this.photoNote = null;
    this.presentationMode = "intro";
    this.stageBox = null;
    this.playerRest = null;
    this.enemyRest = null;
    this.layoutWatchTargets = [];
    this.actorStageClamp = null;
    this.backdropSpec = null;
    this.catchBall = null;
    this.ballShadow = null;
    this.ballMotion = null;
    this.ballTrack = null;
    this.ballLabels = [];
    this.liveEmotes = [];
    this.enemyAbsorbed = false;
    this.enemyDisplayScale = 1;
    this.poseTweenLock = false;
    this.playerPose = "battle";
    this.playerCelebrationTween = null;
  }

  create() {
    this.cameras.main.fadeIn(240, 24, 16, 8);
    this.cameras.main.setBackgroundColor("#accec1");
    this.scale.on("resize", this.layoutStage, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());

    if (!this.animal) {
      this.showDeadEnd("동물을 찾을 수 없어요", 1200);
      return;
    }
    if (isCollected(this.animal.id)) {
      this.showDeadEnd(`${this.animal.name}은(는) 이미 도감 친구예요!`, 1300);
      return;
    }

    this.observation = buildObservationDetails(this.animal);
    this.quickFacts = buildQuickFacts(this.animal);
    this.questions = buildQuestions(this.animal);
    this.qIndex = 0;
    this.playerHearts = MAX_HEARTS;
    this.enemyGauge = this.questions.length;

    this.buildStage();
    this.showIntro();
  }

  teardown() {
    this.cancelObservationAdvance();
    this.stopPlayerCelebration();
    this.clearCatchFx();
    this.clearEmotes();
    this.disposeLayoutWatch();
    this.scale.off("resize", this.layoutStage, this);
    this.ui?.destroy();
    this.ui = null;
  }

  syncPhaseAttr() {
    if (this.ui?.root) this.ui.root.dataset.phase = this.phase;
  }

  clearEmotes() {
    (this.liveEmotes || []).forEach((emote) => {
      if (emote?.active) emote.destroy();
    });
    this.liveEmotes = [];
  }

  spawnEmote(x, y, kind, opts) {
    if (!this.scene.isActive() || this.returningToOverworld) return null;
    const emote = playEmote(this, x, y, kind, opts);
    this.liveEmotes.push(emote);
    if (this.prefersReducedMotion()) {
      emote.stop();
      this.time.delayedCall(400, () => {
        if (this.scene.isActive() && emote.active) emote.destroy();
      });
    }
    return emote;
  }

  clearCatchFx() {
    if (this.ballTrack) this.tweens.killTweensOf(this.ballTrack);
    if (this.catchBall?.active) {
      this.tweens.killTweensOf(this.catchBall);
      this.catchBall.destroy();
    }
    this.catchBall = null;
    this.ballMotion = null;
    this.ballTrack = null;
    (this.ballLabels || []).forEach((label) => {
      if (label?.active) label.destroy();
    });
    this.ballLabels = [];
    this.ballShadow?.setVisible(false);
  }

  restoreEnemyActor() {
    this.enemyAbsorbed = false;
    if (!this.enemyRoot) return;
    this.enemyRoot.setVisible(true);
    this.enemyRoot.setAngle(0);
    if (this.enemyVisualRoot) this.enemyVisualRoot.y = 0;
    if (this.enemyDisplayScale) this.enemyRoot.setScale(this.enemyDisplayScale);
  }

  resetCombatSession() {
    this.stopPlayerCelebration();
    this.tweens.killTweensOf([this.playerSprite, this.enemyRoot].filter(Boolean));
    this.clearCatchFx();
    this.questions = buildQuestions(this.animal);
    this.qIndex = 0;
    this.playerHearts = MAX_HEARTS;
    this.enemyGauge = this.questions.length;
    this.busy = false;
    this.ballThrown = false;
    this.poseTweenLock = false;
    this.playerSprite?.clearTint();
    this.setPlayerPose("battle");
    this.restoreEnemyActor();
  }

  stopPlayerCelebration() {
    if (this.playerSprite) this.tweens.killTweensOf(this.playerSprite);
    this.playerCelebrationTween = null;
    this.poseTweenLock = false;
  }

  setPlayerPose(pose) {
    this.playerPose = pose;
    if (!this.playerSprite?.active) return;
    const textureKey = pose === "celebration"
      ? PLAYER_CELEBRATION_KEY
      : pose === "failure" ? PLAYER_FAILURE_KEY : PLAYER_KEY;
    if (this.playerSprite.texture.key === textureKey) return;
    const displayHeight = this.playerSprite.displayHeight;
    this.playerSprite.anims.stop();
    const frame = pose === "celebration" ? 1 : pose === "failure" ? 2 : PLAYER_FRAME;
    this.playerSprite.setTexture(textureKey, frame);
    if (displayHeight > 0) this.playerSprite.setScale(displayHeight / this.playerSprite.height);
  }

  replayPlayerCelebration() {
    if (!this.playerSprite?.active || this.playerPose !== "celebration") return;
    this.playerSprite.anims.stop();
    this.playerSprite.setFrame(1);
    if (!this.prefersReducedMotion() && this.anims.exists(PLAYER_CELEBRATION_KEY)) {
      this.playerSprite.play(PLAYER_CELEBRATION_KEY);
    }
  }

  playPlayerCatchCelebration() {
    this.stopPlayerCelebration();
    this.setPlayerPose("celebration");
    this.replayPlayerCelebration();
    if (!this.playerSprite?.active || this.prefersReducedMotion()) return;

    const restY = this.playerRest?.y ?? this.playerSprite.y;
    this.playerSprite.setY(restY);
    this.poseTweenLock = true;
    const tween = this.tweens.add({
      targets: this.playerSprite,
      y: restY - 10,
      duration: 180,
      yoyo: true,
      ease: "Sine.easeOut",
      onComplete: () => {
        if (this.playerCelebrationTween !== tween) return;
        this.playerCelebrationTween = null;
        this.poseTweenLock = false;
        if (this.playerSprite?.active) this.playerSprite.setY(this.playerRest?.y ?? restY);
        if (this.scene.isActive() && !this.returningToOverworld) this.layoutStage();
      }
    });
    this.playerCelebrationTween = tween;
  }

  playPlayerFailure() {
    this.stopPlayerCelebration();
    this.setPlayerPose("failure");
    if (!this.playerSprite?.active || this.prefersReducedMotion()) return;
    this.playerSprite.play(PLAYER_FAILURE_KEY);
    this.lockPose(420);
    this.tweens.add({
      targets: this.playerSprite,
      y: "+=6",
      duration: 180,
      yoyo: true,
      ease: "Sine.easeOut"
    });
  }

  prefersReducedMotion() {
    return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
  }

  motionMs(ms) {
    return this.prefersReducedMotion() ? 1 : ms;
  }

  isCombatPresentation() {
    return this.presentationMode === "intro"
      || this.presentationMode === "question"
      || this.presentationMode === "hint"
      || this.presentationMode === "battle-fx"
      || this.presentationMode === "cinematic";
  }

  disposeLayoutWatch() {
    this.stageObserver?.disconnect();
    this.stageObserver = null;
    this.layoutWatchTargets = [];
  }

  unobserveLayoutTargets() {
    if (!this.stageObserver) {
      this.layoutWatchTargets = [];
      return;
    }
    (this.layoutWatchTargets || []).forEach((el) => {
      try {
        this.stageObserver.unobserve(el);
      } catch {
        // 이전 뷰의 상자가 이미 제거됨
      }
    });
    this.layoutWatchTargets = [];
  }

  watchBattleLayout() {
    if (typeof ResizeObserver === "undefined" || !this.ui?.root) return;
    if (!this.stageObserver) {
      this.stageObserver = new ResizeObserver(() => {
        if (this.scene.isActive()) this.layoutStage();
      });
    }
    this.stageObserver.observe(this.ui.root);
  }

  observeBattleLayoutBoxes() {
    if (!this.ui?.root) return;
    this.unobserveLayoutTargets();
    if (typeof ResizeObserver === "undefined") return;
    if (!this.stageObserver) this.watchBattleLayout();
    const boxes = [
      this.ui.root.querySelector(".battle-status"),
      this.ui.root.querySelector(".battle-stage"),
      this.ui.root.querySelector(".battle-dock")
    ];
    boxes.forEach((el) => {
      if (!el) return;
      this.stageObserver.observe(el);
      this.layoutWatchTargets.push(el);
    });
  }

  syncBattleLayout() {
    this.observeBattleLayoutBoxes();
    this.layoutStage();
  }

  isActorMotionLocked() {
    return this.busy || this.poseTweenLock || this.phase === "catching";
  }

  lockPose(ms) {
    this.poseTweenLock = true;
    this.time.delayedCall(this.motionMs(ms), () => {
      this.poseTweenLock = false;
      // 잠금 중 resize가 새 rest 좌표만 계산했을 수 있어, 종료 즉시 실제 위치도 맞춥니다.
      if (this.scene.isActive() && !this.returningToOverworld) this.layoutStage();
    });
  }

  cacheActorStageClamp(stage, pad, playerHalfW, playerHalfH, enemyHalfW, enemyHalfH) {
    this.actorStageClamp = {
      x: stage.x,
      y: stage.y,
      w: stage.w,
      h: stage.h,
      pad,
      playerHalfW,
      playerHalfH,
      enemyHalfW,
      enemyHalfH,
      enemyPlatY: enemyHalfH * 0.72,
      playerPlatY: playerHalfH * 0.95
    };
  }

  constrainActorsToStage() {
    const box = this.actorStageClamp;
    if (box == null || this.isCombatPresentation() === false) return;
    if (this.enemyRoot == null || this.playerSprite == null) return;
    const minX = box.x + box.pad;
    const maxX = box.x + box.w - box.pad;
    const minY = box.y + box.pad;
    const maxY = box.y + box.h - box.pad;
    this.playerSprite.setPosition(
      Phaser.Math.Clamp(this.playerSprite.x, minX + box.playerHalfW, maxX - box.playerHalfW),
      Phaser.Math.Clamp(this.playerSprite.y, minY + box.playerHalfH, maxY - box.playerHalfH)
    );
    this.enemyRoot.setPosition(
      Phaser.Math.Clamp(this.enemyRoot.x, minX + box.enemyHalfW, maxX - box.enemyHalfW),
      Phaser.Math.Clamp(this.enemyRoot.y, minY + box.enemyHalfH, maxY - box.enemyHalfH)
    );
    // 포획 중에는 그림자·볼 착지를 rest에 고정합니다. 공격 연출에서는 적을 따라갑니다.
    if (this.phase === "catching") {
      const rest = this.enemyRest;
      this.enemyPlatform?.setPosition(
        rest?.x ?? this.enemyRoot.x,
        (rest?.y ?? this.enemyRoot.y) + box.enemyPlatY
      );
    } else {
      this.enemyPlatform?.setPosition(this.enemyRoot.x, this.enemyRoot.y + box.enemyPlatY);
    }
    this.playerPlatform?.setPosition(this.playerSprite.x, this.playerSprite.y + box.playerPlatY);
  }

  update() {
    this.constrainActorsToStage();
    if (this.ballMotion) this.applyBallMotion();
  }

  // DOM 영역을 Phaser 캔버스 좌표로 변환합니다.
  measureBox(selector) {
    const el = this.ui?.root?.querySelector(selector);
    const canvas = this.game.canvas?.getBoundingClientRect();
    if (!el || !canvas?.width || !canvas?.height) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return null;
    const sx = this.scale.width / canvas.width;
    const sy = this.scale.height / canvas.height;
    const box = {
      x: (rect.left - canvas.left) * sx,
      y: (rect.top - canvas.top) * sy,
      w: rect.width * sx,
      h: rect.height * sy
    };
    box.width = box.w;
    box.height = box.h;
    return box;
  }

  getStageBounds() {
    return this.measureBox(".battle-stage");
  }

  fallbackStageBox() {
    const w = this.scale.width;
    const h = this.scale.height;
    const top = Math.min(72, h * 0.14);
    const dock = Math.min(h * 0.42, Math.max(140, h * 0.36));
    const box = {
      x: 12,
      y: top,
      w: Math.max(80, w - 24),
      h: Math.max(96, h - top - dock - 12)
    };
    box.width = box.w;
    box.height = box.h;
    return box;
  }

  // ─── 캔버스 무대 ─────────────────────────────────────────

  buildStage() {
    this.groundFill = this.add.image(0, 0, ensurePixelDot(this)).setOrigin(0.5).setDepth(0).setTint(0x9dae7c);
    const ovals = Object.fromEntries(OVAL_TEXTURES.map(([key, w, h]) => [key, ensureSteppedOval(this, key, w, h)]));
    this.enemyPlatform = this.add.image(0, 0, ovals["battle-platform-enemy"])
      .setDisplaySize(144, 30).setDepth(2).setTint(0x2f5a4c).setAlpha(0.85);
    this.playerPlatform = this.add.image(0, 0, ovals["battle-platform-player"])
      .setDisplaySize(176, 46).setDepth(2).setTint(0x2f5a4c).setAlpha(0.85);
    this.ballShadow = this.add.image(0, 0, ovals["battle-ball-shadow"])
      .setDisplaySize(56, 16).setDepth(3).setTint(0x1a3a34).setAlpha(0.55).setName("ball-shadow").setVisible(false);

    this.enemyRoot = this.add.container(0, 0).setDepth(10).setName("enemy-animal");
    this.enemyVisualRoot = this.add.container(0, 0);
    const frameDesc = getAnimalFrame(this.animal.id, 0);
    let bodyArt;
    if (frameDesc && this.textures.exists(frameDesc.key)) {
      this.textures.get(frameDesc.key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      bodyArt = this.add.image(0, 0, frameDesc.key, frameDesc.frame)
        .setDisplaySize(ENEMY_BODY_PX, ENEMY_BODY_PX)
        .setFlipX(shouldFlipAnimalTowardLeft(this.animal.id));
    } else {
      // 동물 그림이 없을 때만 중립 표시 — 픽셀 아트·이모지 몸통 없음
      bodyArt = this.add.container(0, 0);
      bodyArt.add([
        this.add.circle(0, 0, 26, 0xaccec1).setStrokeStyle(2, 0x5c536a),
        this.add.text(0, 1, "\u003F", {
          fontFamily: KOREAN_FONT, fontSize: "22px", color: "#5c536a", fontStyle: "bold"
        }).setOrigin(0.5)
      ]);
    }
    bodyArt.setName("enemy-body");
    this.enemyVisualRoot.add(bodyArt);
    this.enemyRoot.add(this.enemyVisualRoot);

    this.createPlayerSprite();

    this.enemyFloatTween = this.tweens.add({
      targets: this.enemyVisualRoot,
      y: "+=3",
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    this.loadBackdrop();
    this.layoutStage();
  }

  applyBackdropPalette(spec) {
    if (typeof spec?.sky === "number") this.cameras.main.setBackgroundColor(spec.sky);
    if (typeof spec?.ground === "number" && this.groundFill?.active) {
      this.groundFill.setTint(spec.ground);
    }
  }

  loadBackdrop() {
    const spec = battleBackdropFor(this.regionId, this.animalId);
    this.backdropSpec = spec;
    this.applyBackdropPalette(spec);
    const owner = this.groundFill;
    const key = spec.key;
    const place = () => {
      // 탐험 프리페치가 아직 도는 중이거나, 재시작으로 무대가 바뀐 뒤 늦게 온 콜백은 화면을 건드리지 않습니다.
      if (owner !== this.groundFill || owner.active === false) return;
      if (this.textures.exists(key) === false) return;
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
      this.backdrop?.destroy();
      this.backdrop = this.add.image(0, 0, key).setOrigin(0.5).setDepth(0).setName("battle-backdrop");
      this.layoutStage();
    };
    if (this.textures.exists(key)) {
      place();
      return;
    }
    // 탐험 씬 프리페치가 끝나지 않았으면 여기서 직접 받습니다 — 조우가 빨라도 배경은 결국 뜹니다.
    this.load.image(key, spec.url);
    this.load.once(Phaser.Loader.Events.COMPLETE, place);
    this.load.start();
  }

  createPlayerSprite() {
    if (this.playerSprite?.active) return this.playerSprite;
    const texture = this.textures.get(PLAYER_KEY);
    if (texture.has(PLAYER_FRAME) === false) {
      const source = texture.get(4);
      // 원본 48px 셀의 투명 여백만 제외합니다. 캐릭터 픽셀은 바꾸지 않습니다.
      texture.add(
        PLAYER_FRAME,
        source.sourceIndex,
        source.cutX + PLAYER_CROP.x,
        source.cutY + PLAYER_CROP.y,
        PLAYER_CROP.width,
        PLAYER_CROP.height
      );
    }
    this.playerSprite = this.add.sprite(0, 0, PLAYER_KEY, PLAYER_FRAME).setDepth(5).setName("battle-player");
    this.setPlayerPose("battle");
    return this.playerSprite;
  }

  ballPaintRadius(scale) {
    return BALL_RADIUS * scale;
  }

  ballHitPoint() {
    if (this.phase === "catching" && this.enemyRest) {
      return { x: this.enemyRest.x, y: this.enemyRest.y };
    }
    return {
      x: this.enemyRoot?.x ?? this.enemyRest?.x ?? 0,
      y: this.enemyRoot?.y ?? this.enemyRest?.y ?? 0
    };
  }

  ballThrowStart() {
    const w = this.stageBox?.w || 200;
    const h = this.stageBox?.h || 200;
    return {
      x: this.playerSprite.x + Math.min(26, w * 0.06),
      y: this.playerSprite.y - Math.min(52, h * 0.18)
    };
  }

  enemyGroundY() {
    if (this.phase === "catching") {
      const restY = this.enemyRest?.y ?? this.enemyRoot?.y ?? 0;
      return restY + (this.actorStageClamp?.enemyPlatY ?? 24);
    }
    if (this.enemyPlatform?.active) return this.enemyPlatform.y;
    const hit = this.ballHitPoint();
    return hit.y + (this.actorStageClamp?.enemyPlatY ?? 24);
  }

  ballGroundPoint(scale) {
    if (this.phase === "catching") {
      const rest = this.enemyRest;
      return {
        x: rest?.x ?? this.enemyPlatform?.x ?? this.ballHitPoint().x,
        y: this.enemyGroundY() - this.ballPaintRadius(scale)
      };
    }
    return {
      x: this.enemyPlatform?.x ?? this.ballHitPoint().x,
      y: this.enemyGroundY() - this.ballPaintRadius(scale)
    };
  }

  syncBallShadow(scale) {
    if (!this.ballShadow) return;
    const ball = this.catchBall;
    const kind = this.ballMotion?.kind;
    const show = Boolean(ball?.active) && GROUND_BALL_KINDS.has(kind);
    this.ballShadow.setVisible(show);
    if (!show) return;
    const s = scale || ball.scaleX || BALL_LAND_SCALE;
    this.ballShadow.setPosition(ball.x, this.enemyGroundY());
    this.ballShadow.setDisplaySize(
      Math.max(28, 56 * (s / BALL_LAND_SCALE)),
      Math.max(8, 14 * (s / BALL_LAND_SCALE))
    );
  }

  addBallLabel(text, kind, style) {
    const ball = this.catchBall;
    if (!ball?.active) return null;
    const yOff = kind === "flash" ? 66 : 34;
    const label = this.add.text(ball.x, ball.y - yOff, text, style).setOrigin(0.5).setDepth(kind === "flash" ? 1301 : 1201);
    label.setData("kind", kind);
    this.ballLabels.push(label);
    return label;
  }

  repositionBallLabels() {
    const ball = this.catchBall;
    if (!ball?.active) return;
    (this.ballLabels || []).forEach((label) => {
      if (!label?.active) return;
      const kind = label.getData("kind");
      if (kind === "tick") label.x = ball.x;
      if (kind === "flash") {
        label.x = ball.x;
        label.y = ball.y - 66;
      }
    });
  }

  applyBallMotion() {
    const ball = this.catchBall;
    const motion = this.ballMotion;
    if (!ball?.active || !motion) return;
    const t = this.ballTrack?.t ?? 1;
    if (motion.kind === "throw") {
      const start = this.ballThrowStart();
      const hit = this.ballHitPoint();
      const peakX = (start.x + hit.x) / 2;
      const apex = Math.min(88, (this.stageBox?.h || 200) * 0.32);
      const peakY = Math.max((this.stageBox?.y || 0) + 12, Math.min(start.y, hit.y) - apex);
      const inv = 1 - t;
      ball.x = inv * inv * start.x + 2 * inv * t * peakX + t * t * hit.x;
      ball.y = inv * inv * start.y + 2 * inv * t * peakY + t * t * hit.y;
      if (!this.prefersReducedMotion()) ball.rotation = t * 9;
      ball.setScale(BALL_THROW_SCALE);
      this.ballShadow?.setVisible(false);
    } else if (motion.kind === "absorb") {
      const hit = this.ballHitPoint();
      ball.setPosition(hit.x, hit.y).setScale(BALL_THROW_SCALE);
      this.ballShadow?.setVisible(false);
    } else if (motion.kind === "land") {
      const hit = this.ballHitPoint();
      const ground = this.ballGroundPoint(BALL_LAND_SCALE);
      const eased = Phaser.Math.Easing.Bounce.Out(t);
      const scale = Phaser.Math.Linear(BALL_THROW_SCALE, BALL_LAND_SCALE, Math.min(1, t));
      ball.setScale(scale);
      ball.setAngle(0);
      ball.x = ground.x;
      ball.y = Phaser.Math.Linear(hit.y, ground.y, eased);
      this.syncBallShadow(scale);
    } else if (motion.kind === "wobble" || motion.kind === "success") {
      const scale = ball.scaleX;
      const ground = this.ballGroundPoint(scale);
      ball.setPosition(ground.x, ground.y);
      this.syncBallShadow(scale);
    } else if (motion.kind === "reveal") {
      const start = this.ballGroundPoint(BALL_LAND_SCALE);
      const rest = this.enemyRest || start;
      const scale = this.enemyDisplayScale || 1;
      ball.setPosition(start.x, start.y).setScale(BALL_LAND_SCALE).setAlpha(1 - t);
      this.syncBallShadow(BALL_LAND_SCALE);
      this.enemyRoot.setVisible(true);
      this.enemyRoot.setAngle(0);
      this.enemyRoot.setPosition(
        Phaser.Math.Linear(start.x, rest.x, t),
        Phaser.Math.Linear(start.y, rest.y, t)
      );
      this.enemyRoot.setScale(Phaser.Math.Linear(0.12, scale, t));
      if (this.enemyVisualRoot) this.enemyVisualRoot.y = 0;
    }
    this.repositionBallLabels();
  }

  /**
   * 배경을 화면에 빈틈 없이 덮습니다. targetGroundY가 있으면 원본 groundLine이
   * 그 y에 오도록 필요한 만큼만 더 확대하고 세로 위치를 맞춥니다.
   */
  layoutBackdrop(width, height, targetGroundY = null) {
    const backdrop = this.backdrop;
    if (!backdrop?.active) return null;
    const groundLine = this.backdropSpec?.groundLine;
    const aspect = backdrop.width / backdrop.height;
    let displayHeight = Math.max(height, width / aspect);

    if (Number.isFinite(targetGroundY) && Number.isFinite(groundLine)) {
      displayHeight = Math.max(
        displayHeight,
        targetGroundY / groundLine,
        (height - targetGroundY) / (1 - groundLine)
      );
      backdrop.setPosition(
        width / 2,
        targetGroundY - displayHeight * (groundLine - 0.5)
      );
    } else {
      backdrop.setPosition(width / 2, height / 2);
    }
    backdrop.setScale(displayHeight / backdrop.height);
    return Number.isFinite(groundLine)
      ? backdrop.y + backdrop.displayHeight * (groundLine - 0.5)
      : null;
  }

  layoutStage() {
    const w = this.scale.width;
    const h = this.scale.height;
    let backdropGroundY = this.layoutBackdrop(w, h);

    const hideActors = !this.isCombatPresentation();
    if (!this.enemyRoot) return;

    this.enemyRoot.setVisible(!hideActors && !this.enemyAbsorbed);
    this.playerSprite?.setVisible(!hideActors);
    this.enemyPlatform?.setVisible(!hideActors);
    this.playerPlatform?.setVisible(!hideActors);
    if (this.catchBall?.active) this.catchBall.setVisible(!hideActors);
    if (hideActors) this.ballShadow?.setVisible(false);

    if (hideActors) {
      this.enemyFloatTween?.pause();
      if (this.enemyVisualRoot) this.enemyVisualRoot.y = 0;
      this.groundFill?.setVisible(false);
      return;
    }

    // 좌표는 창 비율이 아니라 실제 .battle-stage 상자에서 뽑습니다.
    // 독 내용 전·뷰 교체 중의 가짜 측정은 rest를 덮어쓰지 않습니다.
    const measured = this.getStageBounds();
    if (measured) this.stageBox = measured;
    const stage = this.stageBox || this.fallbackStageBox();
    this.groundFill?.setVisible(true)
      .setPosition(stage.x + stage.w / 2, stage.y + stage.h / 2)
      .setDisplaySize(stage.w, stage.h)
      .setAlpha(0.16);

    const pad = 10;
    const innerW = Math.max(64, stage.w - pad * 2);
    const innerH = Math.max(64, stage.h - pad * 2);
    const enemyScale = Phaser.Math.Clamp(Math.min(innerH * 0.46, innerW * 0.28, 96) / 96, 0.55, 1);
    const enemyW = 120 * enemyScale;
    const enemyH = 96 * enemyScale;
    const playerPx = enemyH * 0.75;

    const clampX = (x, half) => Phaser.Math.Clamp(x, stage.x + pad + half, stage.x + stage.w - pad - half);
    const clampY = (y, half) => Phaser.Math.Clamp(y, stage.y + pad + half, stage.y + stage.h - pad - half);
    const pHalf = playerPx / 2;
    const eHalfW = enemyW / 2;
    const eHalfH = enemyH / 2;
    const enemyHalfH = eHalfH + 4;
    const enemyPlatformOffset = enemyHalfH * 0.72;

    if (backdropGroundY != null) {
      const minEnemyY = stage.y + pad + enemyHalfH;
      const maxEnemyY = stage.y + stage.h - pad - enemyHalfH;
      const alignedEnemyY = Phaser.Math.Clamp(
        backdropGroundY - enemyPlatformOffset,
        minEnemyY,
        maxEnemyY
      );
      backdropGroundY = this.layoutBackdrop(w, h, alignedEnemyY + enemyPlatformOffset);
    }

    if (measured || !this.playerRest || !this.enemyRest) {
      this.playerRest = {
        x: clampX(stage.x + pad + innerW * 0.22, pHalf),
        y: clampY(stage.y + pad + innerH * 0.74, pHalf)
      };
      this.enemyRest = {
        x: clampX(stage.x + pad + innerW * 0.78, eHalfW),
        y: clampY(
          backdropGroundY == null
            ? stage.y + pad + innerH * 0.36
            : backdropGroundY - enemyPlatformOffset,
          eHalfH
        )
      };
    }

    this.setPlayerPose(this.playerPose);
    // 자세별 원본 프레임 크기가 달라도 표시 높이와 프레임 하단(발 위치)은 같습니다.
    this.playerSprite.setScale(playerPx / this.playerSprite.height);
    const motionLocked = this.isActorMotionLocked();
    const catching = this.phase === "catching";
    this.enemyDisplayScale = enemyScale;
    if (catching === false) this.enemyRoot.setScale(enemyScale);
    if (motionLocked === false) this.enemyRoot.setAngle(0);
    this.cacheActorStageClamp(stage, pad, pHalf, pHalf, eHalfW, enemyHalfH);

    if (motionLocked === false) {
      this.playerSprite.setPosition(this.playerRest.x, this.playerRest.y).clearTint();
      this.enemyRoot.setPosition(this.enemyRest.x, this.enemyRest.y);
    }
    this.constrainActorsToStage();
    if (this.ballMotion) this.applyBallMotion();

    this.enemyPlatform.setDisplaySize(Math.max(72, enemyW * 1.05), Math.max(14, 18 * enemyScale));
    this.playerPlatform.setDisplaySize(playerPx * 1.05, Math.max(8, playerPx * 0.16));

    if (this.prefersReducedMotion() || this.enemyAbsorbed || catching) {
      this.enemyFloatTween?.pause();
      if (this.enemyVisualRoot) this.enemyVisualRoot.y = 0;
    } else if (this.enemyFloatTween) {
      if (!this.enemyFloatTween.isPlaying()) this.enemyFloatTween.resume();
    }
  }

  setPresentation(mode) {
    this.presentationMode = mode;
    // 관찰 카드로 전환해 배우를 숨겨도 처음 불러온 지역 배경은 계속 유지합니다.
    this.backdrop?.setVisible(true);
    if (this.ui?.root) {
      const stage = this.isCombatPresentation();
      this.ui.root.classList.toggle("battle-screen--stage", stage);
      this.ui.root.classList.toggle("battle-screen--read", !stage);
      this.syncPhaseAttr();
    }
    this.layoutStage();
  }

  // ─── ScreenUi ───────────────────────────────────────────

  ensureUi() {
    if (this.ui?.root?.isConnected) return this.ui;
    this.disposeLayoutWatch();
    this.ui = createScreen(this, {
      label: this.animal ? `${this.animal.name} 관찰` : "관찰",
      className: "battle-screen",
      onEscape: () => this.tryFlee()
    });
    this.watchBattleLayout();
    return this.ui;
  }

  beginView() {
    this.ensureUi();
    this.viewGen += 1;
    this.optionButtons = [];
    this.photoGateControls = [];
    this.photoNote = null;
    this.clearEmotes();
    disposePhotos(this.ui.root);
    this.unobserveLayoutTargets();
    this.ui.root.replaceChildren();
    this.ui.root.focus({ preventScroll: true });
    const stage = this.isCombatPresentation();
    this.ui.root.classList.toggle("battle-screen--stage", stage);
    this.ui.root.classList.toggle("battle-screen--read", !stage);
    this.syncPhaseAttr();
    return this.viewGen;
  }

  isLive(gen) {
    return this.scene.isActive()
      && this.viewGen === gen
      && !this.returningToOverworld
      && Boolean(this.ui?.root?.isConnected);
  }

  beginAction() {
    this.actionGen += 1;
    return this.actionGen;
  }

  isAction(gen) {
    return this.scene.isActive() && this.actionGen === gen && !this.returningToOverworld;
  }

  afterView(ms, gen, fn) {
    return this.time.delayedCall(ms, () => {
      if (!this.isLive(gen)) return;
      fn();
    });
  }

  afterAction(ms, gen, fn) {
    return this.time.delayedCall(ms, () => {
      if (!this.isAction(gen)) return;
      fn();
    });
  }

  button(label, onClick, opts = {}) {
    const gen = this.viewGen;
    return createButton(label, () => {
      if (!this.isLive(gen)) return;
      onClick();
    }, opts);
  }

  canFlee() {
    return this.phase !== "victory"
      && this.phase !== "catching"
      && this.phase !== "failure";
  }

  tryFlee() {
    if (this.returningToOverworld) return;
    if (!this.canFlee()) return;
    this.returnToOverworld();
  }

  appendChrome(title, { flee = true, meters = false } = {}) {
    const combat = this.isCombatPresentation();
    const header = createElement("header", combat ? "ui-header battle-status" : "ui-header");
    if (combat) header.dataset.name = "battle-status";
    const lead = createElement("div", "battle-hud__lead");
    lead.append(createElement("p", "ui-kicker", this.animal ? `관찰 · ${this.animal.name}` : "관찰"));
    lead.append(createElement("p", "battle-title", title));
    if (meters) lead.append(this.buildMeters());
    header.append(lead);
    if (flee && this.canFlee()) {
      const fleeBtn = this.button("후퇴", () => this.tryFlee());
      fleeBtn.dataset.action = "flee";
      fleeBtn.dataset.name = "battle-flee";
      header.append(fleeBtn);
    }
    this.ui.root.append(header);
    return header;
  }

  /** 하트 판 + 기력 판 — 문제 수만큼 칸을 만들고 상태는 색과 aria로 남깁니다. */
  buildMeterPlates() {
    const gaugeMax = Math.max(1, this.questions.length);
    const hearts = createElement("div", "battle-plate battle-plate--hearts");
    hearts.dataset.name = "battle-hearts";
    hearts.setAttribute("role", "img");
    hearts.setAttribute("aria-label", `나의 하트 ${this.playerHearts}/${MAX_HEARTS}`);
    if (this.playerHearts <= 1) hearts.classList.add("is-low");
    const heartRow = createElement("div", "battle-hearts");
    heartRow.setAttribute("aria-hidden", "true");
    for (let i = 0; i < MAX_HEARTS; i += 1) heartRow.append(heartIcon(i < this.playerHearts));
    hearts.append(createElement("span", "battle-plate__label", "나"), heartRow);

    const gauge = createElement("div", "battle-plate battle-plate--gauge");
    gauge.dataset.name = "battle-gauge";
    gauge.setAttribute("role", "img");
    gauge.setAttribute("aria-label", `${this.animal.name} 기력 ${this.enemyGauge}/${gaugeMax}`);
    if (this.enemyGauge <= 1) gauge.classList.add("is-low");
    const track = createElement("div", "battle-gauge");
    track.setAttribute("aria-hidden", "true");
    for (let i = 0; i < gaugeMax; i += 1) {
      track.append(createElement("span", i < this.enemyGauge ? "battle-gauge__seg is-on" : "battle-gauge__seg"));
    }
    gauge.append(createElement("span", "battle-plate__label", "기력"), track);
    return [hearts, gauge];
  }

  buildMeters() {
    const plates = createElement("div", "battle-hud__plates");
    plates.dataset.name = "battle-plates";
    plates.append(...this.buildMeterPlates());
    return plates;
  }

  appendReadBody() {
    const body = createElement("div", "ui-body battle-read ui-two-column");
    const photoCard = createElement("div", "battle-photo-card ui-card");
    const content = createElement("div", "battle-content-card ui-card");
    this.mountPhoto(photoCard);
    body.append(photoCard, content);
    this.ui.root.append(body);
    return content;
  }

  appendCombatDock() {
    const stage = createElement("div", "battle-stage");
    stage.dataset.name = "battle-stage";
    stage.setAttribute("aria-hidden", "true");
    const dock = createElement("div", "battle-dock");
    dock.dataset.name = "battle-dock";
    this.ui.root.append(stage, dock);
    return dock;
  }

  photoSrc() {
    return this.animal?.image || this.animal?.remoteImage || "";
  }

  mountPhoto(parent) {
    const gen = this.viewGen;
    const src = this.photoSrc();
    this.photoState = src ? "loading" : "error";
    const figure = createPhoto(src, `${this.animal.name}의 모습`, {
      fit: "contain",
      expandable: true,
      onState: (state) => {
        if (!this.isLive(gen)) return;
        this.photoState = state;
        this.syncPhotoGates();
        if (this.isCombatPresentation()) this.layoutStage();
      }
    });
    figure.dataset.name = "observe-photo";
    this.photoNote = createElement("p", "ui-note");
    parent.append(figure, this.photoNote);
    this.syncPhotoGates();
  }

  mountCatchPhoto(parent) {
    const gen = this.viewGen;
    const src = this.photoSrc();
    const figure = createPhoto(src, `${this.animal.name}의 모습`, {
      fit: "contain",
      expandable: true,
      onState: () => {
        if (!this.isLive(gen)) return;
        if (this.isCombatPresentation()) this.layoutStage();
      }
    });
    figure.dataset.name = "catch-photo";
    parent.append(figure);
    return figure;
  }

  gate(button) {
    this.photoGateControls.push(button);
    button.disabled = this.photoState !== "loaded";
    return button;
  }

  syncPhotoGates() {
    const ready = this.photoState === "loaded";
    this.photoGateControls.forEach((el) => {
      if (el.dataset.locked === "1") {
        el.disabled = true;
        return;
      }
      el.disabled = !ready;
    });
    if (!this.photoNote) return;
    if (ready) {
      this.photoNote.hidden = true;
      this.photoNote.textContent = "";
      return;
    }
    this.photoNote.hidden = false;
    this.photoNote.textContent = this.photoState === "loading"
      ? "사진을 다 보기 전에는 퀴즈로 넘어갈 수 없어요."
      : "사진을 보지 못하면 퀴즈가 불공정해져요. 다시 불러오거나 후퇴하세요.";
  }

  cancelObservationAdvance() {
    this.observationAdvanceTimer?.remove(false);
    this.observationAdvanceTimer = null;
    this.observationAdvancePending = false;
  }

  // ─── 막다른 길 · 인트로 · 관찰 ─────────────────────────

  showDeadEnd(message, delayMs) {
    this.phase = "dead";
    this.setPresentation("dead");
    const gen = this.beginView();
    this.appendChrome(message, { flee: true, meters: false });
    const body = createElement("div", "ui-body");
    const card = createElement("div", "ui-card");
    card.append(createElement("p", "battle-copy", message));
    const actions = createElement("div", "ui-actions");
    const back = this.button("모험으로 돌아가기", () => this.returnToOverworld(), { primary: true });
    back.dataset.action = "return";
    back.dataset.name = "primary-action";
    actions.append(back);
    card.append(actions);
    body.append(card);
    this.ui.root.append(body);
    this.afterView(delayMs, gen, () => this.returnToOverworld());
  }

  showIntro() {
    this.phase = "intro";
    this.setPresentation("intro");
    const gen = this.beginView();
    this.appendChrome("야생 동물 등장!");
    const panel = this.appendCombatDock();
    const card = createElement("div", "ui-card");
    card.append(createElement(
      "p",
      "battle-copy",
      `앗! 야생의 ${this.animal.name}이(가) 나타났어요!\n먼저 차분히 관찰해서 특징을 알아내요.`
    ));
    const actions = createElement("div", "ui-actions");
    const start = this.button("관찰 시작", () => this.showObservationOverview(), { primary: true });
    start.dataset.action = "observe-start";
    start.dataset.name = "primary-action";
    actions.append(start);
    card.append(actions);
    panel.append(card);
    this.syncBattleLayout();
    this.spawnEmote(this.enemyRoot.x - 14, this.enemyRoot.y - 68, "surprise", { depth: 1100 });
    this.afterView(ENCOUNTER_INTRO_MS, gen, () => {
      if (this.phase === "intro") this.showObservationOverview();
    });
  }

  showObservationOverview() {
    this.phase = "observe";
    this.observationStage = "overview";
    this.cancelObservationAdvance();
    this.setPresentation("overview");
    this.beginView();
    this.appendChrome(`${this.animal.name}의 전체 모습을 먼저 살펴봐요`);
    const content = this.appendReadBody();
    content.append(createElement("p", "battle-copy", `${this.animal.name}의 전체 모습을 먼저 살펴봐요`));
    const actions = createElement("div", "ui-actions");
    const start = this.gate(this.button("특징 살펴보기", () => {
      this.observationStage = "details";
      this.observePage = 0;
      this.showObservation();
    }, { primary: true }));
    start.dataset.action = "observe-start-details";
    start.dataset.name = "primary-action";
    actions.append(start);
    content.append(actions);
  }

  observationPages() {
    const obs = this.observation;
    return [
      { key: "appearance", title: "생김새", body: obs.appearance, check: "몸의 특징을 봤어요" },
      { key: "lifestyle", title: "움직임", body: obs.lifestyle, check: "움직임을 봤어요" },
      { key: "habitat", title: "사는 곳", body: obs.habitatLife, check: "사는 곳을 봤어요" }
    ];
  }

  showObservation() {
    this.phase = "observe";
    this.observationStage = "details";
    this.cancelObservationAdvance();
    this.setPresentation("observe");
    const gen = this.beginView();
    const pages = this.observationPages();
    if (this.observePage < 0) this.observePage = 0;
    if (this.observePage > pages.length - 1) this.observePage = pages.length - 1;
    const page = pages[this.observePage];
    const checked = this.observeChecks[page.key];
    const ready = Object.values(this.observeChecks).every(Boolean);

    this.appendChrome(`관찰하기 · ${this.animal.name}`);
    const content = this.appendReadBody();

    const stage = createElement("div", "battle-progress");
    stage.append(createElement("p", "ui-kicker", `학습 ${this.observePage + 1}/3 · ${page.title}`));
    const dots = createElement("div", "battle-progress__dots");
    dots.setAttribute("role", "list");
    pages.forEach((item, index) => {
      const done = this.observeChecks[item.key];
      const dot = createElement("span", "battle-progress__dot", done ? "✓" : String(index + 1));
      dot.setAttribute("role", "listitem");
      dot.setAttribute("aria-label", `${item.title} · ${done ? "확인 완료" : "확인 전"}`);
      if (done) dot.classList.add("is-done");
      if (index === this.observePage) {
        dot.classList.add("is-current");
        dot.setAttribute("aria-current", "step");
      }
      dots.append(dot);
    });
    stage.append(dots);
    content.append(stage);

    const learning = createElement("div", "battle-learning");
    learning.append(createElement("span", "battle-accent"));
    const learningBody = createElement("div");
    learningBody.append(
      createElement("p", "ui-kicker", "관찰 포인트"),
      createElement("p", "battle-copy", page.body)
    );
    learning.append(learningBody);
    content.append(learning);

    const actions = createElement("div", "ui-actions");
    if (!checked) {
      const checkBtn = this.button(`${page.check}`, () => {
        if (this.observationAdvancePending) return;
        this.observeChecks[page.key] = true;
        if (this.observePage < pages.length - 1) {
          this.observationAdvancePending = true;
          const checkedPage = this.observePage;
          this.observationAdvanceTimer = this.time.delayedCall(OBSERVATION_AUTO_ADVANCE_MS, () => {
            this.observationAdvanceTimer = null;
            if (
              !this.isLive(gen)
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
      }, { primary: true });
      checkBtn.dataset.action = "observe-check";
      checkBtn.dataset.name = "primary-action";
      actions.append(checkBtn);
    } else if (ready) {
      const battle = this.gate(this.button("퀴즈 배틀 시작!", () => this.startBattle(), { primary: true }));
      battle.dataset.action = "start-battle";
      battle.dataset.name = "primary-action";
      actions.append(battle);
    } else {
      const done = this.button(`✓ ${page.check}`, () => {}, { disabled: true });
      done.dataset.name = "observe-complete-status";
      actions.append(done);
    }

    const nav = createElement("div", "ui-actions");
    const prev = this.button(this.observePage > 0 ? "← 이전" : "← 전체 사진", () => {
      if (this.observePage > 0) {
        this.observePage -= 1;
        this.showObservation();
      } else {
        this.showObservationOverview();
      }
    });
    prev.dataset.name = "observe-previous";
    nav.append(prev);
    if (checked && this.observePage < pages.length - 1) {
      const next = this.button("다음 →", () => {
        this.observePage += 1;
        this.showObservation();
      }, { primary: true });
      next.dataset.name = "primary-action";
      nav.append(next);
    }
    content.append(actions, nav);
  }

  // ─── 전투 루프 ──────────────────────────────────────────

  startBattle() {
    this.resetCombatSession();
    this.phase = "battle";
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
    this.setPresentation("question");
    this.beginView();
    const q = this.questions[this.qIndex];
    const typeLabel = getQuestionTypeLabel(q, this.qIndex);
    this.appendChrome(`내 턴 · 문제 ${this.qIndex + 1}/${this.questions.length} (${typeLabel})`, { meters: true });
    const dock = this.appendCombatDock();
    const card = createElement("div", "ui-card battle-question-card");
    this.mountPhoto(card);
    const fact = createElement("p", "ui-muted", `${this.buildSafeFacts(q.hintKey)}`);
    fact.dataset.name = "fact-copy";
    const question = createElement("p", "battle-copy", q.text);
    question.dataset.name = "question-copy";
    card.append(fact, question);
    const actions = createElement("div", "ui-actions");
    q.options.forEach((option, index) => {
      const btn = this.gate(this.button(option, () => {
        btn.dataset.locked = "1";
        btn.disabled = true;
        this.onAnswer(option);
      }, { className: "battle-option" }));
      btn.dataset.action = "answer";
      btn.dataset.index = String(index + 1);
      btn.dataset.name = `answer-option-${index + 1}`;
      this.optionButtons.push(btn);
      actions.append(btn);
    });
    card.append(actions);
    dock.append(card);
    this.syncBattleLayout();
  }

  lockOptions() {
    this.optionButtons.forEach((button) => {
      button.disabled = true;
    });
  }

  onAnswer(option) {
    if (this.busy || this.phase !== "battle") return;
    if (this.photoState !== "loaded") return;
    this.busy = true;
    this.lockOptions();
    const q = this.questions[this.qIndex];
    if (option === q.correct) this.playerAttack();
    else this.enemyAttack(q);
  }

  playerAttack() {
    const action = this.beginAction();
    const typeLabel = getQuestionTypeLabel(this.questions[this.qIndex], this.qIndex);
    this.setPresentation("battle-fx");
    this.beginView();
    this.appendChrome("공격 성공!", { meters: true });
    const panel = this.appendCombatDock();
    const card = createElement("div", "ui-card");
    card.append(createElement("p", "battle-copy", `정확한 관찰이에요! ${typeLabel} 공략 성공!`));
    panel.append(card);
    this.syncBattleLayout();
    this.spawnEmote(this.playerSprite.x, this.playerSprite.y - 78, "happy", { depth: 1100 });

    const lunge = Math.min(36, (this.stageBox?.w || 200) * 0.1);
    this.tweens.add({
      targets: this.playerSprite,
      x: this.playerSprite.x + lunge,
      duration: this.motionMs(170),
      yoyo: true,
      ease: "Cubic.easeOut"
    });
    this.afterAction(190, action, () => {
      this.cameras.main.shake(110, 0.0035);
      this.flashEnemy();
      this.enemyGauge -= 1;
      this.refreshFxMeters("gauge");
    });
    this.afterAction(1150, action, () => {
      this.qIndex += 1;
      if (this.enemyGauge <= 0 || this.qIndex >= this.questions.length) this.onVictory();
      else this.showQuestion();
    });
  }

  /** 피격·명중 직후 계기판만 다시 그립니다 — 뷰 재구성 없이 그대로 갱신. */
  refreshFxMeters(kind) {
    const plates = this.ui?.root.querySelector(".battle-hud__plates");
    if (!plates) return;
    const [hearts, gauge] = this.buildMeterPlates();
    const hit = kind === "hearts" ? hearts : kind === "gauge" ? gauge : null;
    if (hit) hit.classList.add("is-hit");
    plates.replaceChildren(hearts, gauge);
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
      if (!this.scene.isActive()) return;
      targets.forEach((t) => t.clearTint());
    });
  }

  enemyAttack(question) {
    const action = this.beginAction();
    this.setPresentation("battle-fx");
    this.beginView();
    this.appendChrome(`${this.animal.name}의 턴!`, { meters: true });
    const panel = this.appendCombatDock();
    const card = createElement("div", "ui-card");
    card.append(createElement("p", "battle-copy", `앗, 빗나갔어요! ${this.animal.name}의 헷갈리기 공격!`));
    panel.append(card);
    this.syncBattleLayout();

    const dx = Math.min(46, (this.stageBox?.w || 200) * 0.12);
    const dy = Math.min(26, (this.stageBox?.h || 200) * 0.08);
    this.tweens.add({
      targets: this.enemyRoot,
      x: this.enemyRoot.x - dx,
      y: this.enemyRoot.y + dy,
      duration: this.motionMs(200),
      yoyo: true,
      ease: "Cubic.easeOut"
    });
    this.afterAction(230, action, () => {
      this.cameras.main.shake(150, 0.006);
      this.playerSprite.setTintFill(0xff8080);
      this.time.delayedCall(140, () => {
        if (this.isAction(action)) this.playerSprite.clearTint();
      });
      this.playerHearts -= 1;
      this.refreshFxMeters("hearts");
      this.spawnEmote(this.playerSprite.x, this.playerSprite.y - 78, "sad", { depth: 1100 });
    });
    this.afterAction(1250, action, () => {
      if (this.playerHearts <= 0) this.onRetreat();
      else this.showHint(question.hintKey);
    });
  }

  showHint(hintKey) {
    this.phase = "hint";
    this.busy = false;
    this.setPresentation("hint");
    const gen = this.beginView();
    const section = getHintSection(this.animal, hintKey);
    this.appendChrome("단서 다시 보기", { meters: true });
    const dock = this.appendCombatDock();
    const card = createElement("div", "ui-card");
    this.mountPhoto(card);
    card.append(
      createElement("p", "ui-kicker", `${section.title}`),
      createElement("p", "battle-copy", section.body)
    );
    const actions = createElement("div", "ui-actions");
    const waitBtn = this.button("단서를 읽는 중이에요…", () => {}, { disabled: true });
    waitBtn.dataset.name = "hint-wait";
    actions.append(waitBtn);
    card.append(actions);
    dock.append(card);
    this.syncBattleLayout();
    this.afterView(HINT_LOCK_MS, gen, () => {
      if (this.phase !== "hint") return;
      waitBtn.remove();
      const retry = this.gate(this.button("같은 문제 다시 도전!", () => this.showQuestion(), { primary: true }));
      retry.dataset.action = "retry-hint";
      retry.dataset.name = "primary-action";
      actions.append(retry);
      this.syncBattleLayout();
    });
  }

  // ─── 승리 · 포획 · 후퇴 ─────────────────────────────────

  onVictory() {
    this.phase = "victory";
    this.busy = false;
    this.setPresentation("cinematic");
    this.beginView();
    this.appendChrome("포획", { flee: false, meters: true });
    const panel = this.appendCombatDock();
    const card = createElement("div", "ui-card");
    card.append(createElement("p", "battle-dock-title", "지금이 기회!"));
    card.append(createElement(
      "p",
      "battle-copy",
      `${this.animal.name}의 기력이 다 빠졌어요!\n도감볼을 던져 친구로 맞이해요!`
    ));
    const actions = createElement("div", "ui-actions");
    const throwBtn = this.button("도감볼 던지기!", () => {
      throwBtn.disabled = true;
      this.throwBall();
    }, { primary: true });
    throwBtn.dataset.action = "throw-ball";
    throwBtn.dataset.name = "primary-action";
    actions.append(throwBtn);
    card.append(actions);
    panel.append(card);
    this.syncBattleLayout();
    this.spawnEmote(this.enemyRoot.x, this.enemyRoot.y - 76, "surprise", { depth: 1100 });
    this.tweens.add({
      targets: this.enemyRoot,
      angle: { from: -3, to: 3 },
      duration: 140,
      yoyo: true,
      repeat: 2
    });
  }

  throwBall() {
    if (this.phase !== "victory" || this.ballThrown) return;
    this.ballThrown = true;
    this.phase = "catching";
    this.syncPhaseAttr();
    const action = this.beginAction();
    this.setPresentation("cinematic");
    this.beginView();
    this.appendChrome("도감볼 던지기!", { flee: false });
    const panel = this.appendCombatDock();
    const card = createElement("div", "ui-card");
    card.append(createElement("p", "battle-copy", "도감볼을 힘껏 던졌다…!"));
    panel.append(card);
    this.syncBattleLayout();

    const ballKey = ensureBallTexture(this);
    if (this.textures.exists(ballKey)) {
      this.textures.get(ballKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.clearCatchFx();
    const ball = this.add.image(0, 0, ballKey).setScale(0).setDepth(1200).setName("dex-ball");
    this.catchBall = ball;
    this.ballTrack = { t: 0 };
    this.ballMotion = { kind: "throw" };

    this.tweens.add({
      targets: this.playerSprite,
      x: this.playerSprite.x + Math.min(18, (this.stageBox?.w || 200) * 0.04),
      duration: this.motionMs(150),
      yoyo: true,
      ease: "Cubic.easeOut"
    });
    this.tweens.add({ targets: ball, scale: BALL_THROW_SCALE, duration: this.motionMs(140), ease: "Back.easeOut" });
    if (this.prefersReducedMotion()) {
      this.ballTrack.t = 1;
      ball.setScale(BALL_THROW_SCALE);
      this.applyBallMotion();
      this.absorbIntoBall(action);
      return;
    }
    this.tweens.add({
      targets: this.ballTrack,
      t: 1,
      duration: 640,
      delay: 140,
      ease: "Sine.easeIn",
      onUpdate: () => {
        if (!this.isAction(action) || !ball.active) return;
        this.applyBallMotion();
      },
      onComplete: () => {
        if (!this.isAction(action)) {
          this.clearCatchFx();
          return;
        }
        this.absorbIntoBall(action);
      }
    });
  }

  absorbIntoBall(action) {
    if (!this.catchBall?.active) return;
    this.ballMotion = { kind: "absorb" };
    this.ballTrack = { t: 1 };
    this.applyBallMotion();
    this.cameras.main.flash(150, 255, 240, 190);
    this.flashEnemy();
    this.tweens.add({
      targets: this.enemyRoot,
      scale: 0,
      angle: 24,
      duration: this.motionMs(330),
      ease: "Cubic.easeIn",
      onComplete: () => {
        if (!this.isAction(action)) return;
        this.enemyAbsorbed = true;
        this.enemyRoot.setVisible(false);
        this.ballMotion = { kind: "land" };
        this.ballTrack = { t: 0 };
        if (this.prefersReducedMotion()) {
          this.ballTrack.t = 1;
          this.applyBallMotion();
          this.wobbleBall(0, action);
          return;
        }
        this.tweens.add({
          targets: this.ballTrack,
          t: 1,
          duration: 300,
          ease: "Linear",
          onUpdate: () => {
            if (this.isAction(action)) this.applyBallMotion();
          },
          onComplete: () => {
            if (this.isAction(action)) this.wobbleBall(0, action);
          }
        });
      }
    });
  }

  wobbleBall(count, action) {
    const ball = this.catchBall;
    if (!this.isAction(action) || !ball?.active) return;
    this.ballMotion = { kind: "wobble" };
    this.applyBallMotion();
    if (count >= 3 || this.prefersReducedMotion()) {
      this.catchSuccess();
      return;
    }
    const tick = this.addBallLabel("딸깍…", "tick", {
      fontFamily: KOREAN_FONT,
      fontSize: "14px",
      color: "#fff8e7",
      stroke: "#3a2a18",
      strokeThickness: 3
    });
    this.tweens.add({
      targets: tick,
      y: (tick?.y || 0) - 9,
      alpha: 0,
      duration: this.motionMs(540),
      onComplete: () => {
        if (tick?.active) tick.destroy();
      }
    });
    this.tweens.add({
      targets: ball,
      angle: { from: -16, to: 16 },
      duration: this.motionMs(130),
      yoyo: true,
      repeat: 1,
      ease: "Sine.easeInOut",
      onComplete: () => {
        if (!this.isAction(action) || !ball.active) return;
        ball.setAngle(0);
        this.time.delayedCall(this.motionMs(200), () => this.wobbleBall(count + 1, action));
      }
    });
  }

  catchSuccess() {
    if (this.collectedOnce || this.returningToOverworld) return;
    this.collectedOnce = true;
    collectAnimal(this.animal.id);
    const ball = this.catchBall;
    if (!ball?.active) {
      this.restoreEnemyActor();
      this.phase = "result";
      this.showCatchResult();
      return;
    }
    this.ballMotion = { kind: "success" };
    this.applyBallMotion();
    this.cameras.main.flash(240, 255, 236, 160);
    this.spawnEmote(ball.x, ball.y - 46, "love", { depth: 1300 });
    this.spawnEmote(ball.x - 36, ball.y - 22, "happy", { depth: 1300 });
    this.tweens.add({
      targets: ball,
      scale: BALL_CATCH_SCALE,
      duration: this.motionMs(150),
      yoyo: true,
      repeat: 1,
      onUpdate: () => this.applyBallMotion()
    });
    const flashText = this.addBallLabel("찰칵!", "flash", {
      fontFamily: KOREAN_FONT,
      fontSize: "16px",
      color: "#ffd84d",
      fontStyle: "bold",
      stroke: "#3a2a18",
      strokeThickness: 4
    });
    const action = this.actionGen;
    this.time.delayedCall(this.motionMs(800), () => {
      if (flashText?.active) flashText.destroy();
      if (this.isAction(action)) this.revealCaughtAnimal(action);
    });
  }

  revealCaughtAnimal(action) {
    if (!this.isAction(action) || this.returningToOverworld) return;
    this.enemyAbsorbed = false;
    this.ballMotion = { kind: "reveal" };
    this.ballTrack = { t: 0 };
    this.enemyRoot.setVisible(true).setScale(0.12).setAngle(0);
    if (this.enemyVisualRoot) this.enemyVisualRoot.y = 0;
    if (this.prefersReducedMotion()) {
      this.ballTrack.t = 1;
      this.applyBallMotion();
      this.finishReveal(action);
      return;
    }
    this.tweens.add({
      targets: this.ballTrack,
      t: 1,
      duration: 420,
      ease: "Back.easeOut",
      onUpdate: () => {
        if (this.isAction(action)) this.applyBallMotion();
      },
      onComplete: () => {
        if (this.isAction(action)) this.finishReveal(action);
      }
    });
  }

  finishReveal(action) {
    if (!this.isAction(action) || this.returningToOverworld) return;
    this.clearCatchFx();
    this.restoreEnemyActor();
    this.phase = "result";
    this.busy = false;
    this.layoutStage();
    this.showCatchResult();
  }

  showCatchResult() {
    if (this.returningToOverworld) return;
    this.phase = "result";
    this.setPresentation("cinematic");
    this.beginView();
    this.appendChrome("배틀 승리!", { flee: false });
    const panel = this.appendCombatDock();
    const name = this.animal.name;
    const status = this.regionId ? regionStatus(this.regionId) : null;
    const extra = status && status.complete
      ? "\n이 지역 동물을 모두 만났어요! 맵으로 돌아가면 배지를 받아요!"
      : "";
    const card = createElement("div", "ui-card battle-catch-card");
    card.append(createElement("p", "battle-dock-title", name));
    this.mountCatchPhoto(card);
    card.append(createElement(
      "p",
      "battle-copy",
      `${name}${withParticle(name)} 친구가 되었어요! 도감에 등록!\n사는 곳: ${this.animal.habitat}${extra}`
    ));
    const actions = createElement("div", "ui-actions");
    const greet = this.button("인사하기", () => this.greetCaughtAnimal());
    greet.dataset.action = "greet";
    greet.dataset.name = "greet-animal";
    const dex = this.button("도감 보기", () => this.openDex(), { primary: true });
    dex.dataset.action = "open-dex";
    dex.dataset.name = "primary-action";
    const back = this.button("모험으로 돌아가기", () => this.returnToOverworld());
    back.dataset.action = "return";
    actions.append(greet, dex, back);
    card.append(actions);
    panel.append(card);
    this.syncBattleLayout();
    this.playPlayerCatchCelebration();
  }

  greetCaughtAnimal() {
    if (this.phase !== "result" || this.returningToOverworld || this.poseTweenLock) return;
    this.lockPose(360);
    this.spawnEmote(this.enemyRoot.x, this.enemyRoot.y - 76, "love", { depth: 1100 });
    this.replayPlayerCelebration();
    this.tweens.add({
      targets: this.enemyRoot,
      y: "-=8",
      duration: this.motionMs(160),
      yoyo: true,
      ease: "Sine.easeOut"
    });
  }

  openDex() {
    if (this.returningToOverworld) return;
    this.returningToOverworld = true;
    this.actionGen += 1;
    this.viewGen += 1;
    this.cancelObservationAdvance();
    this.stopPlayerCelebration();
    this.clearCatchFx();
    this.clearEmotes();
    this.ui?.destroy();
    this.ui = null;
    this.scene.start("DexScene", {
      from: "OverworldScene",
      returnPos: this.returnPos,
      highlightId: this.animal.id,
      regionId: this.regionId
    });
  }

  onRetreat() {
    this.phase = "failure";
    this.busy = false;
    this.setPresentation("cinematic");
    this.beginView();
    this.appendChrome("이번에는 놓쳤어요", { flee: false });
    const panel = this.appendCombatDock();
    const card = createElement("div", "ui-card");
    card.append(createElement(
      "p",
      "battle-copy",
      "괜찮아요. 잠깐 쉬고 다시 탐험해요!\n다음 탐험에서 다시 만날 수 있어요."
    ));
    const actions = createElement("div", "ui-actions");
    const back = this.button("탐험으로 돌아가기", () => this.returnToOverworld(), { primary: true });
    back.dataset.action = "return";
    back.dataset.name = "primary-action";
    actions.append(back);
    card.append(actions);
    panel.append(card);
    this.syncBattleLayout();
    this.playPlayerFailure();
  }

  returnToOverworld() {
    if (this.returningToOverworld) return;
    this.returningToOverworld = true;
    this.actionGen += 1;
    this.viewGen += 1;
    this.cancelObservationAdvance();
    this.stopPlayerCelebration();
    this.clearCatchFx();
    this.clearEmotes();
    this.ui?.destroy();
    this.ui = null;
    this.scene.start("OverworldScene", {
      returnPos: this.returnPos,
      avoidEncounterId: this.animal?.id || null
    });
  }
}
