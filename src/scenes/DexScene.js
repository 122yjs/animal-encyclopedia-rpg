// 도감 — 지역 탭 + 반응형 카드 그리드 (수집: 사진, 미수집: 실루엣/글)
import Phaser from "phaser/dist/phaser-arcade-physics.min.js";
import { regions, regionById } from "../data/regions.js";
import { animalById } from "../data/animals.js";
import { readCollected, regionStatus, masterStatus, hasBadge, badgeCount } from "../systems/ProgressStore.js";
import {
  createScreen,
  createElement,
  createButton,
  createCompletionBadge,
  createPhoto,
  disposePhotos
} from "../ui/ScreenUi.js";
import "../ui/dex-screen.css";

const FOREST_URL = new URL(`${import.meta.env.BASE_URL}assets/detailed-pixel/dex-forest.webp`, document.baseURI).href;

function originLabel(from) {
  if (from === "OverworldScene") return "탐험으로";
  if (from === "TitleScene") return "← 시작으로";
  return "월드맵";
}

export default class DexScene extends Phaser.Scene {
  constructor() {
    super("DexScene");
  }

  init(data = {}) {
    this._leaving = false;
    this.from = data.from || "TitleScene";
    this.returnPos = data.returnPos || null;
    this.highlightId = data.highlightId || null;
    this.regionId = data.regionId || this.findRegionOf(this.highlightId) || "around";
    if (!regionById[this.regionId]) this.regionId = "around";
    this.mapCurrentRegionId = data.currentRegionId || null;
    this.detailAnimalId = null;
    this.originCard = null;
    this.savedScroll = 0;
    this.ui = null;
  }

  findRegionOf(animalId) {
    if (!animalId) return null;
    const region = regions.find((r) => r.spawns.some((s) => s.id === animalId));
    return region?.id || null;
  }

  create() {
    this.cameras.main.setBackgroundColor("#accec1");
    this.ui = createScreen(this, {
      label: "동물 도감",
      className: "dex-screen",
      onEscape: () => this.onEscape()
    });
    this.ui.root.style.setProperty("--dex-forest", `url("${FOREST_URL}")`);
    this.buildChrome();
    this.renderRegion();
  }

  onEscape() {
    if (this.detailAnimalId) this.closeDetail();
    else this.goBack();
  }

  goBack() {
    if (this._leaving) return;
    this._leaving = true;
    this.ui?.destroy();
    this.ui = null;
    if (this.from === "OverworldScene") {
      this.scene.start("OverworldScene", { returnPos: this.returnPos });
    } else if (this.from === "TitleScene") {
      this.scene.start("TitleScene");
    } else {
      this.scene.start("WorldMapScene", {
        selectedRegionId: this.regionId,
        currentRegionId: this.mapCurrentRegionId || undefined
      });
    }
  }

  buildChrome() {
    const root = this.ui.root;
    const header = createElement("header", "ui-header dex-header");
    const heading = createElement("div", "dex-heading");
    heading.append(createElement("h1", "", "동물 도감"));
    this.progressEl = createElement("p", "ui-muted");
    this.masterReward = createElement("div", "ui-note");
    this.masterReward.append(
      createCompletionBadge({ master: true }),
      createElement("span", "", "도감 마스터")
    );
    heading.append(this.progressEl, this.masterReward);
    this.refreshProgress();
    const back = createButton(originLabel(this.from), () => this.goBack(), {
      primary: true,
      className: "dex-back"
    });
    back.id = "dex-back-button";
    back.dataset.name = "dex-back-button";
    const actions = createElement("div", "ui-actions");
    actions.append(back);
    header.append(heading, actions);

    this.tabs = createElement("nav", "ui-tabs dex-tabs");
    this.tabs.setAttribute("aria-label", "서식지");
    this.tabButtons = regions.map((region) => {
      const btn = createButton("", () => this.selectRegion(region.id), { className: "dex-tab" });
      btn.dataset.regionId = region.id;
      btn.type = "button";
      this.tabs.append(btn);
      return btn;
    });
    this.refreshTabs();

    this.listSection = createElement("section", "dex-list-section");
    this.listBody = createElement("div", "ui-body dex-list");
    this.introEl = createElement("p", "ui-note dex-intro");
    this.grid = createElement("div", "ui-grid");
    this.listBody.append(this.introEl, this.grid);
    this.listSection.append(this.listBody);

    this.detailSection = createElement("section", "ui-body dex-detail");
    this.detailSection.id = "dex-detail";
    this.detailSection.dataset.name = "dex-detail";
    this.detailSection.hidden = true;
    this.detailSection.inert = true;
    this.detailBody = createElement("div", "dex-detail-body");
    this.detailSection.append(this.detailBody);

    root.append(header, this.tabs, this.listSection, this.detailSection);
  }

  refreshProgress() {
    const master = masterStatus();
    const badges = badgeCount();
    const parts = [`전체 ${master.count} / ${master.target}`, `배지 ${badges} / ${regions.length}`];
    if (master.complete) parts.push("도감 마스터");
    this.progressEl.textContent = parts.join(" · ");
    this.masterReward.hidden = !hasBadge("master");
  }

  tabLabel(region) {
    const status = regionStatus(region.id);
    return `${region.short} ${status.count}/${status.target}`;
  }

