// 분류 게임 — 기준을 보고 동물 카드를 「그렇다 / 그렇지 않다」로 나누는 연습입니다.
// 레거시 도감(no-question.html)의 분류 연습을 ScreenUi 종이 카드 형식으로 옮겼습니다.
import Phaser from "phaser/dist/phaser-arcade-physics.min.js";
import { regions, regionById, animalEmoji } from "../data/regions.js";
import { animalById } from "../data/animals.js";
import { createScreen, createElement, createButton } from "../ui/ScreenUi.js";
import "../ui/sort-game-screen.css";
import forestArt from "../assets/detailed-pixel/dex-forest.webp?url";

export const SORT_CRITERIA = [
  { id: "hasLegs", label: "다리가 있는가?" },
  { id: "hasWings", label: "날개가 있는가?" },
  { id: "hasFins", label: "지느러미가 있는가?" },
  { id: "inWater", label: "물에서 사는가?" },
  { id: "crawls", label: "기어서 이동하는가?" }
];

const ROUND_HALF = 4;
const ZONES = ["pool", "yes", "no"];
const DRAG_THRESHOLD = 6;   // 이만큼 움직여야 끌기로 봅니다 (그보다 짧으면 누르기)
const EDGE_SCROLL = 72;     // 끌면서 화면 위·아래 가장자리에 닿으면 판을 스크롤합니다

function shuffle(list) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const pick = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[pick]] = [copy[pick], copy[index]];
  }
  return copy;
}

function poolFor(regionId) {
  const spawns = regionId === "all" ? regions.flatMap((region) => region.spawns) : regionById[regionId]?.spawns || [];
  return spawns.map((spawn) => animalById[spawn.id]).filter(Boolean);
}

function backLabel(from) {
  if (from === "WorldMapScene") return "월드맵";
  return "← 시작으로";
}

export default class SortGameScene extends Phaser.Scene {
  constructor() {
    super("SortGameScene");
  }

  init(data = {}) {
    this._leaving = false;
    this.from = data.from || "TitleScene";
    this.returnData = data.returnData || {};
    this.regionId = data.regionId && regionById[data.regionId] ? data.regionId : "all";
    this.criterionId = SORT_CRITERIA[0].id;
    this.round = [];
    this.placements = {};
    this.selectedId = null;
    this.checked = false;
    this.drag = null;
    this.suppressClick = false;
  }

  create() {
    this.cameras.main.setBackgroundColor("#accec1");
    this.ui = createScreen(this, {
      label: "분류 게임",
      className: "sort-screen",
      onEscape: () => this.onEscape()
    });
    this.ui.root.style.setProperty("--sort-forest", `url("${forestArt}")`);
    this.buildChrome();
    this.dealRound();
    this.events.once("shutdown", () => this.endDrag());
  }

  onEscape() {
    if (this.selectedId) {
      this.selectedId = null;
      this.renderBoard();
      return;
    }
    this.goBack();
  }

  goBack() {
    if (this._leaving) return;
    this._leaving = true;
    this.ui?.destroy();
    this.ui = null;
    this.scene.start(this.from === "WorldMapScene" ? "WorldMapScene" : "TitleScene", this.returnData);
  }

  get criterion() {
    return SORT_CRITERIA.find((item) => item.id === this.criterionId);
  }

