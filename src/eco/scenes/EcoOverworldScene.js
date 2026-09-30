// 확장팩 오버월드 — 기본판 탐험에 '생태 돋보기'(교과서 1·2차시)를 더합니다.
// 지역마다 반짝이는 자리에 다가가 Space나 🔍 버튼으로 카드를 뒤집고,
// '생물 요소'와 '비생물 요소' 바구니 중 하나에 넣습니다. 틀리면 한 줄 이유를 보고 바로 다시 고릅니다.
import Phaser from "phaser/dist/phaser-arcade-physics.min.js";
import OverworldScene from "../../scenes/OverworldScene.js";
import { TILE } from "../../data/regions.js";
import { playEmote } from "../../ui/UiHelpers.js";
import { createButton, createElement, createScreen } from "../../ui/ScreenUi.js";
import { ECO_KINDS, ecoElements, ecoKindOf, ecoRegions } from "../data/ecosystem.js";
import { boardStatus, hasAnyFound, isFound, markFound } from "../systems/EcoStore.js";
import "../ui/eco-scan.css";

/** 플레이어 몸 중심에서 이 거리(px) 안이면 살펴볼 수 있습니다. */
const SCAN_REACH = 60;
const GLOW = 0xf4d35e;

export default class EcoOverworldScene extends OverworldScene {
  create() {
    this.ecoSpots = [];
    this.ecoNear = null;
    this.ecoCard = null;
    super.create();
    if (!this.player) return;
    this.createEcoSpots();
    if (!hasAnyFound()) {
      this.time.delayedCall(1400, () => {
        if (!this.ecoCard) this.hud?.showToast("반짝이는 곳에 다가가 🔍 살펴보세요!", 3200);
      });
    }
  }

  // ─── 살펴볼 자리 ────────────────────────────────────────

  createEcoSpots() {
    Object.entries(ecoRegions).forEach(([regionId, region]) => {
      region.spots.forEach((spot) => {
        const x = spot.tx * TILE;
        const y = spot.ty * TILE;
        if (spot.draw) this.drawEcoProp(spot.draw, x, y);
        const entry = { regionId, spot, x, y, marker: null };
        this.buildEcoMarker(entry);
        this.ecoSpots.push(entry);
      });
    });
  }

