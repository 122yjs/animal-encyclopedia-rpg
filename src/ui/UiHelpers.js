// Phaser 이모트·한글 글꼴 헬퍼 — 읽기용 UI는 ScreenUi로 옮겼습니다
import Phaser from "phaser/dist/phaser-arcade-physics.min.js";

export const KOREAN_FONT = "Malgun Gothic, 'Segoe UI Emoji', Apple SD Gothic Neo, sans-serif";

const EMOTE_SIZE = 64;
const EMOTE_DISPLAY = 32;
const TEAL = "#987d6c";
const DEEP = "#5c536a";
const PAPER = "#f4ebc8";
const HONEY = "#cf9dab";

/** 옛 Teemo 시트와 같은 타이밍. 그림만 교체합니다. */
const EMOTE_SPECS = {
  surprise: { frames: 5, rate: 12, repeat: 0 },
  happy: { frames: 2, rate: 6, repeat: 2 },
  sad: { frames: 2, rate: 5, repeat: 2 },
  love: { frames: 2, rate: 6, repeat: 2 },
  angry: { frames: 2, rate: 6, repeat: 2 },
  zzz: { frames: 3, rate: 4, repeat: 1 }
};

function emoteKey(kind, index) {
  return `emote-native-${kind}-${index}`;
}

/** 이모트 도트맵 한 칸(=16칸 격자) — 정수 배로 찍어 각진 픽셀을 유지합니다. */
const EMOTE_GRID = 16;
const EMOTE_COLORS = { D: DEEP, P: PAPER, T: TEAL };

const BUBBLE_MAP = [
  "....DDDDDDDD....",
  "..DDPPPPPPPPDD..",
  ".DPPPPPPPPPPPPD.",
  ".DPPPPPPPPPPPPD.",
  ".DPPPPPPPPPPPPD.",
  ".DPPPPPPPPPPPPD.",
  ".DPPPPPPPPPPPPD.",
  ".DPPPPPPPPPPPPD.",
  ".DPPPPPPPPPPPPD.",
  ".DPPPPPPPPPPPPD.",
  ".DPPPPPPPPPPPPD.",
  "..DDPPPPPPPPDD..",
  "....DDPPPPD.....",
  ".....DPPPD......",
  ".....DDDD.......",
  "................",
];

const BANG_MAP = [
  "................",
  "................",
  "................",
  ".......TT.......",
  ".......TT.......",
  ".......TT.......",
  ".......TT.......",
  ".......TT.......",
  ".......TT.......",
  "................",
  ".......TT.......",
  "................",
  "................",
  "................",
  "................",
  "................",
];

const SMILE_MAP = [
  "................",
  "................",
  "................",
  "................",
  ".....TT..TT.....",
  ".....TT..TT.....",
  "................",
  "....T......T....",
  ".....T....T.....",
  "......TTTT......",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
];

const FROWN_MAP = [
  "................",
  "................",
  "................",
  "................",
  ".....TT..TT.....",
  ".....TT..TT.....",
  "................",
  "......TTTT......",
  ".....T....T.....",
  "....T......T....",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
];

const ANGRY_MAP = [
  "................",
  "................",
  ".....TT..TT.....",
  "......TTTT......",
  "................",
  ".....TT..TT.....",
  ".....TT..TT.....",
  "................",
  "......TTTT......",
  ".....T....T.....",
  "....T......T....",
  "................",
  "................",
  "................",
  "................",
  "................",
];

const ZEE_MAP = [
  "TTTTT",
  "...T.",
  "..T..",
  ".T...",
  "TTTTT",
];

