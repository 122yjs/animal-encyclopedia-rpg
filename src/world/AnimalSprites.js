/**
 * 동물 미니 스프라이트와 도감볼 — 생성형 픽셀 아트 아틀라스를 그대로 잘라 쓰는 모듈.
 *
 * 원작(170068d)이 쓰던 아틀라스 5장(around·land·freshwater·special 64×64, sea 72×48
 * 프레임)이 동물 그림의 원본입니다. 아틀라스 안 동물 순서는 행 우선이고, i번째 동물의
 * 두 포즈는 프레임 2i(포즈 0)·2i+1(포즈 1)입니다. 한 동물당 48×96 캔버스 텍스처 한 장에
 * 두 포즈를 48×48 프레임 '0'·'1'로 옮겨 담아 오버월드 마커가 통통 튀게 합니다.
 *
 * 아틀라스의 자홍 배경은 이미 알파 0으로 처리돼 있지만, 실루엣 테두리에는 배경 키가
 * 섞인 안티에일리어싱 픽셀이 알파 255로 남아 있습니다(동물당 100~250px). 배경 위에
 * 그대로 얹으면 자홍 테두리가 보이므로 옮겨 담은 뒤 한 번 더 지웁니다.
 * 모든 텍스처는 NEAREST 필터라 어떤 크기로 늘려도 각진 픽셀이 유지됩니다.
 */

/** 미니 스프라이트 한 칸 크기(px) — 아틀라스 프레임을 비율 유지해 담습니다 */
const MINI_SIZE = 48;
/** 프레임을 담을 때 사방으로 남기는 여백(px) */
const MINI_PADDING = 2;
/** 도감볼 텍스처 key / 크기(px) */
const BALL_KEY = "dex-ball";
const BALL_SIZE = 64;
/**
 * 도감볼 잉크(외곽선) 반지름 — 64×64 텍스처 안에서 볼이 실제로 그려진 반지름입니다.
 * 바닥에 닿는 지점을 계산하는 쪽(QuizBattleScene)이 이 값을 scale과 곱해 씁니다.
 */
export const BALL_RADIUS = 28;

/** Phaser.Textures.FilterMode.NEAREST */
const NEAREST = 1;

/**
 * 배경 키 판정 여유 — 빨강·파랑이 초록보다 이만큼 크면 키가 섞인 픽셀로 봅니다.
 * 키 자체의 차이는 200이 넘고 테두리 블렌드는 30~200 사이라, 그림을 건드리지
 * 않으면서 프린지만 걸러내는 값입니다.
 */
const KEY_MARGIN = 24;

/** 미니 텍스처에 담는 포즈 — 문자열 프레임 '0'·'1'의 순서입니다 */
const POSES = [0, 1];

/**
 * 동물 아틀라스 — key·path·프레임 크기와 그 안의 동물 순서(행 우선).
 * 순서를 바꾸면 그림이 뒤바뀌므로 원작 순서를 그대로 유지합니다.
 */
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

/**
 * 각 동물 원본 0번 포즈가 바라보는 방향.
 * 전투에서는 동물이 화면 오른쪽에 서므로 right인 그림만 뒤집어 플레이어 쪽(왼쪽)을 봅니다.
 */
export const ANIMAL_SOURCE_FACING = Object.freeze({
  // 우리 주변 마을
  "무당벌레": "left",
  "꿀벌": "left",
  "달팽이": "left",
  "박새": "left",
  "고양이": "front",
  "개": "left",
  "공벌레": "left",
  "거미": "left",
  // 땅 위 숲
  "나비": "front",
  "참새": "right",
  "딱따구리": "right",
  "개미": "right",
  "뱀": "right",
  "토끼": "right",
  "노루": "right",
  "호랑이": "right",
  // 강과 호수
  "왜가리": "left",
  "청둥오리": "left",
  "수달": "left",
  "다슬기": "left",
  "개구리": "left",
  "붕어": "left",
  "송사리": "left",
  "메기": "left",
  // 바닷가
  "갈매기": "left",
  "게": "front",
  "조개": "front",
  "소라": "left",
  "돌고래": "left",
  "바다거북": "left",
  "돌돔": "left",
  "해삼": "front",
  // 특별한 환경
  "낙타": "right",
  "사막여우": "right",
  "사막 뱀": "right",
  "도루묵도마뱀": "right",
  "북극곰": "right",
  "북극여우": "right",
  "펭귄": "right",
  "산양": "right"
});

/** 화면 오른쪽의 전투 상대가 플레이어 쪽을 보려면 뒤집어야 하는지 */
export function shouldFlipAnimalTowardLeft(animalId) {
  return ANIMAL_SOURCE_FACING[animalId] === "right";
}

const ATLAS_FRAME_BY_ANIMAL = new Map(
  GENERATED_ANIMAL_ATLASES.flatMap((atlas) =>
    atlas.animals.map((animalId, index) => [animalId, { atlas, firstFrame: index * 2 }])
  )
);