  buildChrome() {
    const header = createElement("header", "ui-header sort-header");
    const heading = createElement("div", "sort-heading");
    heading.append(
      createElement("p", "ui-kicker", "분류 연습"),
      createElement("h1", "", "분류 게임"),
      createElement("p", "ui-muted", "기준을 보고 동물 카드를 두 무리로 나눠요. 채점하면 다시 살펴볼 동물을 알려 줘요.")
    );
    this.scoreEl = createElement("p", "sort-score");
    this.scoreEl.setAttribute("aria-live", "polite");
    const back = createButton(backLabel(this.from), () => this.goBack(), { primary: true, className: "sort-back" });
    back.id = "sort-back";
    const side = createElement("div", "ui-actions sort-header-side");
    side.append(this.scoreEl, back);
    header.append(heading, side);

    const controls = createElement("section", "ui-note sort-controls");
    controls.setAttribute("aria-label", "분류 게임 설정");
    this.criterionSelect = this.buildSelect("분류 기준", "sort-criterion",
      SORT_CRITERIA.map((item) => [item.id, item.label]), this.criterionId, (value) => {
        this.criterionId = value;
        this.dealRound();
      });
    this.regionSelect = this.buildSelect("동물 무리", "sort-region",
      [["all", "모든 서식지"], ...regions.map((region) => [region.id, region.name])], this.regionId, (value) => {
        this.regionId = value;
        this.dealRound();
      });
    const actions = createElement("div", "ui-actions sort-control-actions");
    const deal = createButton("새 카드 받기", () => this.dealRound());
    deal.id = "sort-new-round";
    const check = createButton("채점하기", () => this.check(), { primary: true });
    check.id = "sort-check";
    actions.append(deal, check);
    this.questionEl = createElement("p", "sort-question");
    this.questionEl.setAttribute("aria-live", "polite");
    controls.append(this.questionEl, this.criterionSelect.label, this.regionSelect.label, actions);

    this.board = createElement("section", "sort-board");
    this.board.setAttribute("aria-label", "분류 판");
    this.zones = {};
    this.zones.pool = this.buildZone("pool", "카드 더미", "카드를 눌러 고른 뒤 알맞은 칸을 누르거나 끌어다 놓아요. 더미로 돌릴 때도 이 칸을 눌러요.");
    this.zones.yes = this.buildZone("yes", "그렇다", "");
    this.zones.no = this.buildZone("no", "그렇지 않다", "");
    this.board.append(this.zones.pool.el, this.zones.yes.el, this.zones.no.el);

    this.feedback = createElement("p", "ui-card sort-feedback");
    this.feedback.setAttribute("role", "status");
    this.feedback.setAttribute("aria-live", "polite");
    this.feedback.hidden = true;

    const body = createElement("div", "ui-body sort-body");
    body.append(controls, this.board, this.feedback);
    this.ui.root.append(header, body);
  }

  buildSelect(text, id, options, value, onChange) {
    const label = createElement("label", "sort-select");
    label.htmlFor = id;
    const select = document.createElement("select");
    select.id = id;
    options.forEach(([optionValue, optionText]) => {
      const option = createElement("option", "", optionText);
      option.value = optionValue;
      select.append(option);
    });
    select.value = value;
    select.addEventListener("change", () => onChange(select.value));
    label.append(createElement("span", "ui-kicker", text), select);
    return { label, select };
  }

  buildZone(answer, title, help) {
    const el = createElement("div", `ui-card sort-zone sort-zone--${answer}`);
    el.dataset.answer = answer;
    el.tabIndex = -1;
    const head = createElement("div", "sort-zone-head");
    const mark = createElement("span", "sort-zone-mark", { pool: "?", yes: "O", no: "X" }[answer]);
    mark.setAttribute("aria-hidden", "true");
    const titleEl = createElement("h2", "sort-zone-title", title);
    const count = createElement("span", "sort-zone-count");
    const hint = createElement("p", "ui-muted sort-zone-hint", help);
    head.append(mark, titleEl, count, hint);
    const tokens = createElement("div", "sort-tokens");
    el.append(head, tokens);

    el.addEventListener("click", () => {
      if (this.selectedId) this.move(this.selectedId, answer);
    });
    return { el, tokens, hint, count };
  }

  dealRound() {
    const pool = poolFor(this.regionId);
    const key = this.criterionId;
    const yes = shuffle(pool.filter((animal) => animal[key])).slice(0, ROUND_HALF);
    const no = shuffle(pool.filter((animal) => !animal[key])).slice(0, ROUND_HALF);
    this.round = shuffle([...yes, ...no]).map((animal) => animal.id);
    this.placements = Object.fromEntries(this.round.map((id) => [id, "pool"]));
    this.selectedId = null;
    this.checked = false;
    this.setFeedback("");
    this.questionEl.textContent = this.criterion.label;
    const label = this.criterion.label.replace(/\?$/, "");
    this.zones.yes.hint.textContent = `${label} — 그렇다`;
    this.zones.no.hint.textContent = `${label} — 그렇지 않다`;
    this.renderBoard();
  }

  isCorrect(id) {
    const place = this.placements[id];
    const truth = Boolean(animalById[id]?.[this.criterionId]);
    return (truth && place === "yes") || (!truth && place === "no");
  }

  move(id, answer) {
    if (!ZONES.includes(answer) || !this.round.includes(id)) return;
    this.placements[id] = answer;
    this.selectedId = null;
    this.checked = false;
    this.setFeedback("");
    this.renderBoard(id);
  }

