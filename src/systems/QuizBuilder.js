// 레거시 buildQuestions 계열을 Phaser용으로 이식한 퀴즈 빌더
// (사는 곳 / 움직임 / 특징 3문항 — 보기·정답·힌트키는 원본과 동일)
import { animals } from "../data/animals.js";
import { subjectParticle, topicParticle } from "./ObservationBuilder.js";

/** 배열 순서를 섞습니다 (퀴즈 보기 섞기용) */
function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

export function buildQuestions(animal) {
  const moveKey = getMovementKey(animal);
  const finalQuestion = customQuizByAnimal[animal.id] || (
    animal.categories.includes("special")
      ? buildSpecialEnvironmentQuestion(animal)
      : buildDistinctiveFeatureQuestion(animal)
  );

  return [
    {
      text: `${animal.name}${subjectParticle(animal.name)} 주로 사는 곳으로 가장 알맞은 곳은 어디일까요?`,
      correct: animal.habitat,
      hintKey: "habitat",
      options: makeHabitatOptions(animal)
    },
    {
      text: `${animal.name}${topicParticle(animal.name)} 어떻게 이동할까요?`,
      correct: movementOptionLabels[moveKey],
      hintKey: "lifestyle",
      options: makeMovementOptions(moveKey)
    },
    finalQuestion
  ];
}

const customQuizByAnimal = {
  "거미": {
    text: "거미를 다른 주변 동물과 구별하기 쉬운 특징은 무엇일까요?",
    correct: "여덟 개의 다리와 거미줄이 있어요.",
    hintKey: "appearance",
    options: shuffle([
      "여덟 개의 다리와 거미줄이 있어요.",
      "지느러미와 아가미로 물속을 헤엄쳐요.",
      "큰 날개로 꽃 사이를 날아다녀요."
    ])
  },
  "개": {
    text: "개가 우리 주변에서 걷고 뛰며 생활하는 데 알맞은 특징은 무엇일까요?",
    correct: "네 다리와 발, 냄새를 잘 맡는 코가 있어요.",
    hintKey: "appearance",
    options: shuffle([
      "네 다리와 발, 냄새를 잘 맡는 코가 있어요.",
      "껍데기와 넓은 발로 바위에 붙어 있어요.",
      "작은 지느러미로 바다를 천천히 헤엄쳐요."
    ])
  },
  "게": {
    text: "게가 갯벌과 바닷가에서 생활하기에 알맞은 특징은 무엇일까요?",
    correct: "집게와 단단한 껍질이 있고 옆으로 걸어요.",
    hintKey: "adaptation",
    options: shuffle([
      "집게와 단단한 껍질이 있고 옆으로 걸어요.",
      "긴 귀와 뒷다리로 풀밭에서 뛰어요.",
      "날개와 깃털로 숲 사이를 날아요."
    ])
  },
  "개구리": {
    text: "개구리가 물가와 물속에서 생활하기에 알맞은 특징은 무엇일까요?",
    correct: "물갈퀴가 있는 발은 물속 이동에 도움을 줘요.",
    hintKey: "adaptation",
    options: shuffle([
      "물갈퀴가 있는 발은 물속 이동에 도움을 줘요.",
      "단단한 껍데기와 넓은 발로 바위에 붙어 있어요.",
      "날개와 깃털로 숲 사이를 날아다녀요."
    ])
  },
  "소금쟁이": {
    text: "소금쟁이가 물 위를 다니는 데 도움을 주는 특징은 무엇일까요?",
    correct: "가늘고 긴 다리로 물 표면 위에서 몸을 지탱해요.",
    hintKey: "adaptation",
    options: shuffle([
      "가늘고 긴 다리로 물 표면 위에서 몸을 지탱해요.",
      "혹 속 영양분으로 사막에서 오래 지내요.",
      "두꺼운 털과 피부로 추위를 견뎌요."
    ])
  },
  "펭귄": {
    text: "펭귄이 추운 곳과 물속 생활에 알맞은 까닭은 무엇일까요?",
    correct: "빽빽한 깃털과 날개 모양 지느러미가 도움을 줘요.",
    hintKey: "adaptation",
    options: shuffle([
      "빽빽한 깃털과 날개 모양 지느러미가 도움을 줘요.",
      "거미줄을 쳐서 벽과 풀숲에서 먹이를 잡아요.",
      "넓은 앞발로 땅속에 굴을 파요."
    ])
  }
};

