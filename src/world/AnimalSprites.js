// 생성형 픽셀 아틀라스 + 자체 제작 12×12 폴백 — 오버월드 동물 마커·도감 실루엣용
// 문자: . 투명 / O 외곽선 / B 몸통 / A 포인트 / W 밝은 부분 / E 눈

export const GENERATED_ANIMAL_ATLASES = Object.freeze([
  {
    key: "animal-atlas-around",
    path: "assets/generated/animals/around.png",
    frameWidth: 64,
    frameHeight: 64,
    animals: ["무당벌레", "꿀벌", "달팽이", "박새", "고양이", "개", "공벌레", "거미"]
  },
  {
    key: "animal-atlas-land",
    path: "assets/generated/animals/land.png",
    frameWidth: 64,
    frameHeight: 64,
    animals: ["나비", "참새", "딱따구리", "개미", "뱀", "토끼", "노루", "호랑이"]
  },
  {
    key: "animal-atlas-freshwater",
    path: "assets/generated/animals/freshwater.png",
    frameWidth: 64,
    frameHeight: 64,
    animals: ["왜가리", "청둥오리", "수달", "다슬기", "개구리", "붕어", "송사리", "메기"]
  },
  {
    key: "animal-atlas-sea",
    path: "assets/generated/animals/sea.png",
    frameWidth: 72,
    frameHeight: 48,
    animals: ["갈매기", "게", "조개", "소라", "돌고래", "바다거북", "돌돔", "해삼"]
  },
  {
    key: "animal-atlas-special",
    path: "assets/generated/animals/special.png",
    frameWidth: 64,
    frameHeight: 64,
    animals: ["낙타", "사막여우", "사막 뱀", "도루묵도마뱀", "북극곰", "북극여우", "펭귄", "산양"]
  }
]);

const GENERATED_FRAME_BY_ANIMAL = new Map(
  GENERATED_ANIMAL_ATLASES.flatMap((atlas) => atlas.animals.map((animalId, index) => [
    animalId,
    { atlas, firstFrame: index * 2 }
  ]))
);

export function preloadAnimalAtlases(scene) {
  GENERATED_ANIMAL_ATLASES.forEach((atlas) => {
    scene.load.spritesheet(atlas.key, atlas.path, {
      frameWidth: atlas.frameWidth,
      frameHeight: atlas.frameHeight
    });
  });
}