  renderBoard(focusId = null) {
    ZONES.forEach((answer) => {
      const zone = this.zones[answer];
      zone.tokens.replaceChildren();
      zone.el.classList.remove("is-correct", "needs-work");
      zone.el.classList.toggle("is-armed", Boolean(this.selectedId) && answer !== this.placements[this.selectedId]);
    });
    this.round.forEach((id) => {
      this.zones[this.placements[id] || "pool"].tokens.append(this.buildToken(id));
    });
    ZONES.forEach((answer) => {
      this.zones[answer].count.textContent = `${this.zones[answer].tokens.childElementCount}장`;
    });
    const emptyPool = !this.round.some((id) => this.placements[id] === "pool");
    this.zones.pool.el.classList.toggle("is-empty", emptyPool);
    this.updateScore();
    if (focusId) this.board.querySelector(`[data-animal-id="${CSS.escape(focusId)}"]`)?.focus({ preventScroll: true });
  }

  buildToken(id) {
    const animal = animalById[id];
    const place = this.placements[id];
    const token = createElement("button", "sort-token");
    token.type = "button";
    token.dataset.animalId = id;
    const selected = this.selectedId === id;
    token.classList.toggle("is-selected", selected);
    token.setAttribute("aria-pressed", String(selected));
    let state = "";
    if (this.checked && place !== "pool") {
      const correct = this.isCorrect(id);
      token.classList.add(correct ? "is-correct" : "is-wrong");
      state = correct ? ", 맞음" : ", 다시 보기";
    }
    token.setAttribute("aria-label", `${animal.name}${state}`);

    const art = createElement("span", "sort-token-art");
    art.setAttribute("aria-hidden", "true");
    const fallback = createElement("span", "sort-token-emoji", animalEmoji[id] || "🐾");
    if (animal.image) {
      const image = document.createElement("img");
      image.alt = "";
      image.decoding = "async";
      image.loading = "lazy";
      image.draggable = false;
      image.onerror = () => image.replaceWith(fallback);
      image.src = animal.image;
      art.append(image);
    } else {
      art.append(fallback);
    }
    token.append(art, createElement("span", "sort-token-name", animal.name));

    token.addEventListener("pointerdown", (event) => this.onTokenPointerDown(event, token, id));
    token.addEventListener("click", (event) => {
      event.stopPropagation();
      if (this.suppressClick) return;
      this.selectedId = selected ? null : id;
      this.renderBoard(id);
    });
    return token;
  }

  // 끌어서 놓기 — 마우스·터치·펜을 모두 포인터 이벤트 하나로 처리합니다.
  // 짧게 누르면 기존의 「눌러 고르기」가 그대로 동작하고, 임계값 이상 움직이면 카드 복제본이 손가락을 따라갑니다.
  onTokenPointerDown(event, token, id) {
    if (!event.isPrimary || event.button !== 0 || this.drag) return;
    this.drag = {
      id,
      token,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      ghost: null,
      zone: null,
      frame: 0
    };
    token.setPointerCapture?.(event.pointerId);
    token.addEventListener("pointermove", this.onDragMove);
    token.addEventListener("pointerup", this.onDragEnd);
    token.addEventListener("pointercancel", this.onDragCancel);
  }

  onDragMove = (event) => {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (!drag.ghost) {
      if (Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < DRAG_THRESHOLD) return;
      this.startGhost(drag);
    }
    event.preventDefault();
    this.placeGhost(drag);
  };

  onDragEnd = (event) => {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dragged = Boolean(drag.ghost);
    const answer = drag.zone?.dataset.answer;
    this.endDrag();
    if (!dragged) return;
    // 끌기 뒤에 따라오는 click이 「고르기」로 바뀌지 않게 이번 한 번만 막습니다.
    this.suppressClick = true;
    setTimeout(() => { this.suppressClick = false; }, 0);
    if (answer && answer !== this.placements[drag.id]) this.move(drag.id, answer);
    else this.renderBoard(drag.id);
  };

  onDragCancel = (event) => {
    if (this.drag && event.pointerId === this.drag.pointerId) {
      const wasDragging = Boolean(this.drag.ghost);
      this.endDrag();
      if (wasDragging) this.renderBoard();
    }
  };