/** 도트맵을 dot배 크기의 네모 픽셀로 찍습니다. */
function stampMap(ctx, map, colors, dot, offsetX = 0, offsetY = 0) {
  for (let row = 0; row < map.length; row += 1) {
    for (let col = 0; col < map[row].length; col += 1) {
      const color = colors[map[row][col]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(offsetX + col * dot, offsetY + row * dot, dot, dot);
    }
  }
}

function emoteDot(size) {
  return Math.max(1, Math.round(size / EMOTE_GRID));
}

function paintBubble(ctx, size) {
  stampMap(ctx, BUBBLE_MAP, EMOTE_COLORS, emoteDot(size));
}

function paintBang(ctx, size) {
  stampMap(ctx, BANG_MAP, EMOTE_COLORS, emoteDot(size));
}

function paintSmile(ctx, size, frown) {
  stampMap(ctx, frown ? FROWN_MAP : SMILE_MAP, EMOTE_COLORS, emoteDot(size));
}

function paintAngry(ctx, size) {
  stampMap(ctx, ANGRY_MAP, EMOTE_COLORS, emoteDot(size));
}

/** 하트는 원 두 개 + 삼각형을 픽셀 단위로 채우고, 테두리만 진하게 덧칠합니다. */
function paintHeart(ctx, size) {
  const dot = emoteDot(size);
  const mask = [];
  for (let y = 0; y < EMOTE_GRID; y += 1) {
    const row = [];
    for (let x = 0; x < EMOTE_GRID; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;
      const lobeL = (px - 5.3) ** 2 + (py - 4.7) ** 2 <= 3.05 ** 2;
      const lobeR = (px - 10.7) ** 2 + (py - 4.7) ** 2 <= 3.05 ** 2;
      const body = py >= 4.7 && Math.abs(px - 8) <= (13.6 - py) * 0.7;
      row.push(lobeL || lobeR || body);
    }
    mask.push(row);
  }
  for (let y = 0; y < EMOTE_GRID; y += 1) {
    for (let x = 0; x < EMOTE_GRID; x += 1) {
      if (!mask[y][x]) continue;
      const border = (mask[y - 1]?.[x] && mask[y + 1]?.[x] && mask[y][x - 1] && mask[y][x + 1]) !== true;
      ctx.fillStyle = border ? DEEP : HONEY;
      ctx.fillRect(x * dot, y * dot, dot, dot);
    }
  }
}

/** Z 한 글자 — x, y는 글자 중심입니다. */
function paintZee(ctx, x, y, dot) {
  const width = ZEE_MAP[0].length * dot;
  const height = ZEE_MAP.length * dot;
  stampMap(ctx, ZEE_MAP, EMOTE_COLORS, dot, Math.round(x - width / 2), Math.round(y - height / 2));
}

function paintZzz(ctx, size, index) {
  const dot = Math.max(1, Math.round(emoteDot(size) / 2));
  paintZee(ctx, 18, 46, dot);
  if (index >= 1) paintZee(ctx, 32, 30, dot);
  if (index >= 2) paintZee(ctx, 46, 14, dot + 1);
}

function paintEmote(ctx, kind, index, count) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, EMOTE_SIZE, EMOTE_SIZE);
  const t = count <= 1 ? 1 : index / Math.max(1, count - 1);
  const pop = kind === "surprise" ? 0.72 + 0.28 * t : (index % 2 === 0 ? 0.92 : 1);
  ctx.save();
  ctx.translate(EMOTE_SIZE / 2, EMOTE_SIZE / 2);
  ctx.scale(pop, pop);
  ctx.translate(-EMOTE_SIZE / 2, -EMOTE_SIZE / 2);
  if (kind === "love") paintHeart(ctx, EMOTE_SIZE);
  else if (kind === "zzz") paintZzz(ctx, EMOTE_SIZE, index);
  else {
    paintBubble(ctx, EMOTE_SIZE);
    if (kind === "surprise") paintBang(ctx, EMOTE_SIZE);
    else if (kind === "happy") paintSmile(ctx, EMOTE_SIZE, false);
    else if (kind === "sad") paintSmile(ctx, EMOTE_SIZE, true);
    else if (kind === "angry") paintAngry(ctx, EMOTE_SIZE);
  }
  ctx.restore();
}

function ensureEmoteFrames(scene, kind) {
  const resolved = EMOTE_SPECS[kind] ? kind : "surprise";
  const spec = EMOTE_SPECS[resolved];
  for (let i = 0; i < spec.frames; i += 1) {
    const key = emoteKey(resolved, i);
    if (scene.textures.exists(key)) continue;
    const canvas = scene.textures.createCanvas(key, EMOTE_SIZE, EMOTE_SIZE);
    paintEmote(canvas.getContext(), resolved, i, spec.frames);
    canvas.refresh();
    canvas.setFilter(1); // Phaser.Textures.FilterMode.NEAREST
  }
  return { spec, kind: resolved };
}

/** 머리 위 말풍선 이모트 — 잠깐 보여주고 사라집니다. */
export function playEmote(scene, x, y, kind = "surprise", { depth = 900, scale = 1, scrollFactor } = {}) {
  const prepared = ensureEmoteFrames(scene, kind);
  const animKey = `emote-${prepared.kind}`;

  if (!scene.anims.exists(animKey)) {
    scene.anims.create({
      key: animKey,
      frames: Array.from({ length: prepared.spec.frames }, (_, frame) => ({
        key: emoteKey(prepared.kind, frame)
      })),
      frameRate: prepared.spec.rate,
      repeat: prepared.spec.repeat
    });
  }

  const emote = scene.add.sprite(x, y, emoteKey(prepared.kind, 0))
    .setDepth(depth)
    .setDisplaySize(EMOTE_DISPLAY * scale, EMOTE_DISPLAY * scale);

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