  /** 배경 그림에 없는 것(햇빛·바람·물웅덩이·미역)만 코드로 그립니다. */
  drawEcoProp(kind, x, y) {
    const g = this.add.graphics().setDepth(8);
    if (kind === "sunbeam") {
      g.fillStyle(0xfff2a8, 0.22);
      [-18, 0, 18].forEach((dx) => {
        g.fillTriangle(x + dx * 0.4 - 5, y - 44, x + dx * 0.4 + 5, y - 44, x + dx + 10, y + 14);
      });
      g.fillStyle(0xfff2a8, 0.9).fillCircle(x, y - 48, 9);
      g.fillStyle(GLOW, 1).fillCircle(x, y - 48, 6);
      this.tweens.add({ targets: g, alpha: 0.65, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    } else if (kind === "wind") {
      g.lineStyle(2, 0xf4ebc8, 0.9);
      [-10, 0, 10].forEach((dy, i) => {
        const curve = new Phaser.Curves.QuadraticBezier(
          new Phaser.Math.Vector2(x - 20 + i * 4, y + dy),
          new Phaser.Math.Vector2(x, y + dy - 7),
          new Phaser.Math.Vector2(x + 20 - i * 4, y + dy)
        );
        curve.draw(g);
      });
      this.tweens.add({ targets: g, x: 8, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    } else if (kind === "puddle") {
      g.fillStyle(0x5c536a, 0.25).fillEllipse(x, y + 2, 46, 18);
      g.fillStyle(0x7cc4d8, 0.95).fillEllipse(x, y, 42, 15);
      g.fillStyle(0xd8f1f5, 0.8).fillEllipse(x - 8, y - 2, 12, 3);
    } else if (kind === "seaweed") {
      g.lineStyle(4, 0x4f8f5b, 0.95);
      [-9, 0, 9].forEach((dx) => {
        g.beginPath();
        g.moveTo(x + dx, y + 12);
        g.lineTo(x + dx + 4, y + 2);
        g.lineTo(x + dx - 3, y - 8);
        g.lineTo(x + dx + 3, y - 18);
        g.strokePath();
      });
      this.tweens.add({ targets: g, x: 3, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
  }

  buildEcoMarker(entry) {
    entry.marker?.destroy();
    const found = isFound(entry.regionId, entry.spot.id);
    const parts = [];
    if (found) {
      parts.push(this.add.circle(0, 0, 8, 0xcbd784, 0.95).setStrokeStyle(1.5, 0x5c536a));
      parts.push(this.add.text(0, 0, "✓", {
        fontFamily: "sans-serif", fontSize: "11px", color: "#5c536a", fontStyle: "bold"
      }).setOrigin(0.5));
    } else {
      const ring = this.add.circle(0, 0, 10, GLOW, 0).setStrokeStyle(2, GLOW);
      const core = this.add.star(0, 0, 4, 3, 8, 0xfff7c9).setStrokeStyle(1, 0xc5a276);
      parts.push(ring, core);
      this.tweens.add({
        targets: ring, scale: 2, alpha: 0, duration: 1300, repeat: -1, ease: "Sine.easeOut",
        onRepeat: () => ring.setScale(1).setAlpha(1)
      });
      this.tweens.add({ targets: core, angle: 45, scale: 1.2, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      // 가까이 온 아이가 누를 수 있도록 넉넉한 누름 영역을 둡니다.
      const hit = this.add.circle(0, 0, 22, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => this.onEcoSpotTapped(entry));
      parts.push(hit);
    }
    entry.marker = this.add.container(entry.x, entry.y, parts)
      .setDepth(9)
      .setAlpha(found ? 0.75 : 1)
      .setName(`eco-spot-${entry.regionId}-${entry.spot.id}`);
  }

  distanceToEco(entry) {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y + 8, entry.x, entry.y);
  }

  onEcoSpotTapped(entry) {
    if (!this.canScan()) return;
    if (this.distanceToEco(entry) > SCAN_REACH * 1.6) {
      this.hud?.showToast("조금 더 가까이 가 보세요!", 1600);
      return;
    }
    this.openEcoCard(entry);
  }

  canScan() {
    return Boolean(this.player) && !this.ecoCard && !this.encounterLocked
      && !this._navigating && !this.celebrationRunning;
  }

  // ─── HUD ────────────────────────────────────────────────

  createHud() {
    super.createHud();
    const panel = this.hud.root.querySelector(".world-hud__panel");
    this.ecoBoardEl = createElement("p", "eco-hud__board");
    panel?.append(this.ecoBoardEl);

    this.ecoScanBtn = createButton("🔍 살펴보기", () => {
      this.ecoScanBtn.blur();
      if (this.ecoNear && this.canScan()) this.openEcoCard(this.ecoNear);
    }, { primary: true, className: "eco-hud__scan" });
    this.ecoScanBtn.hidden = true;
    ["pointerdown", "pointerup", "click"].forEach((type) => {
      this.ecoScanBtn.addEventListener(type, (event) => event.stopPropagation());
    });
    this.hud.root.append(this.ecoScanBtn);
    this.refreshHud();
  }

  refreshHud() {
    super.refreshHud();
    if (!this.ecoBoardEl) return;
    const region = ecoRegions[this.currentRegionId];
    const status = boardStatus(this.currentRegionId);
    this.ecoBoardEl.hidden = !region;
    if (region) {
      this.ecoBoardEl.textContent = `🔍 ${region.label} ${status.count}/${status.target}${status.complete ? " ★" : ""}`;
    }
  }

  setupInput() {
    super.setupInput();
    this.ecoKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  // ─── 매 프레임 ──────────────────────────────────────────

  tryEncounter(...args) {
    if (this.ecoCard) return;
    super.tryEncounter(...args);
  }

  update(time, delta) {
    if (this.ecoCard) {
      this.player?.setVelocity(0, 0);
      return;
    }
    super.update(time, delta);
    if (!this.player || !this.ecoSpots) return;

    let near = null;
    let best = SCAN_REACH;
    if (this.canScan()) {
      for (const entry of this.ecoSpots) {
        if (isFoundCached(entry)) continue;
        const d = this.distanceToEco(entry);
        if (d < best) {
          best = d;
          near = entry;
        }
      }
    }
    if (near !== this.ecoNear) {
      this.ecoNear?.marker?.setScale(1);
      near?.marker?.setScale(1.35);
      this.ecoNear = near;
      if (this.ecoScanBtn) this.ecoScanBtn.hidden = !near;
    }
    if (near && this.ecoKey && Phaser.Input.Keyboard.JustDown(this.ecoKey)) {
      this.openEcoCard(near);
    }
  }

  // ─── 카드와 바구니 ──────────────────────────────────────

  openEcoCard(entry) {
    if (!this.canScan()) return;
    const { regionId, spot } = entry;
    const element = ecoElements[spot.id];
    const answer = ecoKindOf(spot.id);
    if (!element || !answer) return;

    this.hud?.releasePad?.();
    this.player.setVelocity(0, 0);
    this.syncPlayerSurface(false);
    if (this.ecoScanBtn) this.ecoScanBtn.hidden = true;
    this.hud?.root.querySelector(".world-hud__toast")?.setAttribute("hidden", "");
    const firstTime = !hasAnyFound();

    const close = () => {
      if (!this.ecoCard) return;
      this.ecoCard.destroy();
      this.ecoCard = null;
      this.ecoNear = null;
      if (isFound(regionId, spot.id)) {
        entry.found = true;
        this.buildEcoMarker(entry);
        playEmote(this, this.player.x, this.player.y - 34, "happy", { depth: 60 });
      } else {
        entry.marker?.setScale(1);
      }
      this.refreshHud();
    };

    const screen = createScreen(this, { label: "생태 돋보기", className: "eco-scan", onEscape: close });
    screen.root.setAttribute("role", "dialog");
    screen.root.setAttribute("aria-modal", "true");
    this.ecoCard = screen;

    const panel = createElement("article", "ui-card eco-scan__panel");
    const kicker = createElement("p", "ui-kicker eco-scan__kicker", `생태 돋보기 · ${ecoRegions[regionId].label}`);

    const card = createElement("button", "eco-scan__card");
    card.type = "button";
    card.setAttribute("aria-label", "카드 뒤집기");
    const back = createElement("span", "eco-scan__back");
    back.append(createElement("span", "eco-scan__glass", "🔍"), createElement("span", "", "눌러서 문질러 보기"));
    const face = createElement("span", "eco-scan__face");
    face.append(
      createElement("span", "eco-scan__icon", element.icon),
      createElement("strong", "eco-scan__name", spot.id),
      createElement("span", "eco-scan__note", spot.note)
    );
    face.hidden = true;
    card.append(back, face);

    const prompt = createElement("p", "eco-scan__prompt", "어느 바구니에 넣을까요?");
    const feedback = createElement("p", "eco-scan__feedback");
    feedback.setAttribute("aria-live", "polite");
    const bins = createElement("div", "eco-scan__bins");
    const actions = createElement("div", "ui-actions eco-scan__actions");
    prompt.hidden = true;
    bins.hidden = true;

    const reveal = () => {
      if (!face.hidden) return;
      back.hidden = true;
      face.hidden = false;
      card.classList.add("is-open");
      card.setAttribute("aria-label", `${spot.id} 카드`);
      card.disabled = true;
      prompt.hidden = false;
      bins.hidden = false;
      bins.querySelector("button")?.focus({ preventScroll: true });
    };
    card.addEventListener("click", (event) => {
      event.stopPropagation();
      reveal();
    });

    const term = (label) => {
      const node = document.createElement("b");
      node.textContent = label;
      return node;
    };

    let solved = false;
    const pick = (kind, button) => {
      if (solved) return;
      if (kind !== answer) {
        feedback.className = "eco-scan__feedback is-wrong";
        feedback.replaceChildren(`${element.why} → `, term(ECO_KINDS[answer].label));
        card.classList.remove("is-wrong");
        void card.offsetWidth;
        card.classList.add("is-wrong");
        button.classList.add("is-miss");
        return;
      }
      solved = true;
      markFound(regionId, spot.id);
      const status = boardStatus(regionId);
      bins.querySelectorAll("button").forEach((b) => {
        b.setAttribute("aria-disabled", "true");
      });
      button.classList.add("is-hit");
      feedback.className = "eco-scan__feedback is-right";
      const lead = firstTime ? "처음 찾았어요! " : "맞았어요! ";
      feedback.replaceChildren(`${lead}${spot.id}${subjectParticle(spot.id)} `, term(ECO_KINDS[answer].label), "예요.");
      const board = createElement(
        "p",
        `eco-scan__board${status.complete ? " is-complete" : ""}`,
        status.complete
          ? `★ ${ecoRegions[regionId].label} 보드 완성! (${status.count}/${status.target})`
          : `${ecoRegions[regionId].label} 보드 ${status.count}/${status.target}`
      );
      feedback.after(board);
      const next = createButton("계속 탐험하기", close, { primary: true });
      actions.replaceChildren(next);
      next.focus({ preventScroll: true });
    };

    Object.entries(ECO_KINDS).forEach(([kind, info]) => {
      const bin = createButton("", () => pick(kind, bin), { className: `eco-scan__bin eco-scan__bin--${kind}` });
      bin.append(
        createElement("span", "eco-scan__basket", "🧺"),
        createElement("strong", "", info.label),
        createElement("span", "eco-scan__hint", info.hint)
      );
      bins.append(bin);
    });

    actions.append(createButton("나중에", close));
    panel.append(kicker, card, prompt, bins, feedback, actions);
    screen.root.append(panel);
    queueMicrotask(() => card.isConnected && card.focus({ preventScroll: true }));
  }
}

/** 매 프레임 localStorage를 읽지 않도록, 찾은 자리는 entry에 적어 둡니다. */
function isFoundCached(entry) {
  if (entry.found === undefined) entry.found = isFound(entry.regionId, entry.spot.id);
  return entry.found;
}

/** 받침 유무로 은/는을 고릅니다. */
function subjectParticle(word) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return "은(는)";
  return code % 28 ? "은" : "는";
}