  startGhost(drag) {
    const rect = drag.token.getBoundingClientRect();
    drag.offsetX = drag.startX - rect.left;
    drag.offsetY = drag.startY - rect.top;
    const ghost = drag.token.cloneNode(true);
    ghost.classList.remove("is-selected");
    ghost.classList.add("sort-ghost");
    ghost.removeAttribute("id");
    ghost.setAttribute("aria-hidden", "true");
    ghost.tabIndex = -1;
    ghost.style.width = `${rect.width}px`;
    this.ui.root.append(ghost);
    drag.ghost = ghost;
    drag.token.classList.add("is-dragging");
    this.selectedId = null;
    Object.values(this.zones).forEach((zone) => zone.el.classList.remove("is-armed"));
    this.ui.root.classList.add("is-dragging");
    const scroll = () => {
      if (!this.drag?.ghost) return;
      const { y } = this.drag;
      const height = window.innerHeight;
      const speed = y < EDGE_SCROLL ? -(EDGE_SCROLL - y) : y > height - EDGE_SCROLL ? EDGE_SCROLL - (height - y) : 0;
      if (speed) {
        this.ui.root.scrollTop += Math.round(speed / 6);
        this.updateDropZone(this.drag);
      }
      this.drag.frame = requestAnimationFrame(scroll);
    };
    drag.frame = requestAnimationFrame(scroll);
  }

  placeGhost(drag) {
    drag.ghost.style.translate = `${drag.x - drag.offsetX}px ${drag.y - drag.offsetY}px`;
    this.updateDropZone(drag);
  }

  updateDropZone(drag) {
    const zone = document.elementFromPoint(drag.x, drag.y)?.closest(".sort-zone") || null;
    if (zone === drag.zone) return;
    drag.zone?.classList.remove("is-drop-target");
    drag.zone = zone;
    zone?.classList.add("is-drop-target");
  }

  endDrag() {
    const drag = this.drag;
    if (!drag) return;
    this.drag = null;
    cancelAnimationFrame(drag.frame);
    drag.token.removeEventListener("pointermove", this.onDragMove);
    drag.token.removeEventListener("pointerup", this.onDragEnd);
    drag.token.removeEventListener("pointercancel", this.onDragCancel);
    if (drag.token.hasPointerCapture?.(drag.pointerId)) drag.token.releasePointerCapture(drag.pointerId);
    drag.token.classList.remove("is-dragging");
    drag.zone?.classList.remove("is-drop-target");
    drag.ghost?.remove();
    this.ui?.root.classList.remove("is-dragging");
  }

  updateScore(correctCount) {
    const placed = this.round.filter((id) => this.placements[id] !== "pool").length;
    const value = typeof correctCount === "number" ? correctCount : placed;
    const noun = typeof correctCount === "number" ? "맞힘" : "옮김";
    this.scoreEl.textContent = `${value} / ${this.round.length} ${noun}`;
  }

  setFeedback(text, tone = "") {
    this.feedback.textContent = text;
    this.feedback.hidden = !text;
    this.feedback.dataset.tone = tone;
    if (text) this.feedback.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  check() {
    this.checked = true;
    this.selectedId = null;
    const placed = this.round.filter((id) => this.placements[id] !== "pool");
    const correct = placed.filter((id) => this.isCorrect(id));
    this.renderBoard();
    ["yes", "no"].forEach((answer) => {
      const wrong = this.round.some((id) => this.placements[id] === answer && !this.isCorrect(id));
      const filled = this.round.some((id) => this.placements[id] === answer);
      if (filled) this.zones[answer].el.classList.add(wrong ? "needs-work" : "is-correct");
    });
    this.updateScore(correct.length);

    const left = this.round.length - placed.length;
    if (left > 0) {
      this.setFeedback(`아직 ${left}장을 옮겨야 해요. 모든 카드를 두 무리 중 하나에 넣어 봐요.`, "warn");
      return;
    }
    if (correct.length === this.round.length) {
      this.setFeedback(`모두 맞았어요! "${this.criterion.label}" 기준으로 겹치거나 빠진 동물 없이 분류했어요.`, "good");
      return;
    }
    const wrongNames = this.round.filter((id) => !this.isCorrect(id)).map((id) => animalById[id].name);
    this.setFeedback(
      `${correct.length}장을 맞혔어요. 빨간 테두리 카드(${wrongNames.join(", ")})의 몸과 이동 방법을 다시 떠올리고 옮겨 봐요.`,
      "warn"
    );
  }
}