function makeHabitatOptions(animal) {
  const correct = animal.habitat;
  return shuffle([correct, ...getHabitatDistractors(animal, correct).slice(0, 2)]);
}

function getHabitatDistractors(animal, correct) {
  const normalized = correct.replace(/\s/g, "");
  let candidates;

  if (correct.includes("사막")) {
    candidates = ["강이나 호수", "극지방", "숲의 나무", "집 주변, 마을"];
  } else if (correct.includes("극지방") || correct.includes("남극")) {
    candidates = ["사막", "갯벌과 바닷가", "풀밭, 꽃밭", "땅속"];
  } else if (correct.includes("바다") || correct.includes("갯벌")) {
    candidates = ["사막", "숲의 나무", "집 주변, 마을", "땅속"];
  } else if (animal.inWater) {
    candidates = ["사막", "숲의 나무", "집 주변, 마을", "극지방"];
  } else if (correct.includes("땅속")) {
    candidates = ["바다", "꽃이 핀 곳", "극지방", "갯벌과 바닷가"];
  } else if (correct.includes("물가")) {
    candidates = ["사막", "극지방", "숲의 나무", "집 주변, 마을"];
  } else {
    candidates = ["바다", "사막", "극지방", "갯벌과 바닷가", "강이나 호수"];
  }

  return candidates.filter(option => option.replace(/\s/g, "") !== normalized);
}

const movementOptionLabels = {
  crawlNoLegs: "다리 없이 몸을 굽혀 기어 이동해요.",
  crawlWithLegs: "다리를 써서 바닥을 기어 이동해요.",
  walkRun: "다리로 걷거나 뛰어 이동해요.",
  fly: "날개로 날아 이동해요.",
  swimFins: "지느러미를 써서 물속을 헤엄쳐요.",
  swimLegs: "물갈퀴나 다리를 써서 물속을 헤엄쳐요.",
  flyAndSwim: "날개로 날고 물에서도 헤엄쳐요."
};

const movementDistractors = {
  crawlNoLegs: ["fly", "swimFins", "walkRun", "swimLegs"],
  crawlWithLegs: ["fly", "swimFins", "walkRun", "crawlNoLegs"],
  walkRun: ["fly", "swimFins", "crawlNoLegs", "flyAndSwim"],
  fly: ["walkRun", "swimFins", "crawlNoLegs", "swimLegs"],
  swimFins: ["walkRun", "fly", "crawlNoLegs", "swimLegs"],
  swimLegs: ["walkRun", "fly", "crawlNoLegs", "swimFins"],
  flyAndSwim: ["fly", "swimFins", "walkRun", "crawlNoLegs"]
};

function getMovementKey(animal) {
  const move = animal.move || "";
  if (move.includes("날") && move.includes("헤엄")) return "flyAndSwim";
  if (move.includes("헤엄")) return animal.hasFins ? "swimFins" : "swimLegs";
  if (move.includes("날")) return "fly";
  if (move.includes("기어")) return animal.hasLegs ? "crawlWithLegs" : "crawlNoLegs";
  if (move.includes("걷") || move.includes("걸") || move.includes("뛰")) return "walkRun";
  if (animal.hasFins) return "swimFins";
  if (animal.hasWings && animal.inWater) return "flyAndSwim";
  if (animal.hasWings) return "fly";
  if (animal.crawls) return animal.hasLegs ? "crawlWithLegs" : "crawlNoLegs";
  if (animal.inWater) return "swimLegs";
  return "walkRun";
}

function makeMovementOptions(correctKey) {
  return shuffle([
    movementOptionLabels[correctKey],
    ...shuffle(movementDistractors[correctKey]).slice(0, 2).map(key => movementOptionLabels[key])
  ]);
}

const specialEnvironmentQuiz = {
  "낙타": "혹과 두꺼운 발바닥이 건조한 사막 생활에 도움을 줘요.",
  "도루묵도마뱀": "뜨거운 낮에는 모래 속에서 지내며 더위를 피할 수 있어요.",
  "사막여우": "큰 귀와 털 많은 발바닥이 더운 사막 생활에 도움을 줘요.",
  "사막 뱀": "모래색 몸과 옆으로 기는 움직임이 사막 생활에 알맞아요.",
  "사막 딱정벌레": "단단한 몸과 등의 돌기가 건조한 사막 생활에 도움을 줘요.",
  "북극곰": "두꺼운 털과 피부가 극지방의 추위를 견디는 데 도움을 줘요.",
  "북극여우": "작은 귀와 두꺼운 털이 몸의 열을 지키는 데 도움을 줘요.",
  "펭귄": "빽빽한 깃털과 날개 모양 지느러미가 추위와 물속 생활에 도움을 줘요.",
  "산양": "발굽과 다리가 가파른 바위에서 균형을 잡는 데 도움을 줘요."
};

