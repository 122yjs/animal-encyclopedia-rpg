// 타이틀 — 고밀도 픽셀아트 공원에서 모험을 시작합니다.
// 픽셀 그림은 캔버스에, 읽기용 글자·버튼은 ScreenUi DOM에 그립니다.
import Phaser from "phaser/dist/phaser-arcade-physics.min.js";
import { createScreen, createElement, createButton } from "../ui/ScreenUi.js";
import { masterStatus, badgeCount } from "../systems/ProgressStore.js";
import "../ui/title-screen.css";

const TILE = 16;                              // Sprout Lands 원본 타일 크기
const FADE_MS = 220;

/** 픽셀이 뭉개지지 않도록 정수 배율만 씁니다 (작은 화면 2배 · 큰 화면 3배). */
function pixelScale(width, height) {
  return Math.min(width, height) >= 560 ? 3 : 2;
}

/** 격자에 맞춰 잘라 픽셀 경계를 지킵니다. */
function snap(value, cell, limit) {
  return Math.max(0, Math.min(limit - cell, Math.round(value / cell) * cell));
}

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  create() {
    this._starting = false;
    this.cameras.main.setBackgroundColor(0x9dae7c);

    this.backdrop = this.add.image(0, 0, "title-park");
    this.actors = this.createActors();

    this.createDom();
    this.layout();

    this.scale.on("resize", this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off("resize", this.layout, this));
  }


  createActors() {
    const actors = {};
    if (this.textures.exists("npc-chicken")) {
      actors.chicken = this.add.sprite(0, 0, "npc-chicken").setOrigin(0.5, 1);
      if (this.anims.exists("chicken-idle")) actors.chicken.play("chicken-idle");
    }
    if (this.textures.exists("npc-cow")) {
      actors.cow = this.add.sprite(0, 0, "npc-cow").setOrigin(0.5, 1);
      if (this.anims.exists("cow-idle")) actors.cow.play("cow-idle");
    }
    actors.hero = this.add.sprite(0, 0, "player", 0).setOrigin(0.5, 1);
    if (this.anims.exists("idle-down")) actors.hero.play("idle-down");
    return actors;
  }

  /** 창이 바뀌면 배경을 덮어 맞추고 캐릭터 위치를 조정합니다. */
  layout() {
    const { width, height } = this.scale.gameSize;
    const scale = pixelScale(width, height);
    const cell = TILE * scale;

    this.backdrop.setPosition(width / 2, height / 2).setScale(
      Math.max(width / this.backdrop.width, height / this.backdrop.height)
    );

    const place = (actor, fx, fy) => {
      if (!actor) return;
      actor.setScale(scale).setPosition(snap(fx * width, cell, width), snap(fy * height, cell, height));
    };
    place(this.actors.chicken, 0.18, 0.9);
    place(this.actors.cow, 0.84, 0.89);
    const compactLandscape = width > height && height <= 560;
    place(this.actors.hero, compactLandscape ? 0.15 : 0.5, compactLandscape ? 0.72 : 0.87);
  }

  createDom() {
    const master = masterStatus();
    const hasSave = master.count > 0;

    this.ui = createScreen(this, { label: "동물도감 탐험대 시작 화면", className: "title-screen" });
    this.ui.root.id = "title-screen";
    this.ui.root.dataset.scene = "TitleScene";

    const heading = createElement("header", "title-heading");
    heading.append(
      createElement("p", "title-kicker", "수집형 턴제 RPG · 다섯 서식지 대모험"),
      createElement("h1", "title-name", "동물도감 탐험대"),
      createElement("p", "title-sub", "월드맵에서 지역을 고르고 동물을 만나 관찰 퀴즈에 도전해요")
    );

    const actions = createElement("div", "title-actions");
    this.startButton = createButton(
      hasSave ? `▶ 이어서 모험 (도감 ${master.count}/${master.target} · 배지 ${badgeCount()})` : "▶ 모험 시작!",
      () => this.startGame(),
      { primary: true, className: "title-start" }
    );
    this.startButton.id = "title-start";
    this.startButton.dataset.action = "start-game";
    this.dexButton = createButton("도감 보기", () => this.openDex(), { className: "title-dex" });
    this.dexButton.id = "title-dex";
    this.dexButton.dataset.action = "open-dex";
    this.sortButton = createButton("분류 게임", () => this.openSortGame(), { className: "title-sort" });
    this.sortButton.id = "title-sort";
    this.sortButton.dataset.action = "open-sort-game";
    actions.append(this.startButton, this.dexButton, this.sortButton);

    const footer = createElement("footer", "title-footer");
    footer.append(
      createElement("p", "title-hint", "방향키·WASD·화면 스틱으로 이동\nEnter 또는 Space로 시작"),
      createElement("p", "title-credits", "Assets: Sprout Lands by Cup Nooble (비상업 교육용)")
    );

    this.ui.root.append(heading, actions, footer);

    // 버튼에 초점이 있으면 브라우저 기본 활성화에 맡기고, 그 밖에서는 Enter/Space로 시작합니다.
    this.onKeyDown = (event) => {
      if (event.key !== "Enter" && event.key !== " " && event.key !== "Spacebar") return;
      if (event.target?.closest?.("button")) return;
      event.preventDefault();
      this.startGame();
    };
    this.ui.root.addEventListener("keydown", this.onKeyDown);
  }

  startGame() {
    if (this._starting) return;
    this._starting = true;
    this.startButton.disabled = true;
    this.dexButton.disabled = true;
    this.sortButton.disabled = true;
    this.ui.root.classList.add("is-leaving");
    this.cameras.main.fadeOut(FADE_MS, 24, 16, 8);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start("WorldMapScene");
    });
  }

  openDex() {
    if (this._starting) return;
    this.scene.start("DexScene", { from: "TitleScene" });
  }

  openSortGame() {
    if (this._starting) return;
    this.scene.start("SortGameScene", { from: "TitleScene" });
  }
}