  refreshTabs() {
    this.tabButtons.forEach((btn) => {
      const region = regionById[btn.dataset.regionId];
      const active = region.id === this.regionId;
      btn.replaceChildren(document.createTextNode(this.tabLabel(region)));
      if (hasBadge(region.id)) {
        btn.append(createCompletionBadge({ regionId: region.id }));
      }
      btn.classList.toggle("ui-button--primary", active);
      btn.setAttribute("aria-current", active ? "page" : "false");
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  selectRegion(regionId) {
    if (!regionById[regionId]) return;
    const same = this.regionId === regionId;
    if (same && !this.detailAnimalId) return;
    if (this.detailAnimalId) this.closeDetail({ restoreFocus: same });
    if (same) return;
    this.regionId = regionId;
    this.refreshTabs();
    this.renderRegion();
  }

  renderRegion() {
    const region = regionById[this.regionId];
    disposePhotos(this.grid);
    this.grid.replaceChildren();
    if (!region) {
      this.introEl.textContent = "";
      return;
    }
    this.introEl.textContent = `${region.name} — ${region.intro}`;
    const collected = new Set(readCollected());
    region.spawns.forEach((spawn) => {
      const animal = animalById[spawn.id];
      if (!animal) return;
      this.grid.append(this.buildCard(spawn, animal, collected.has(spawn.id)));
    });
    this.restoreHighlight();
  }

  buildCard(spawn, animal, got) {
    const card = createElement("article", `ui-card dex-card${got ? "" : " dex-card--locked"}`);
    card.id = `dex-card-${spawn.id}`;
    card.dataset.name = `dex-card-${spawn.id}`;
    card.dataset.animalId = spawn.id;
    if (this.highlightId === spawn.id) card.classList.add("dex-card--highlight");

    if (got) {
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `${animal.name} 자세히 보기`);
      const open = () => this.showDetail(spawn.id, card);
      card.addEventListener("click", (event) => {
        if (event.target.closest(".ui-button")) return;
        open();
      });
      card.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        open();
      });
      card.append(
        createPhoto(animal.image, animal.name, { fit: "cover" }),
        createElement("p", "dex-card-title", animal.name),
        createElement("p", "ui-muted", animal.habitat)
      );
    } else {
      const mark = createElement("div", "dex-silhouette", "?");
      mark.setAttribute("aria-hidden", "true");
      card.append(
        mark,
        createElement("p", "dex-card-title", "???"),
        createElement("p", "ui-muted", `${spawn.zone}에서 만나요`)
      );
      card.setAttribute("aria-label", `아직 만나지 않은 동물. ${spawn.zone}에서 만나요`);
    }
    return card;
  }

  restoreHighlight() {
    if (!this.highlightId) return;
    const card = this.grid.querySelector(`[data-animal-id="${CSS.escape(this.highlightId)}"]`);
    card?.scrollIntoView({ block: "nearest", inline: "nearest" });
    if (card && !card.classList.contains("dex-card--locked")) card.focus();
  }

  showDetail(animalId, originCard) {
    if (!readCollected().includes(animalId)) return;
    const animal = animalById[animalId];
    if (!animal) return;

    if (!this.detailAnimalId) {
      this.savedScroll = this.listSection.scrollTop;
      this.listSection.hidden = true;
      this.listSection.inert = true;
      this.detailSection.hidden = false;
      this.detailSection.inert = false;
    }

    this.detailAnimalId = animalId;
    this.originCard = originCard || this.grid.querySelector(`[data-animal-id="${CSS.escape(animalId)}"]`);
    disposePhotos(this.detailBody);
    this.detailBody.replaceChildren(this.buildDetail(animal, animalId));
    this.detailSection.querySelector("#dex-detail-close")?.focus();
  }

  buildDetail(animal, animalId) {
    const region = regions.find((item) => item.spawns.some((spawn) => spawn.id === animalId));
    const wrap = createElement("div");

    const close = createButton("목록으로", () => this.closeDetail(), {
      primary: true,
      className: "dex-detail-close"
    });
    close.id = "dex-detail-close";
    close.dataset.name = "dex-detail-close";
    const actions = createElement("div", "ui-actions dex-detail-actions");
    actions.append(close);

    const layout = createElement("div", "ui-two-column dex-detail-layout");
    const media = createElement("div", "dex-detail-media");
    media.append(createPhoto(animal.image, animal.name, { fit: "contain" }));
    media.append(createElement("p", "dex-status", "포획 완료"));

    const facts = createElement("div", "ui-card dex-facts");
    facts.append(
      createElement("h2", "dex-detail-title", animal.name),
      createElement("p", "ui-muted", `${region?.name || animal.habitat} · 교과서 ${animal.page}`)
    );
    facts.append(
      this.fact("사는 곳", animal.habitat),
      this.fact("움직임", animal.move),
      this.fact("생김새", animal.body.join(", ")),
      this.fact("관찰 포인트", animal.point),
      this.fact("환경과의 관계", animal.relation),
      this.fact("교과서", animal.page)
    );
    if (animal.source) {
      const credit = createElement("div", "dex-fact");
      credit.append(createElement("p", "ui-kicker", "출처"));
      const link = createElement("a", "dex-source", "위키백과에서 더 보기");
      link.href = animal.source;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      credit.append(link);
      facts.append(credit);
    }

    layout.append(media, facts);
    wrap.append(actions, layout);
    return wrap;
  }

  fact(label, value) {
    const row = createElement("div", "dex-fact");
    row.append(createElement("p", "ui-kicker", label), createElement("p", "dex-fact-body", value));
    return row;
  }

  closeDetail({ restoreFocus = true } = {}) {
    if (!this.detailAnimalId) return;
    disposePhotos(this.detailBody);
    this.detailBody.replaceChildren();
    this.detailSection.hidden = true;
    this.detailSection.inert = true;
    this.listSection.hidden = false;
    this.listSection.inert = false;
    this.listSection.scrollTop = this.savedScroll;
    const origin = this.originCard;
    this.originCard = null;
    this.detailAnimalId = null;
    if (restoreFocus && origin?.isConnected) origin.focus();
  }
}
