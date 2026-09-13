// Phaser UI 헬퍼 — Sprout Lands 나무 패널·버튼·하트·이모트
import Phaser from "phaser/dist/phaser-arcade-physics.min.js";

export const KOREAN_FONT = "Malgun Gothic, 'Segoe UI Emoji', Apple SD Gothic Neo, sans-serif";

/** 실제 렌더링 크기를 기준으로 텍스트를 지정한 영역 안에 맞춥니다. */
export function fitTextToBox(text, {
  width,
  height,
  fontSize = Number.parseFloat(text.style.fontSize) || 16,
  minFontSize = 9
}) {
  const smallest = Math.min(fontSize, minFontSize);
  text.setWordWrapWidth(width, true);
  text.setFontSize(fontSize);
  for (let size = fontSize; (text.width > width || text.height > height) && size > smallest;) {
    size -= 1;
    text.setFontSize(size);
  }
  return text;
}

/**
 * Sprout Lands 나무 패널 (dialog box 나인슬라이스).
 * 텍스처가 없으면 사각형으로 대체합니다.
 */
export function createWoodPanel(scene, x, y, width, height, { tint, alpha = 1 } = {}) {
  let panel;
  if (scene.textures.exists("ui-dialog")) {
    panel = scene.add.nineslice(x, y, "ui-dialog", 0, width, height, 14, 14, 14, 14);
    if (tint) panel.setTint(tint);
  } else {
    panel = scene.add.rectangle(x, y, width, height, 0xf0d9a0).setStrokeStyle(3, 0x6b4226);
  }
  panel.setAlpha(alpha);
  return panel;
}

/**
 * 나무 질감 버튼. 터치 친화(눌렀다 떼면 실행, 밖으로 나가면 취소).
 */
export function createWoodButton(scene, x, y, label, onClick, {
  width = 180,
  height = 40,
  fontSize = "15px",
  textColor = "#3d2410",
  tint = null,
  depth = 1001
} = {}) {
  const container = scene.add.container(x, y).setDepth(depth).setScrollFactor(0);
  const bg = createWoodPanel(scene, 0, 0, width, height, { tint });
  bg.setScrollFactor(0).setInteractive({ useHandCursor: true });

  const text = scene.add.text(0, 0, label, {
    fontFamily: KOREAN_FONT,
    fontSize,
    color: textColor,
    fontStyle: "bold",
    align: "center",
    wordWrap: { width: width - 20 }
  }).setOrigin(0.5);
  const fitLabel = () => fitTextToBox(text, {
    width: width - 20,
    height: height - 12,
    fontSize: Number.parseFloat(fontSize),
    minFontSize: 9
  });
  fitLabel();

  const setPressed = (value) => {
    container.setScale(value ? 0.96 : 1);
    if (bg.setTint) {
      if (value) bg.setTint(0xd9b98a);
      else if (tint) bg.setTint(tint);
      else bg.clearTint();
    }
  };

  bg.on("pointerdown", () => setPressed(true));
  bg.on("pointerout", () => setPressed(false));
  // 어린이 태블릿 배려: 누른 채 살짝 움직여도 버튼 위에서 떼면 실행
  bg.on("pointerup", () => {
    setPressed(false);
    if (typeof onClick === "function") onClick();
  });

  container.add([bg, text]);
  container.buttonBg = bg;
  container.buttonText = text;
  container.setText = (next) => {
    text.setText(next);
    fitLabel();
    return container;
  };
  container.setButtonEnabled = (enabled) => {
    if (enabled) {
      bg.setInteractive({ useHandCursor: true });
      container.setAlpha(1);
    } else {
      bg.disableInteractive();
      container.setAlpha(0.55);
    }
  };
  return container;
}

/** (구버전 호환) 단색 텍스트 버튼 — 새 코드는 createWoodButton을 쓰세요 */
export const createTextButton = (scene, x, y, label, onClick, opts = {}) =>
  createWoodButton(scene, x, y, label, onClick, opts);

/**
 * 하트 게이지 줄. set(n)으로 남은 하트 수를 반영합니다.
 * Sprout Lands 하트 시트: frame 0 = 가득, 5 = 빈 하트.
 */
export function createHeartRow(scene, x, y, max, {
  size = 26,
  gap = 4,
  tint = null,
  depth = 1002
} = {}) {
  const container = scene.add.container(x, y).setDepth(depth).setScrollFactor(0);
  const hearts = [];
  const hasSheet = scene.textures.exists("ui-hearts");

  for (let i = 0; i < max; i += 1) {
    const hx = i * (size + gap);
    let heart;
    if (hasSheet) {
      heart = scene.add.image(hx, 0, "ui-hearts", 0).setDisplaySize(size, size);
      if (tint) heart.setTint(tint);
    } else {
      heart = scene.add.text(hx, 0, "❤", { fontSize: `${size}px` }).setOrigin(0.5);
    }
    hearts.push(heart);
    container.add(heart);
  }

  let current = max;
  return {
    container,
    get value() {
      return current;
    },
    set(n, { animate = true } = {}) {
      const next = Phaser.Math.Clamp(n, 0, max);
      hearts.forEach((heart, i) => {
        const full = i < next;
        if (hasSheet) heart.setFrame(full ? 0 : 5);
        else heart.setText(full ? "❤" : "🖤");
        if (animate && !full && i === next && current > next) {
          scene.tweens.add({
            targets: heart,
            scale: { from: heart.scale * 1.6, to: heart.scale },
            duration: 260,
            ease: "Back.easeOut"
          });
        }
      });
      current = next;
    },
    destroy() {
      container.destroy(true);
    }
  };
}