/**
 * 하늘을 나는(둥실거리는) 동물 — 마커가 뜬 자세로 더 빠르게 깜빡입니다.
 * 원작 스킨 분류의 새·나비 계열에서 땅에 사는 펭귄을 뺀 목록입니다.
 */
const FLYING_ANIMALS = new Set(["박새", "나비", "참새", "딱따구리", "왜가리", "청둥오리", "갈매기"]);

/** 부팅 때 동물 아틀라스를 로드 큐에 넣습니다. */
export function preloadAnimalAtlases(scene) {
  GENERATED_ANIMAL_ATLASES.forEach((atlas) => {
    scene.load.spritesheet(atlas.key, atlas.path, {
      frameWidth: atlas.frameWidth,
      frameHeight: atlas.frameHeight
    });
  });
}
/** 아틀라스 로드 뒤, 도감·전투가 프레임을 조회하기 전에 한 번 만듭니다. */
export function createAnimalTextures(scene) {
  for (const animalId of ATLAS_FRAME_BY_ANIMAL.keys()) ensureAnimalTexture(scene, animalId);
}

/**
 * 생성 배경에 쓰인 자홍 키가 섞인 픽셀인지 — 키(자홍)는 초록이 가장 낮은 색이라,
 * 빨강·파랑이 초록보다 함께 높으면 배경 키가 섞인 픽셀입니다. 아틀라스 내부의
 * 동물 그림에는 이 조건을 넘는 픽셀이 사실상 없어(아틀라스당 한 자리 수) 테두리
 * 프린지만 지웁니다.
 */
function isKeyPixel(red, green, blue) {
  return red - green > KEY_MARGIN && blue - green > KEY_MARGIN;
}

/**
 * 캔버스 테두리에 남은 자홍 키 픽셀을 정리합니다.
 * 투명 픽셀은 RGB까지 비워 어떤 필터로 샘플링해도 자홍이 새지 않게 하고,
 * 알파가 남은 키 블렌드 픽셀은 옆의 정상 픽셀 색을 옮겨 칠해 자홍을 없앱니다.
 * (지워 버리면 다리·더듬이 같은 1px 살이 끊기므로 색만 바꿉니다.)
 */
function cleanKeyFringe(ctx, width, height) {
  const image = ctx.getImageData(0, 0, width, height);
  const { data } = image;
  const keyed = new Uint8Array(width * height);
  const pending = new Uint8Array(width * height);
  let dirty = false;

  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    if (data[i + 3] === 0) {
      if (data[i] !== 0 || data[i + 1] !== 0 || data[i + 2] !== 0) {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        dirty = true;
      }
    } else if (isKeyPixel(data[i], data[i + 1], data[i + 2])) {
      keyed[p] = 1;
      pending[p] = 1;
    }
  }

  // 정상 픽셀 색을 최대 3px까지 안쪽으로 전파해 테두리 프린지를 덮습니다.
  for (let pass = 0; pass < 3; pass += 1) {
    let changed = false;
    for (let p = 0; p < pending.length; p += 1) {
      if (!pending[p]) continue;
      const x = p % width;
      const y = (p - x) / width;
      for (let ny = Math.max(0, y - 1); ny <= Math.min(height - 1, y + 1); ny += 1) {
        for (let nx = Math.max(0, x - 1); nx <= Math.min(width - 1, x + 1); nx += 1) {
          const q = ny * width + nx;
          const j = q * 4;
          if (pending[q] || data[j + 3] === 0) continue;
          data[p * 4] = data[j];
          data[p * 4 + 1] = data[j + 1];
          data[p * 4 + 2] = data[j + 2];
          pending[p] = 0;
          nx = width;
          ny = height;
        }
      }
      if (!pending[p]) {
        changed = true;
        dirty = true;
      }
    }
    if (!changed) break;
  }

  // 그림에 닿지 못한 키 픽셀은 배경 잔여물이라 지웁니다. 색을 옮겨 칠한 픽셀도
  // 상하좌우 어디에도 그림이 없으면 떨어진 점으로 남으므로 함께 지웁니다.
  for (let p = 0; p < pending.length; p += 1) {
    if (!keyed[p]) continue;
    const x = p % width;
    const y = (p - x) / width;
    const attached = pending[p] === 0 && (
      (x > 0 && data[(p - 1) * 4 + 3] > 0) ||
      (x < width - 1 && data[(p + 1) * 4 + 3] > 0) ||
      (y > 0 && data[(p - width) * 4 + 3] > 0) ||
      (y < height - 1 && data[(p + width) * 4 + 3] > 0)
    );
    if (attached) continue;
    data[p * 4] = 0;
    data[p * 4 + 1] = 0;
    data[p * 4 + 2] = 0;
    data[p * 4 + 3] = 0;
    dirty = true;
  }

  if (dirty) ctx.putImageData(image, 0, 0);
}