const specialEnvironmentDistractors = [
  "얇은 날개로 꽃 사이를 날아다니는 데 알맞아요.",
  "아가미와 지느러미가 물속에서 헤엄치는 데 알맞아요.",
  "끈끈한 발로 축축한 그늘을 천천히 기어 다니는 데 알맞아요.",
  "거미줄을 쳐서 작은 먹이를 잡는 데 알맞아요.",
  "긴 더듬이로 땅 위의 길을 찾는 데 알맞아요."
];

function buildSpecialEnvironmentQuestion(animal) {
  const correct = specialEnvironmentQuiz[animal.id] || animal.relation;
  return {
    text: `${animal.name}${topicParticle(animal.name)} ${animal.habitat}에서 살아가기에 알맞은 특징은 무엇일까요?`,
    correct,
    hintKey: "adaptation",
    options: makeSpecialEnvironmentOptions(correct)
  };
}

function makeSpecialEnvironmentOptions(correct) {
  return shuffle([
    correct,
    ...shuffle(specialEnvironmentDistractors.filter(option => option !== correct)).slice(0, 2)
  ]);
}

function buildDistinctiveFeatureQuestion(animal) {
  const correct = makeDistinctiveFeatureOption(animal);
  return {
    text: `${animal.name}의 생김새와 특징으로 가장 알맞은 것은 무엇일까요?`,
    correct,
    hintKey: "appearance",
    options: makeDistinctiveFeatureOptions(animal, correct)
  };
}

function makeDistinctiveFeatureOptions(animal, correct) {
  const distractors = animals
    .filter(candidate => candidate.id !== animal.id)
    .map(candidate => ({
      option: makeDistinctiveFeatureOption(candidate),
      score: getFeatureDistractorScore(animal, candidate, correct)
    }))
    .filter((item, index, array) => (
      item.option !== correct &&
      array.findIndex(candidate => candidate.option === item.option) === index
    ))
    .sort((first, second) => second.score - first.score)
    .slice(0, 2)
    .map(item => item.option);

  return shuffle([
    correct,
    ...distractors
  ]);
}

function makeDistinctiveFeatureOption(animal) {
  return animal.relation;
}

function getFeatureDistractorScore(target, candidate, correct) {
  let score = 0;
  const option = makeDistinctiveFeatureOption(candidate);
  const sharedTokens = getMeaningfulTokenOverlap(
    getFeatureComparisonText(target, correct),
    getFeatureComparisonText(candidate, option)
  );

  if (!target.categories.some(category => candidate.categories.includes(category))) score += 5;
  if (target.hasFins !== candidate.hasFins) score += 4;
  if (target.hasWings !== candidate.hasWings) score += 4;
  if (target.inWater !== candidate.inWater) score += 3;
  if (target.crawls !== candidate.crawls) score += 3;
  if (target.hasLegs !== candidate.hasLegs) score += 2;
  if (target.habitat === candidate.habitat) score -= 5;
  if (target.move === candidate.move) score -= 5;

  return score - (sharedTokens.length * 3);
}

function getFeatureComparisonText(animal, option) {
  return `${animal.body.join(" ")} ${animal.habitat} ${animal.move} ${option}`;
}

function getMeaningfulTokenOverlap(first, second) {
  const firstTokens = getMeaningfulTokens(first);
  const secondTokens = getMeaningfulTokens(second);
  return firstTokens.filter(token => secondTokens.includes(token));
}

const featureDistractorStopWords = new Set([
  "같은", "것은", "무엇", "도움을", "줘요", "생활", "생활에", "알맞아요",
  "에서", "으로", "하며", "있는", "없는", "몸을", "몸과", "먹이를",
  "움직여요", "이동해요", "다녀요", "찾고", "찾으며"
]);

function getMeaningfulTokens(text) {
  return [...new Set(
    String(text)
      .replace(/[.,]/g, " ")
      .split(/\s+/)
      .filter(token => token.length > 1 && !featureDistractorStopWords.has(token))
  )];
}