/** 이모트 종류 → Teemo 이모트 시트 프레임 */
const EMOTE_FRAMES = {
  surprise: { frames: [10, 11, 12, 13, 14], rate: 12, repeat: 0 },
  happy: { frames: [35, 36], rate: 6, repeat: 2 },
  sad: { frames: [55, 56], rate: 5, repeat: 2 },
  love: { frames: [20, 21], rate: 6, repeat: 2 },
  angry: { frames: [45, 46], rate: 6, repeat: 2 },
  zzz: { frames: [65, 66, 67], rate: 4, repeat: 1 }
};

/** 머리 위 말풍선 이모트 — 잠깐 보여주고 사라집니다 */
export function playEmote(scene, x, y, kind = "surprise", { depth = 900, scale = 1, scrollFactor } = {}) {
  if (!scene.textures.exists("ui-emotes")) return null;
  const spec = EMOTE_FRAMES[kind] || EMOTE_FRAMES.surprise;
  const animKey = `emote-${kind}`;

  if (!scene.anims.exists(animKey)) {
    scene.anims.create({
      key: animKey,
      frames: spec.frames.map((frame) => ({ key: "ui-emotes", frame })),
      frameRate: spec.rate,
      repeat: spec.repeat
    });
  }

  const emote = scene.add.sprite(x, y, "ui-emotes", spec.frames[0])
    .setDepth(depth)
    .setScale(scale);
  if (scrollFactor !== undefined) emote.setScrollFactor(scrollFactor);

  emote.play(animKey);
  emote.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
    scene.tweens.add({
      targets: emote,
      alpha: 0,
      y: emote.y - 6,
      duration: 180,
      onComplete: () => emote.destroy()
    });
  });
  return emote;
}

/**
 * 화면 하단 내레이션 대화창 (Sprout Lands premade 다이얼로그).
 */
export function createDialogPanel(scene, {
  text = "",
  width = 560,
  height = 110,
  y,
  depth = 1000
} = {}) {
  const cam = scene.cameras.main;
  const panelY = y ?? cam.height - height / 2 - 12;
  const container = scene.add.container(cam.width / 2, panelY).setDepth(depth).setScrollFactor(0);

  const bg = createWoodPanel(scene, 0, 0, width, height);
  const label = scene.add.text(0, 0, text, {
    fontFamily: KOREAN_FONT,
    fontSize: "15px",
    color: "#3d2410",
    align: "center",
    lineSpacing: 4,
    wordWrap: { width: width - 40 }
  }).setOrigin(0.5);
  const fitLabel = () => fitTextToBox(label, {
    width: width - 40,
    height: height - 24,
    fontSize: 15,
    minFontSize: 10
  });
  fitLabel();

  container.add([bg, label]);

  return {
    panel: container,
    setText(next) {
      label.setText(next);
      fitLabel();
    },
    destroy() {
      container.destroy(true);
    }
  };
}

/**
 * 모바일용 가상 방향 패드 (왼쪽 하단)
 */
export function createVirtualPad(scene) {
  const cam = scene.cameras.main;
  const baseX = 84;
  const baseY = cam.height - 84;
  const keys = { up: false, down: false, left: false, right: false };

  const root = scene.add.container(baseX, baseY).setDepth(2000).setScrollFactor(0).setAlpha(0.82);

  const makeDir = (direction, dx, dy, label, ox, oy) => {
    const btn = scene.add.circle(ox, oy, 21, 0x3d2410, 0.72)
      .setStrokeStyle(2, 0xf0d9a0)
      .setScrollFactor(0)
      .setName(`virtual-pad-${direction}`)
      .setInteractive({ useHandCursor: true });
    const t = scene.add.text(ox, oy, label, {
      fontSize: "13px",
      color: "#fff8e7"
    }).setOrigin(0.5);
    const press = (v) => {
      if (dx < 0) keys.left = v;
      if (dx > 0) keys.right = v;
      if (dy < 0) keys.up = v;
      if (dy > 0) keys.down = v;
      btn.setFillStyle(v ? 0xe8a838 : 0x3d2410, v ? 0.95 : 0.72);
      t.setColor(v ? "#3d2410" : "#fff8e7");
    };
    btn.on("pointerdown", () => press(true));
    btn.on("pointerup", () => press(false));
    btn.on("pointerout", () => press(false));
    root.add([btn, t]);
  };

  makeDir("up", 0, -1, "▲", 0, -38);
  makeDir("down", 0, 1, "▼", 0, 38);
  makeDir("left", -1, 0, "◀", -38, 0);
  makeDir("right", 1, 0, "▶", 38, 0);

  return {
    getVector() {
      // 안전장치: 눌린 포인터가 하나도 없으면 고착된 패드 상태를 해제
      const anyPointerDown = scene.input.manager.pointers.some((p) => p.isDown);
      if (!anyPointerDown && (keys.left || keys.right || keys.up || keys.down)) {
        keys.left = keys.right = keys.up = keys.down = false;
      }
      let x = 0;
      let y = 0;
      if (keys.left) x -= 1;
      if (keys.right) x += 1;
      if (keys.up) y -= 1;
      if (keys.down) y += 1;
      return { x, y };
    },
    destroy() {
      root.destroy(true);
    }
  };
}
