import "./screen-ui.css";
import { regionById, regions } from "../data/regions.js";

export function createElement(tag, className = "", text = "") {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

export function createButton(label, onClick, { primary = false, disabled = false, className = "" } = {}) {
  const button = createElement("button", `ui-button${primary ? " ui-button--primary" : ""}${className ? ` ${className}` : ""}`, label);
  button.type = "button";
  button.disabled = disabled;
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!button.disabled && button.isConnected) onClick(event);
  });
  return button;
}

export function createCompletionBadge({ master = false, regionId } = {}) {
  const region = regionById[regionId];
  const badge = createElement("span", `completion-badge${master ? " completion-badge--master" : ""}`);
  const name = master ? "도감 마스터 왕관" : `${region?.name || "서식지"} 완성 배지`;
  badge.setAttribute("role", "img");
  badge.setAttribute("aria-label", name);
  badge.title = name;
  if (region) badge.dataset.regionId = region.id;
  const image = document.createElement("img");
  image.src = master ? "/assets/reward-master-crown.png" : "/assets/reward-badge-star.png";
  image.alt = "";
  image.draggable = false;
  badge.append(image);
  return badge;
}

export function showCompletionReward(scene, { regionId, master = false, nextRegionName = null, onContinue } = {}) {
  const region = regionById[regionId];
  let continued = false;
  let screen;
  function finish() {
    if (continued) return;
    continued = true;
    screen.destroy();
    onContinue?.();
  }
  screen = createScreen(scene, {
    label: master ? "도감 마스터 달성 보상" : `${region?.name || "서식지"} 완성 보상`,
    className: `completion-reward${master ? " completion-reward--master" : ""}`,
    onEscape: finish
  });
  screen.root.setAttribute("role", "dialog");
  screen.root.setAttribute("aria-modal", "true");

  const panel = createElement("article", "ui-card completion-reward__panel");
  const kicker = createElement("p", "ui-kicker completion-reward__kicker", master ? "모든 동물 수집 · 40/40" : "서식지 완성 · 8/8");
  const title = createElement("h1", "completion-reward__title", master ? "도감 마스터 달성!" : "완성 배지를 받았어요!");
  const celebration = createElement("div", "completion-reward__celebration");
  celebration.setAttribute("aria-hidden", "true");
  const particleCount = master ? 20 : 14;
  for (let index = 0; index < particleCount; index += 1) {
    const particle = createElement("span", `completion-reward__particle ${index % 3 ? "is-paper" : "is-star"}`);
    particle.style.setProperty("--reward-x", `${6 + (index * 29) % 88}%`);
    particle.style.setProperty("--reward-drift", `${(index % 5 - 2) * 18}px`);
    particle.style.setProperty("--reward-delay", `${(index % 6) * 45}ms`);
    particle.style.setProperty("--reward-turn", `${(index % 4) * 90}deg`);
    celebration.append(particle);
  }

  const hero = createElement("div", "completion-reward__hero");
  const mainBadge = createCompletionBadge({ master, regionId });
  mainBadge.classList.add("completion-badge--large");
  hero.append(mainBadge);
  if (master) {
    const badgeRow = createElement("div", "completion-reward__badge-row");
    regions.forEach((item) => badgeRow.append(createCompletionBadge({ regionId: item.id })));
    const character = createElement("span", "completion-reward__character");
    character.setAttribute("aria-hidden", "true");
    hero.append(badgeRow, character);
  }

  const name = createElement("p", "completion-reward__name", master ? "새 칭호: 도감 마스터" : region?.name || "서식지 완성");
  const summary = createElement(
    "p",
    "completion-reward__summary",
    master
      ? "다섯 서식지의 배지를 모아 도감 마스터 왕관을 얻었어요. 왕관과 칭호는 탐험 HUD와 도감에 계속 남아요."
      : nextRegionName
        ? `${region?.name || "이 서식지"}의 동물 8종을 모두 모았어요. ${nextRegionName}으로 가는 문이 열렸어요.`
        : `${region?.name || "이 서식지"}의 동물 8종을 모두 모았어요. 완성 배지가 도감에 계속 남아요.`
  );
  const actions = createElement("div", "ui-actions completion-reward__actions");
  const continueButton = createButton(master ? "왕관 받고 계속하기" : "배지 받고 계속하기", finish, { primary: true });
  actions.append(continueButton);
  panel.append(celebration, kicker, title, hero, name, summary, actions);
  screen.root.append(panel);
  queueMicrotask(() => continueButton.isConnected && continueButton.focus({ preventScroll: true }));
  return { destroy: screen.destroy };
}

export function disposePhotos(root) {
  root.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
  root.querySelectorAll("img").forEach((image) => {
    image.onload = null;
    image.onerror = null;
    image.removeAttribute("src");
  });
}