/** 아틀라스 프레임 하나를 48×48 칸 안에 비율 그대로 담습니다. */
function drawAtlasFrame(ctx, image, frame, cellTop) {
  const span = MINI_SIZE - MINI_PADDING * 2;
  const scale = Math.min(span / frame.cutWidth, span / frame.cutHeight);
  const width = Math.max(1, Math.round(frame.cutWidth * scale));
  const height = Math.max(1, Math.round(frame.cutHeight * scale));
  const x = Math.round((MINI_SIZE - width) / 2);
  const y = cellTop + Math.round((MINI_SIZE - height) / 2);
  ctx.drawImage(
    image,
    frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight,
    x, y, width, height
  );
}

/** 동물 미니 텍스처(두 포즈)를 (없으면) 만들고 key를 돌려줍니다 */
function ensureAnimalTexture(scene, animalId) {
  const entry = ATLAS_FRAME_BY_ANIMAL.get(animalId);
  if (!entry) return null;

  const key = `mini-${animalId}`;
  if (scene.textures.exists(key)) return key;

  const atlas = scene.textures.get(entry.atlas.key);
  const image = atlas ? atlas.getSourceImage() : null;
  const frames = atlas ? POSES.map((pose) => atlas.get(entry.firstFrame + pose)) : [];
  if (!image || frames.length !== POSES.length || frames.some((frame) => !frame)) return null;

  const canvas = scene.textures.createCanvas(key, MINI_SIZE, MINI_SIZE * POSES.length);
  if (!canvas) return null;

  const ctx = canvas.getContext();
  ctx.imageSmoothingEnabled = false;
  frames.forEach((frame, index) => drawAtlasFrame(ctx, image, frame, index * MINI_SIZE));
  cleanKeyFringe(ctx, MINI_SIZE, MINI_SIZE * POSES.length);
  frames.forEach((frame, index) => canvas.add(String(index), 0, 0, index * MINI_SIZE, MINI_SIZE, MINI_SIZE));
  canvas.refresh();
  canvas.setFilter(NEAREST);
  return key;
}

/**
 * 동물 그림 위치 — { key, frame }.
 * 아틀라스에 없는 id는 null(다른 동물로 대신 채우지 않습니다).
 */
export function getAnimalFrame(animalId, pose = 0) {
  if (!ATLAS_FRAME_BY_ANIMAL.has(animalId)) return null;
  return { key: `mini-${animalId}`, frame: pose === 1 ? "1" : "0" };
}

/** 오버월드 마커용 두 프레임 애니메이션 key */
export function ensureAnimalAnimation(scene, animalId) {
  if (!ATLAS_FRAME_BY_ANIMAL.has(animalId)) return null;

  const key = `animal-marker-${animalId}`;
  if (scene.anims.exists(key)) return key;

  const textureKey = ensureAnimalTexture(scene, animalId);
  if (!textureKey) return null;

  scene.anims.create({
    key,
    frames: [{ key: textureKey, frame: "0" }, { key: textureKey, frame: "1" }],
    frameRate: isFlying(animalId) ? 4 : 2,
    repeat: -1,
    yoyo: true
  });
  return key;
}

/** 하늘을 나는(둥실거리는) 동물인지 — 마커 연출 구분용 */
export function isFlying(animalId) {
  return FLYING_ANIMALS.has(animalId);
}

// ─── 도감볼 (포획용 볼) ─────────────────────────────────────

const BALL_INK = "#3a2a18";
const BALL_TOP = "#e8973a";
const BALL_BOTTOM = "#fff8e7";
const BALL_SHINE = "#ffd98a";

function paintBall(ctx) {
  const c = (BALL_SIZE - 1) / 2;
  const radius = BALL_RADIUS;
  const shell = radius - 1.7;
  const highlight = { x: -9.5, y: -11.5 };
  const shine = 6.4;
  for (let y = 0; y < BALL_SIZE; y += 1) {
    for (let x = 0; x < BALL_SIZE; x += 1) {
      const dx = x - c;
      const dy = y - c;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) continue;

      let color = BALL_INK;
      if (dist <= shell) {
        color = dy < -1 ? BALL_TOP : BALL_BOTTOM;
        if (Math.sqrt((dx - highlight.x) ** 2 + (dy - highlight.y) ** 2) <= shine) color = BALL_SHINE;
        if (dy >= -1 && dy < 2.4) color = BALL_INK;
        if (dist <= 8.6) color = dist <= 5.6 ? BALL_SHINE : BALL_INK;
      }

      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

/** 도감볼 텍스처 key */
export function ensureBallTexture(scene) {
  if (scene.textures.exists(BALL_KEY)) return BALL_KEY;
  const canvas = scene.textures.createCanvas(BALL_KEY, BALL_SIZE, BALL_SIZE);
  if (!canvas) return BALL_KEY;
  paintBall(canvas.getContext());
  canvas.refresh();
  canvas.setFilter(NEAREST);
  return BALL_KEY;
}