const SHAPES = {
  bird: [
    "............",
    "....OOO.....",
    "...OBEBO....",
    "..OBBBBO....",
    "..OBBBBBO...",
    "...OBBBBAO..",
    "...OBBBAO...",
    "....OBBO....",
    ".....OBO....",
    "....O..O....",
    "...OO..OO...",
    "............"
  ],
  butterfly: [
    "............",
    "..OO....OO..",
    ".OBBO..OBBO.",
    ".OBBBOOBBBO.",
    "..OBAOOABO..",
    "...OBAABO...",
    "...OBAABO...",
    "..OBAOOABO..",
    ".OBBBOOBBBO.",
    ".OBO....OBO.",
    "............",
    "............"
  ],
  bug: [
    "............",
    "...O....O...",
    "....O..O....",
    "....OOOO....",
    "...OBBBBO...",
    "..OBABBABO..",
    "..OBBAABBO..",
    "..OBABBABO..",
    "...OBBBBO...",
    "....OOOO....",
    "............",
    "............"
  ],
  snail: [
    "............",
    "............",
    ".....OOO....",
    "....OABBO...",
    "...OBABABO..",
    "...OBBAABO..",
    "..OBBABBO...",
    ".OBBBBBBBO..",
    ".OBBBBBBBBO.",
    "..OOOOOOOO..",
    "............",
    "............"
  ],
  quadSmall: [
    "............",
    "..OO...OO...",
    "..OBO..OBO..",
    "..OBBBBBBO..",
    "..OBEBBBBO..",
    "...OBBBBBOO.",
    "..OBBBBBBBAO",
    "..OBBBBBBO..",
    "...OBO.OBO..",
    "...OO...OO..",
    "............",
    "............"
  ],
  quadBig: [
    "............",
    "..OOO.......",
    "..OBBOOOOO..",
    "..OBBBBBBBO.",
    "...OBEBBBBBO",
    "...OBBBBBBO.",
    "...OBBBBBBO.",
    "...OBB..BBO.",
    "...OBB...BBO",
    "...OOO...OOO",
    "............",
    "............"
  ],
  snake: [
    "............",
    "..OOO.......",
    ".OBEBO......",
    ".OBBBO......",
    "..OBBO.OOO..",
    "...OBBOBBBO.",
    "....OBBBBAO.",
    ".....OOOOBO.",
    "........OBO.",
    "......OOBO..",
    "......OOO...",
    "............"
  ],
  lizard: [
    "............",
    "............",
    "..OOO.......",
    ".OBEBO......",
    "..OBBOOOO...",
    "...OBBBBBO..",
    "..OBBBBBBAO.",
    "...OBBBBO...",
    "..O.O..O.O..",
    "........OBO.",
    ".........O..",
    "............"
  ],
  fish: [
    "............",
    "............",
    "....OOOO....",
    "...OBEBBOO..",
    "..OBBBBBBAO.",
    "..OBBBBBBAO.",
    "...OBBBBOO..",
    "....OOOO....",
    "............",
    "............",
    "............",
    "............"
  ],
  frog: [
    "............",
    "...OO..OO...",
    "..OBEOOEBO..",
    "..OBBBBBBO..",
    "...OBBBBO...",
    "..OBBBBBBO..",
    ".OBBOBBOBBO.",
    ".OBO.OO.OBO.",
    "..O......O..",
    "............",
    "............",
    "............"
  ],
  crab: [
    "............",
    "..OO....OO..",
    ".OAAO..OAAO.",
    "..OO....OO..",
    "...OBBBBO...",
    "..OBEBBEBO..",
    "..OBBBBBBO..",
    "...OBBBBO...",
    "..O.O..O.O..",
    ".O..O..O..O.",
    "............",
    "............"
  ],
  shell: [
    "............",
    "............",
    "....OOOO....",
    "...OABBAO...",
    "..OBABABAO..",
    "..OABABABO..",
    ".OBBBBBBBBO.",
    "..OOOOOOOO..",
    "............",
    "............",
    "............",
    "............"
  ],
  blob: [
    "............",
    "............",
    "...OOOOO....",
    "..OBBBBBO...",
    ".OBEBBBBBO..",
    ".OBBBBBBBAO.",
    "..OBBBBBBO..",
    "...OOOOOO...",
    "............",
    "............",
    "............",
    "............"
  ],
  dolphin: [
    "............",
    "............",
    ".....OO.....",
    "....OBBO....",
    "...OOBBBO...",
    "..OBEBBBBOO.",
    ".OBBBBBBBBAO",
    "..OWWBBBOO..",
    "....OOOO....",
    "............",
    "............",
    "............"
  ],
  penguin: [
    "............",
    "....OOO.....",
    "...OBEBO....",
    "...OBBBO....",
    "..OBWWWBO...",
    "..OBWWWBO...",
    "..OBWWWBO...",
    "..OBWWWBO...",
    "...OWWWO....",
    "...OA.AO....",
    "....O.O.....",
    "............"
  ],
  turtle: [
    "............",
    "............",
    "....OOOO....",
    "...OABBAO...",
    "..OABABABO..",
    ".OOBBBBBBO..",
    "OBEOBBBBOO..",
    ".OO.OOOO....",
    "....O..O....",
    "............",
    "............",
    "............"
  ]
};