/** One scene owns one reading surface; detached scenes never retain DOM input. */
export function createScreen(scene, { label = "동물도감 탐험대", className = "", onEscape } = {}) {
  const root = createElement("section", `ui-screen ${className}`.trim());
  root.setAttribute("aria-label", label);
  root.tabIndex = -1;
  const previousFocus = document.activeElement;
  const previousInput = scene.input?.enabled;
  const previousKeyboard = scene.input?.keyboard?.enabled;
  if (scene.input) scene.input.enabled = false;
  if (scene.input?.keyboard) {
    scene.input.keyboard.resetKeys();
    scene.input.keyboard.enabled = false;
  }
  document.getElementById("ui-root").append(root);
  let destroyed = false;
  const onKeyDown = (event) => {
    event.stopPropagation();
    if (event.key === "Escape") {
      const dialog = event.target instanceof Element ? event.target.closest("dialog[open]") : null;
      if (dialog) {
        event.preventDefault();
        dialog.close();
        return;
      }
      if (onEscape) {
        event.preventDefault();
        onEscape();
      }
    }
    if (event.key !== "Tab") return;
    const focusScope = root.querySelector("dialog[open]") || root;
    const focusable = [...focusScope.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')]
      .filter((element) => element.getClientRects().length && !element.closest("[hidden], [inert]"));
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first) {
      event.preventDefault();
      root.focus();
    } else if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  };
  root.addEventListener("keydown", onKeyDown);
  const stopKeyUp = (event) => event.stopPropagation();
  root.addEventListener("keyup", stopKeyUp);
  root.focus({ preventScroll: true });
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    scene.events.off("shutdown", destroy);
    scene.events.off("destroy", destroy);
    disposePhotos(root);
    root.removeEventListener("keydown", onKeyDown);
    root.removeEventListener("keyup", stopKeyUp);
    root.remove();
    if (scene.input) scene.input.enabled = previousInput;
    if (scene.input?.keyboard) scene.input.keyboard.enabled = previousKeyboard;
    if (previousFocus?.isConnected && !document.querySelector(".ui-screen")) previousFocus.focus({ preventScroll: true });
  }
  scene.events.once("shutdown", destroy);
  scene.events.once("destroy", destroy);
  return { root, destroy };
}

/** Each figure owns its request and retry UI; no shared 'current animal' callback. */
export function createPhoto(src, alt, { fit = "contain", onState, expandable = false } = {}) {
  const figure = createElement("figure", `ui-photo${fit === "cover" ? " ui-photo--cover" : ""}${expandable ? " ui-photo--expandable" : ""}`);
  const image = document.createElement("img");
  image.alt = alt;
  image.decoding = "async";
  const status = createElement("div", "ui-photo__status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const message = createElement("p");
  const retry = createButton("사진 다시 불러오기", load);
  status.append(message, retry);
  figure.append(image, status);
  let expandButton = null;
  let dialog = null;
  let dialogImage = null;
  if (expandable) {
    expandButton = createElement("button", "ui-photo__expand");
    expandButton.type = "button";
    expandButton.hidden = true;
    expandButton.setAttribute("aria-label", `${alt} 크게 보기`);
    const expandIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    expandIcon.setAttribute("viewBox", "0 0 24 24");
    expandIcon.setAttribute("aria-hidden", "true");
    expandIcon.setAttribute("focusable", "false");
    expandIcon.innerHTML = '<circle cx="10" cy="10" r="6"/><path d="m14.5 14.5 5 5M10 7v6M7 10h6"/>';
    expandButton.append(expandIcon);
    dialog = createElement("dialog", "ui-photo-dialog");
    dialog.setAttribute("aria-label", `${alt} 확대`);
    const close = createButton("닫기", () => dialog.close(), { className: "ui-photo-dialog__close" });
    dialogImage = document.createElement("img");
    dialogImage.alt = `${alt} 크게 보기`;
    dialogImage.decoding = "async";
    dialog.append(close, dialogImage);
    expandButton.addEventListener("click", (event) => {
      event.stopPropagation();
      if (figure.dataset.state !== "loaded" || dialog.open) return;
      dialogImage.src = image.currentSrc || image.src;
      dialog.showModal();
      close.focus({ preventScroll: true });
    });
    dialog.addEventListener("close", () => {
      dialogImage.removeAttribute("src");
      if (expandButton.isConnected) expandButton.focus({ preventScroll: true });
    });
    figure.append(expandButton, dialog);
  }
  function setState(state) {
    figure.dataset.state = state;
    figure.setAttribute("aria-busy", String(state === "loading"));
    status.hidden = state === "loaded";
    image.hidden = state !== "loaded";
    if (expandButton) expandButton.hidden = state !== "loaded";
    retry.hidden = state !== "error" || !src;
    message.textContent = state === "loading" ? "사진을 불러오고 있어요." : src ? "사진을 불러오지 못했어요. 연결을 확인하고 다시 시도해 주세요." : "이 동물의 사진이 아직 없어요.";
    queueMicrotask(() => {
      if (figure.isConnected && figure.dataset.state === state) onState?.(state);
    });
  }
  function load() {
    if (!src) {
      setState("error");
      return;
    }
    setState("loading");
    image.onload = () => {
      if (!figure.isConnected) return;
      setState(image.naturalWidth > 0 ? "loaded" : "error");
    };
    image.onerror = () => {
      if (figure.isConnected) setState("error");
    };
    image.removeAttribute("src");
    image.src = src;
  }
  load();
  return figure;
}
