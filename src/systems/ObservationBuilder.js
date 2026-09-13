// 레거시 app.js의 관찰(observation) 문구를 Phaser용으로 이식합니다.
// 퀴즈는 "정답 암기"가 아니라, 도감에서 본 내용을 떠올리는 학습 흐름입니다.

/** 조사(은/는) — 한글 받침 여부에 따라 고릅니다 */
export function topicParticle(value) {
  return hasFinalConsonant(value) ? "은" : "는";
}

/** 조사(이/가) */
export function subjectParticle(value) {
  return hasFinalConsonant(value) ? "이" : "가";
}

/** 조사(와/과) */
export function withParticle(value) {
  return hasFinalConsonant(value) ? "과" : "와";
}

/** 조사(으로/로) — 받침이 없거나 ㄹ 받침이면 "로" */
export function directionParticle(value) {
  const trimmed = String(value).trim();
  const last = trimmed.charCodeAt(trimmed.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "로";
  const jong = (last - 0xac00) % 28;
  return jong === 0 || jong === 8 ? "로" : "으로";
}

function hasFinalConsonant(value) {
  const last = String(value).trim().charCodeAt(String(value).trim().length - 1);
  if (last < 0xac00 || last > 0xd7a3) return false;
  return (last - 0xac00) % 28 !== 0;
}

/** 한 줄로 생활 방식을 요약합니다 */
export function lifeBrief(animal) {
  if (animal.inWater && animal.hasFins) return "물속에서 헤엄치며 생활합니다.";
  if (animal.inWater) return "물가나 물속을 오가며 생활합니다.";
  if (animal.hasWings) return "날아다니며 먹이나 쉴 곳을 찾습니다.";
  if (animal.crawls) return "바닥 가까이에서 기어 다닙니다.";
  if (animal.hasLegs) return "다리로 걷거나 뛰며 생활합니다.";
  return "몸을 움직여 천천히 이동합니다.";
}

/** 움직임 관찰을 돕는 짧은 설명 */
export function lifestyleExplanation(animal) {
  if (animal.hasFins) {
    return "물속에서 살기 좋아요. 몸을 좌우로 움직이며 앞으로 나아가요.";
  }
  if (animal.hasWings && animal.inWater) {
    return "물 위에서 쉬거나 먹이를 찾고, 필요할 때 날아가요. 발 모양도 함께 봐요.";
  }
  if (animal.hasWings) {
    return "나무, 풀, 꽃 사이를 옮겨 다닐 수 있어요. 날개와 다리를 함께 봐요.";
  }
  if (animal.crawls && !animal.hasLegs) {
    return "다리가 없거나 잘 보이지 않아요. 몸을 구부리며 기어가요.";
  }
  if (animal.crawls) {
    return "몸을 낮게 두고 기어가요. 바닥이나 벽에 가까이 붙어 움직여요.";
  }
  if (animal.hasLegs) {
    return "다리로 걷거나 뛰며 먹이를 찾아요. 다리의 길이와 발 모양을 봐요.";
  }
  return "몸 전체를 움직여 이동해요. 어디에서 먹이를 찾는지 봐요.";
}

/**
 * 레거시 buildObservationDetails와 동일한 관찰 문단을 만듭니다.
 * hintKey: appearance | lifestyle | habitat | adaptation
 */
export function buildObservationDetails(animal) {
  const visibleParts = animal.body.join(", ");

  return {
    intro: `${animal.name}${topicParticle(animal.name)} ${animal.habitat}에서 볼 수 있는 동물입니다. ${lifeBrief(animal)}`,
    appearance: `${animal.name}의 몸에서는 ${visibleParts} 같은 부분이 잘 보입니다.\n이 부분들은 몸을 보호하거나 움직이고 먹이를 찾는 데 쓰입니다.`,
    lifestyle: `${animal.move} ${lifestyleExplanation(animal)}`,
    habitatLife: `${animal.habitat}에서 먹이나 쉴 곳을 찾으며 살아갑니다. ${animal.move}`,
    habitatLink: `${animal.relation} 이런 특징 때문에 ${animal.name}${topicParticle(animal.name)} ${animal.habitat}에서 생활하기에 알맞습니다.`
  };
}

/** 퀴즈 중 접을 수 있는 관찰 요약(quickFacts) */
export function buildQuickFacts(animal) {
  return {
    habitat: animal.quickFacts?.habitat || animal.habitat,
    movement: animal.quickFacts?.movement || animal.move,
    feature: animal.quickFacts?.feature || animal.body.slice(0, 2).join(", ")
  };
}

/** hintKey → 관찰 문단 제목/본문 */
export function getHintSection(animal, hintKey) {
  const obs = buildObservationDetails(animal);
  const map = {
    habitat: { title: "사는 곳과 생활", body: obs.habitatLife, checkLabel: "사는 곳을 봤어요" },
    lifestyle: { title: "생김새와 움직임", body: obs.lifestyle, checkLabel: "움직임을 봤어요" },
    appearance: { title: "생김새와 움직임", body: obs.appearance, checkLabel: "몸의 특징을 봤어요" },
    adaptation: { title: "환경에 알맞은 특징", body: obs.habitatLink, checkLabel: "특징을 연결해 봤어요" }
  };
  return map[hintKey] || {
    title: "다시 관찰해 보기",
    body: obs.intro,
    checkLabel: "다시 읽어 봤어요"
  };
}

/** 문항 유형 배지 문구 (사는 곳 / 움직임 / 특징) */
export function getQuestionTypeLabel(question, index) {
  if (question?.hintKey === "habitat" || index === 0) return "사는 곳";
  if (question?.hintKey === "lifestyle" || index === 1) return "움직임";
  return "특징";
}