/** 동물별 스킨: 모양 + 색 (B 몸통, A 포인트, W 밝음) */
export const ANIMAL_SKINS = {
  // 우리 주변 마을
  "무당벌레": { shape: "bug", B: "#d84a3a", A: "#2d1b0e" },
  "꿀벌": { shape: "bug", B: "#e8c23a", A: "#2d1b0e" },
  "달팽이": { shape: "snail", B: "#c9985a", A: "#8a5a3a" },
  "박새": { shape: "bird", B: "#e8d84a", A: "#3a3a3a" },
  "고양이": { shape: "quadSmall", B: "#e8a86a", A: "#c9855a" },
  "개": { shape: "quadSmall", B: "#d9c9a8", A: "#b8a888" },
  "공벌레": { shape: "bug", B: "#8a8a9a", A: "#5a5a6a" },
  "거미": { shape: "bug", B: "#4a3a5a", A: "#2d2438" },
  // 땅 위 숲
  "나비": { shape: "butterfly", B: "#e8a838", A: "#d84a3a" },
  "참새": { shape: "bird", B: "#a8794a", A: "#6b4226" },
  "딱따구리": { shape: "bird", B: "#4a4a4a", A: "#d84a3a" },
  "개미": { shape: "bug", B: "#6b3a2a", A: "#4a2a1a" },
  "뱀": { shape: "snake", B: "#6a9a4a", A: "#4a7a3a" },
  "토끼": { shape: "quadSmall", B: "#e8e0d0", A: "#c9b8a8" },
  "노루": { shape: "quadBig", B: "#b8865a", A: "#8a5a3a" },
  "호랑이": { shape: "quadBig", B: "#e8973a", A: "#2d1b0e" },
  // 강과 호수
  "왜가리": { shape: "bird", B: "#ccd4dc", A: "#8a9aa8" },
  "청둥오리": { shape: "bird", B: "#4a7a5a", A: "#e8e0c0" },
  "수달": { shape: "quadSmall", B: "#8a5a3a", A: "#6b4226" },
  "다슬기": { shape: "snail", B: "#7a6a5a", A: "#4a3a2a" },
  "개구리": { shape: "frog", B: "#6aaa4a", A: "#4a8a3a" },
  "붕어": { shape: "fish", B: "#c9a04a", A: "#a8803a" },
  "송사리": { shape: "fish", B: "#b8c9d8", A: "#8aa8c0" },
  "메기": { shape: "fish", B: "#5a6a7a", A: "#3a4a5a" },
  // 바닷가
  "갈매기": { shape: "bird", B: "#eeeeee", A: "#e8a838" },
  "게": { shape: "crab", B: "#e86a4a", A: "#c94a2a" },
  "조개": { shape: "shell", B: "#d8c9b8", A: "#a89078" },
  "소라": { shape: "snail", B: "#c9906a", A: "#8a5a3a" },
  "돌고래": { shape: "dolphin", B: "#7a9ab8", A: "#5a7a98", W: "#d8e4ec" },
  "바다거북": { shape: "turtle", B: "#5a8a6a", A: "#8a6a4a" },
  "돌돔": { shape: "fish", B: "#b8bcc9", A: "#3a3a3a" },
  "해삼": { shape: "blob", B: "#4a3a2a", A: "#6b5a3a" },
  // 특별한 환경
  "낙타": { shape: "quadBig", B: "#d8b06a", A: "#b8905a" },
  "사막여우": { shape: "quadSmall", B: "#e8c99a", A: "#c9a87a" },
  "사막 뱀": { shape: "snake", B: "#d8b98a", A: "#b8905a" },
  "도루묵도마뱀": { shape: "lizard", B: "#d8c07a", A: "#b8a05a" },
  "북극곰": { shape: "quadBig", B: "#eef2f2", A: "#d4dce0" },
  "북극여우": { shape: "quadSmall", B: "#eef2f6", A: "#c9d4dc" },
  "펭귄": { shape: "penguin", B: "#2d3a4a", A: "#e8a838", W: "#eef2f6" },
  "산양": { shape: "quadBig", B: "#d8d0c0", A: "#b8b0a0" }
};

const DEFAULTS = {
  O: "#3a2a18",
  E: "#26180c",
  W: "#fff8e7"
};

function colorFor(ch, skin) {
  switch (ch) {
    case "O": return skin.O || DEFAULTS.O;
    case "B": return skin.B;
    case "A": return skin.A || skin.B;
    case "W": return skin.W || DEFAULTS.W;
    case "E": return skin.E || DEFAULTS.E;
    default: return null;
  }
}

function paintShape(ctx, shape, skin, size) {
  for (let y = 0; y < size; y += 1) {
    const row = shape[y] || "";
    for (let x = 0; x < size; x += 1) {
      const color = colorFor(row[x], skin);
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function paintGeneratedFrame(scene, canvas, animalId, pose) {
  const generated = GENERATED_FRAME_BY_ANIMAL.get(animalId);
  if (!generated || !scene.textures.exists(generated.atlas.key)) return false;
  const frame = scene.textures.getFrame(generated.atlas.key, generated.firstFrame + pose);
  if (!frame?.source?.image) return false;

  const size = 48;
  const padding = 2;
  const scale = Math.min((size - padding * 2) / frame.cutWidth, (size - padding * 2) / frame.cutHeight);
  const drawWidth = Math.round(frame.cutWidth * scale);
  const drawHeight = Math.round(frame.cutHeight * scale);
  const drawX = Math.round((size - drawWidth) / 2);
  const drawY = Math.round((size - drawHeight) / 2);
  const context = canvas.getContext();
  context.imageSmoothingEnabled = false;
  context.drawImage(
    frame.source.image,
    frame.cutX,
    frame.cutY,
    frame.cutWidth,
    frame.cutHeight,
    drawX,
    drawY,
    drawWidth,
    drawHeight
  );
  return true;
}

/** 동물 미니 스프라이트 텍스처를 (없으면) 만들고 key를 돌려줍니다 */
export function ensureAnimalTexture(scene, animalId, pose = 0) {
  const framePose = pose === 1 ? 1 : 0;
  const key = `mini-${animalId}-${framePose}`;
  if (scene.textures.exists(key)) return key;
  const skin = ANIMAL_SKINS[animalId];

  const atlasKey = GENERATED_FRAME_BY_ANIMAL.get(animalId)?.atlas.key;
  const generated = atlasKey && scene.textures.exists(atlasKey);
  const size = generated ? 48 : 12;
  const canvas = scene.textures.createCanvas(key, size, size);
  if (!paintGeneratedFrame(scene, canvas, animalId, framePose)) {
    if (!skin || !SHAPES[skin.shape]) {
      scene.textures.remove(key);
      return null;
    }
    paintShape(canvas.getContext(), SHAPES[skin.shape], skin, 12);
  }
  canvas.refresh();
  return key;
}

/** 오버월드 마커용 두 프레임 애니메이션 key */
export function ensureAnimalAnimation(scene, animalId) {
  const key = `animal-marker-${animalId}`;
  if (scene.anims.exists(key)) return key;
  const first = ensureAnimalTexture(scene, animalId, 0);
  const second = ensureAnimalTexture(scene, animalId, 1);
  if (!first || !second) return null;
  scene.anims.create({
    key,
    frames: [{ key: first }, { key: second }],
    frameRate: isFlying(animalId) ? 4 : 2,
    repeat: -1,
    yoyo: true
  });
  return key;
}

// ─── 도감볼 (포획용 볼) ─────────────────────────────────────

const BALL_SHAPE = [
  "....OOOO....",
  "..OOBBBBOO..",
  ".OBBBBBBBBO.",
  ".OBBBWBBBBO.",
  "OBBBBBBBBBBO",
  "OOOOOOOOOOOO",
  "OAAAAOOAAAAO",
  ".OAAAOOAAAO.",
  ".OAAAAAAAAO.",
  "..OOAAAAOO..",
  "....OOOO....",
  "............"
];

const BALL_SKIN = { B: "#e8973a", A: "#fff8e7", W: "#ffd98a", O: "#3a2a18" };

/** 도감볼 텍스처 key */
export function ensureBallTexture(scene) {
  const key = "dex-ball";
  if (scene.textures.exists(key)) return key;
  const size = 12;
  const canvas = scene.textures.createCanvas(key, size, size);
  paintShape(canvas.getContext(), BALL_SHAPE, BALL_SKIN, size);
  canvas.refresh();
  return key;
}

/** 하늘을 나는(둥실거리는) 동물인지 — 마커 연출 구분용 */
export function isFlying(animalId) {
  const skin = ANIMAL_SKINS[animalId];
  return skin ? ["bird", "butterfly"].includes(skin.shape) && animalId !== "펭귄" : false;
}
