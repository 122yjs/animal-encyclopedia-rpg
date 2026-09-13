// 레거시 app.js에서 이식한 동물 데이터 (교육용 도감)
// 이미지 URL은 Wikimedia, 설명은 초등 과학 수업용입니다.
import { regions } from "./regions.js";

const imageSources = {
  "무당벌레": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Asian_lady_beetle-%28Harmonia-axyridis%29.jpg/330px-Asian_lady_beetle-%28Harmonia-axyridis%29.jpg",
  "달팽이": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Common_snail.jpg/330px-Common_snail.jpg",
  "고양이": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cat03.jpg/960px-Cat03.jpg",
  "거미": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Araneus_diadematus_%28Clerck%2C_1757%29.JPG/960px-Araneus_diadematus_%28Clerck%2C_1757%29.JPG",
  "박새": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Great_tit_%28Parus_major%29%2C_Parc_du_Rouge-Cloitre%2C_For%C3%AAt_de_Soignes%2C_Brussels_%2826194636951%29.jpg/330px-Great_tit_%28Parus_major%29%2C_Parc_du_Rouge-Cloitre%2C_For%C3%AAt_de_Soignes%2C_Brussels_%2826194636951%29.jpg",
  "꿀벌": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Bee_on_Geraldton_Wax_Flower.JPG/330px-Bee_on_Geraldton_Wax_Flower.JPG",
  "공벌레": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Armadillidium_vulgare_001.jpg/330px-Armadillidium_vulgare_001.jpg",
  "나비": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Butterfly_macro_shot.jpg/330px-Butterfly_macro_shot.jpg",
  "참새": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Tree_Sparrow_August_2007_Osaka_Japan.jpg/330px-Tree_Sparrow_August_2007_Osaka_Japan.jpg",
  "토끼": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Arctic_Hare.jpg/330px-Arctic_Hare.jpg",
  "호랑이": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Siberian_Tiger_by_Malene_Th.jpg/330px-Siberian_Tiger_by_Malene_Th.jpg",
  "개": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Golde33443.jpg/330px-Golde33443.jpg",
  "붕어": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/CarassiusCarassius8.JPG/330px-CarassiusCarassius8.JPG",
  "지렁이": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Regenwurm1.jpg/330px-Regenwurm1.jpg",
  "뱀": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Grass_snake_%28Natrix_natrix%29_Pieniny.jpg/960px-Grass_snake_%28Natrix_natrix%29_Pieniny.jpg",
  "개미": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Meat_eater_ant_feeding_on_honey02.jpg/330px-Meat_eater_ant_feeding_on_honey02.jpg",
  "노루": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Siberian_roe_deer.jpg/330px-Siberian_roe_deer.jpg",
  "너구리": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Nyctereutes_procyonoides_16072008.jpg/330px-Nyctereutes_procyonoides_16072008.jpg",
  "딱따구리": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Greater_Spotted_Woodpecker_%2841554059345%29.jpg/330px-Greater_Spotted_Woodpecker_%2841554059345%29.jpg",
  "낙타": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/07._Camel_Profile%2C_near_Silverton%2C_NSW%2C_07.07.2007.jpg/330px-07._Camel_Profile%2C_near_Silverton%2C_NSW%2C_07.07.2007.jpg",
  "도루묵도마뱀": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Apothekerskink01.jpg/330px-Apothekerskink01.jpg",
  "북극곰": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Polarb%C3%A4r_12_2004-11-17.jpg/330px-Polarb%C3%A4r_12_2004-11-17.jpg",
  "북극여우": "https://upload.wikimedia.org/wikipedia/commons/c/c7/Arctic_fox_in_snow_%28Unsplash%29.jpg",
  "펭귄": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Aptenodytes_forsteri_-Snow_Hill_Island%2C_Antarctica_-adults_and_juvenile-8.jpg/330px-Aptenodytes_forsteri_-Snow_Hill_Island%2C_Antarctica_-adults_and_juvenile-8.jpg",
  "산양": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Adult_male_amur_goral_standing_on_rock_at_National_Institute_of_Ecology%2C_Korea.jpg/330px-Adult_male_amur_goral_standing_on_rock_at_National_Institute_of_Ecology%2C_Korea.jpg",
  "수달": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Fischotter_Lutra_lutra1.jpg/330px-Fischotter_Lutra_lutra1.jpg",
  "다슬기": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Semisulcospira_kurodai2.jpg/330px-Semisulcospira_kurodai2.jpg",
  "송사리": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Nihonmedaka.jpg/330px-Nihonmedaka.jpg",
  "메기": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Silurus.jpg/330px-Silurus.jpg",
  "개구리": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Dark-spotted_Frog_%28Pelophylax_nigromaculatus%29.jpg/960px-Dark-spotted_Frog_%28Pelophylax_nigromaculatus%29.jpg",
  "청둥오리": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Anas_platyrhynchos_male_female_quadrat.jpg/330px-Anas_platyrhynchos_male_female_quadrat.jpg",
  "왜가리": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Grey%20heron%20%28Ardea%20cinerea%29.jpg?width=640",
  "갈매기": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Larus%20argentatus%20%28adult%29.jpg?width=640",
  "게": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Carcinus%20maenas.jpg?width=640",
  "조개": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Seashells_in_the_basket.jpg/330px-Seashells_in_the_basket.jpg",
  "소라": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Turbo_cornutus_%28horned_turban_snail%29_2_%2825031884946%29.jpg/330px-Turbo_cornutus_%28horned_turban_snail%29_2_%2825031884946%29.jpg",
  "돌돔": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/K231003%EB%8F%8C%EB%8F%94.jpg/330px-K231003%EB%8F%8C%EB%8F%94.jpg",
  "해삼": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Holothuria_cf_arguinensis.jpg/330px-Holothuria_cf_arguinensis.jpg",
  "돌고래": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Tursiops_truncatus_01.jpg/330px-Tursiops_truncatus_01.jpg",
  "오징어": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Loligo_vulgaris.jpg/960px-Loligo_vulgaris.jpg",
  "바다거북": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Hawaii_turtle_2.JPG/330px-Hawaii_turtle_2.JPG",
  "사막여우": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Vulpes%20zerda.jpg?width=640",
  "사막 뱀": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Crotalus%20cerastes%2072264050.jpg?width=640",
  "고등어": "https://upload.wikimedia.org/wikipedia/commons/3/3e/Scomber_japonicus.png",
  "해마": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Hippocampus_hippocampus_%28on_Ascophyllum_nodosum%29.jpg/330px-Hippocampus_hippocampus_%28on_Ascophyllum_nodosum%29.jpg"
};

const ASSET_BASE_URL = import.meta.env?.BASE_URL || "./";
const ENCOUNTER_ANIMAL_IDS = new Set(regions.flatMap((region) => region.spawns.map((spawn) => spawn.id)));

function localPhotoPath(name) {
  if (!ENCOUNTER_ANIMAL_IDS.has(name)) return null;
  const safeName = encodeURIComponent(name).replaceAll("%", "").toLowerCase();
  return `${ASSET_BASE_URL}assets/animals/photos/${safeName}.jpg`;
}


function wikiUrl(lang, title) {
  return `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title).replace(/%20/g, "_")}`;
}

/** 동물 한 마리 데이터를 만드는 공장 함수 */
function makeAnimal(name, wiki, categories, habitat, move, body, point, relation, flags, page) {
  const wikiInfo = typeof wiki === "string" ? { title: wiki, lang: "ko" } : wiki;
  return {
    id: name,
    name,
    wikiTitle: wikiInfo.title,
    wikiLang: wikiInfo.lang,
    categories,
    habitat,
    move,
    body,
    quickFacts: {
      habitat,
      movement: move,
      feature: body.slice(0, 2).join(", ")
    },
    point,
    relation,
    page,
    image: localPhotoPath(name),
    remoteImage: imageSources[name],
    source: wikiUrl(wikiInfo.lang, wikiInfo.title),
    ...flags
  };
}


export const animals = [
  makeAnimal("무당벌레", "무당벌레", ["around"], "풀밭, 나뭇잎", "다리로 걷고 날개로 날아가요.", ["단단한 겉날개", "작은 다리", "점무늬"], "학교 풀밭에서 볼 수 있는 작은 곤충이에요.", "날개와 다리로 나뭇잎 사이를 옮겨 다녀요.", { hasLegs: true, hasWings: true, hasFins: false, inWater: false, crawls: false }, "38쪽"),
  makeAnimal("달팽이", "달팽이", ["around"], "화단, 축축한 그늘", "배처럼 넓은 발로 천천히 기어가요.", ["껍데기", "촉각", "끈끈한 발"], "우리 주변에서 관찰할 수 있는 동물이에요.", "몸이 마르지 않도록 축축한 곳에서 생활해요.", { hasLegs: false, hasWings: false, hasFins: false, inWater: false, crawls: true }, "38쪽"),
  makeAnimal("고양이", "고양이", ["around"], "집 주변, 마을", "네 다리로 걷거나 뛰어요.", ["털", "수염", "발톱"], "주변에서 자주 볼 수 있는 동물이에요.", "발톱과 수염은 움직이고 주변을 살피는 데 도움을 줘요.", { hasLegs: true, hasWings: false, hasFins: false, inWater: false, crawls: false }, "38쪽"),
  makeAnimal("거미", "거미", ["around"], "나무, 벽, 풀숲", "여덟 개의 다리로 걸어요.", ["다리 8개", "거미줄", "작은 몸"], "학교 주변에서 볼 수 있는 작은 동물이에요.", "긴 다리와 거미줄을 이용해 먹이를 잡아요.", { hasLegs: true, hasWings: false, hasFins: false, inWater: false, crawls: true }, "39쪽"),
  makeAnimal("박새", { title: "Great_tit", lang: "en" }, ["around"], "나무와 숲", "날개로 날고 다리로 앉아요.", ["날개", "부리", "깃털"], "나무가 있는 곳에서 관찰할 수 있는 새예요.", "깃털과 날개가 있어 나뭇가지 사이를 날아다녀요.", { hasLegs: true, hasWings: true, hasFins: false, inWater: false, crawls: false }, "39쪽"),
  makeAnimal("꿀벌", "꿀벌", ["around"], "꽃이 핀 곳", "날개로 날아다녀요.", ["날개", "다리", "몸의 털"], "우리 주변 꽃밭에서 볼 수 있는 동물이에요.", "꽃가루를 옮기며 꽃 사이를 날아다녀요.", { hasLegs: true, hasWings: true, hasFins: false, inWater: false, crawls: false }, "39쪽"),
  makeAnimal("공벌레", "공벌레", ["around"], "돌 밑, 축축한 흙", "여러 다리로 기어가요.", ["여러 개의 다리", "단단한 몸", "동그랗게 말리는 몸"], "주변의 흙이나 돌 아래에서 볼 수 있어요.", "위험하면 몸을 둥글게 말아 자신을 지켜요.", { hasLegs: true, hasWings: false, hasFins: false, inWater: false, crawls: true }, "39쪽"),
  makeAnimal("개", "개", ["around"], "집 주변, 마을", "네 다리로 걷거나 뛰어요.", ["털", "귀", "코", "발"], "우리 주변에서 자주 볼 수 있는 동물이에요.", "잘 발달한 코와 네 다리는 냄새를 맡고 빠르게 움직이는 데 도움을 줘요.", { hasLegs: true, hasWings: false, hasFins: false, inWater: false, crawls: false }, "우리 주변"),
  makeAnimal("나비", "나비", ["land"], "풀밭, 꽃밭", "날개로 날아요.", ["큰 날개", "더듬이", "가느다란 다리"], "큰 날개의 무늬와 더듬이, 가느다란 다리를 자세히 관찰해요.", "날개가 있어 꽃 사이를 날며 생활해요.", { hasLegs: true, hasWings: true, hasFins: false, inWater: false, crawls: false }, "40쪽"),
  makeAnimal("참새", "참새", ["land"], "나무, 들판, 마을", "날개로 날고 다리로 걸어요.", ["날개", "부리", "다리"], "참새는 다리와 날개가 있는 동물이에요.", "날개가 있어 빠르게 이동하고 부리로 먹이를 먹어요.", { hasLegs: true, hasWings: true, hasFins: false, inWater: false, crawls: false }, "41쪽"),
  makeAnimal("토끼", "토끼", ["land"], "풀밭, 숲 가장자리", "다리로 뛰어 이동해요.", ["털", "긴 귀", "튼튼한 뒷다리"], "토끼는 털로 덮여 있고 다리가 있어요.", "긴 귀와 튼튼한 다리가 주변을 살피고 빠르게 도망치는 데 도움을 줘요.", { hasLegs: true, hasWings: false, hasFins: false, inWater: false, crawls: false }, "41쪽"),
  makeAnimal("호랑이", "호랑이", ["land"], "숲, 산", "네 다리로 걷고 뛰어요.", ["털", "발톱", "날카로운 이"], "주황빛 털의 검은 줄무늬와 큰 발, 날카로운 발톱을 자세히 관찰해요.", "강한 다리와 발톱으로 땅에서 먹이를 찾아요.", { hasLegs: true, hasWings: false, hasFins: false, inWater: false, crawls: false }, "40쪽"),
  makeAnimal("붕어", "붕어", ["freshwater"], "강이나 호수", "지느러미로 헤엄쳐요.", ["지느러미", "비늘", "아가미"], "붕어는 지느러미와 비늘이 있어요.", "지느러미를 이용해 물속에서 헤엄쳐 이동해요.", { hasLegs: false, hasWings: false, hasFins: true, inWater: true, crawls: false }, "41쪽, 49쪽"),
  makeAnimal("지렁이", "지렁이", ["around", "land"], "축축한 흙", "다리 없이 기어서 이동해요.", ["긴 몸", "다리 없음", "마디"], "지렁이는 다리가 없는 동물로 분류할 수 있어요.", "축축한 땅속에서 몸을 줄였다 늘이며 움직여요.", { hasLegs: false, hasWings: false, hasFins: false, inWater: false, crawls: true }, "39쪽, 45쪽"),
  makeAnimal("뱀", "뱀", ["land"], "풀숲, 숲, 산", "다리 없이 기어서 이동해요.", ["긴 몸", "비늘", "다리 없음"], "뱀은 다리가 없는 동물로 분류할 수 있어요.", "긴 몸과 비늘이 땅 위를 기어 이동하는 데 도움을 줘요.", { hasLegs: false, hasWings: false, hasFins: false, inWater: false, crawls: true }, "40쪽, 45쪽"),
  makeAnimal("개미", "개미", ["land"], "땅, 흙 속", "다리를 이용해 걸어요.", ["다리 6개", "더듬이", "작은 몸"], "개미의 생김새와 이동 방법을 관찰해요.", "작은 몸과 다리로 흙 위와 틈 사이를 잘 다녀요.", { hasLegs: true, hasWings: false, hasFins: false, inWater: false, crawls: false }, "44쪽"),
  makeAnimal("다람쥐", "다람쥐", ["land"], "숲, 공원, 나무가 많은 곳", "네 다리로 뛰고 나무를 잘 타요.", ["긴 꼬리", "강한 발톱", "앞니"], "비상 AR 자료에 있는 땅에서 사는 동물 사례예요.", "긴 꼬리와 발톱은 나무 위에서 균형을 잡고 이동하는 데 도움을 줘요.", { hasLegs: true, hasWings: false, hasFins: false, inWater: false, crawls: false }, "비상 AR"),
  makeAnimal("고라니", "고라니", ["land"], "수풀, 논과 물가 주변", "가늘고 긴 다리로 뛰어다녀요.", ["갈색 털", "긴 다리", "길쭉한 주둥이"], "비상 AR 자료에 있는 땅에서 사는 동물 사례예요.", "긴 다리는 수풀 사이를 빠르게 지나가며 생활하는 데 도움을 줘요.", { hasLegs: true, hasWings: false, hasFins: false, inWater: false, crawls: false }, "비상 AR"),
  makeAnimal("두더지", { title: "Mole_(animal)", lang: "en" }, ["land"], "땅속", "넓은 앞발로 굴을 파며 움직여요.", ["넓은 앞발", "두꺼운 발톱", "털"], "비상 AR 자료에 있는 땅속 생활 동물 사례예요.", "삽처럼 넓은 앞발과 발톱은 땅속에 굴을 파는 데 도움을 줘요.", { hasLegs: true, hasWings: false, hasFins: false, inWater: false, crawls: false }, "비상 AR"),
  makeAnimal("부엉이", { title: "Owl", lang: "en" }, ["land"], "숲, 나무가 많은 곳", "날개로 조용히 날아요.", ["큰 눈", "날개", "날카로운 발톱"], "비상 AR 자료에 있는 밤에 활동하는 새 사례예요.", "큰 눈과 날카로운 발톱은 밤에 먹이를 찾고 붙잡는 데 도움을 줘요.", { hasLegs: true, hasWings: true, hasFins: false, inWater: false, crawls: false }, "비상 AR"),
  makeAnimal("노루", "노루", ["land"], "숲, 산기슭", "다리로 걷거나 뛰어요.", ["다리", "털", "큰 귀"], "땅에서 사는 동물의 예예요.", "긴 다리로 숲과 산을 빠르게 이동해요.", { hasLegs: true, hasWings: false, hasFins: false, inWater: false, crawls: false }, "45쪽"),
  makeAnimal("너구리", "너구리", ["land"], "숲, 들, 물가 주변", "네 다리로 걸어요.", ["털", "다리", "긴 꼬리"], "땅에서 사는 동물의 예예요.", "다리와 발을 이용해 여러 장소를 돌아다니며 먹이를 찾아요.", { hasLegs: true, hasWings: false, hasFins: false, inWater: false, crawls: false }, "45쪽"),
  makeAnimal("딱따구리", "딱따구리", ["land"], "숲의 나무", "날개로 날고 발톱으로 나무에 붙어요.", ["날개", "곧은 부리", "발톱"], "나무에서 사는 새의 생김새와 움직임을 관찰해요.", "단단한 부리와 발톱은 나무에서 먹이를 찾고 생활하는 데 알맞아요.", { hasLegs: true, hasWings: true, hasFins: false, inWater: false, crawls: false }, "45쪽, 비상 AR"),
  makeAnimal("낙타", "낙타", ["special", "land"], "사막", "다리로 걸어요.", ["혹", "긴 다리", "두꺼운 발바닥"], "사막에서 사는 동물의 예예요.", "혹 속 영양분과 넓은 발바닥이 건조한 사막 생활에 도움을 줘요.", { hasLegs: true, hasWings: false, hasFins: false, inWater: false, crawls: false }, "46쪽"),
  makeAnimal("도루묵도마뱀", "도루묵도마뱀", ["special", "land"], "사막", "모래 위와 속을 빠르게 움직여요.", ["비늘", "짧은 다리", "매끈한 몸"], "사막에서 사는 동물의 예예요.", "뜨거운 낮에는 모래 속에서 생활하며 더위를 피할 수 있어요.", { hasLegs: true, hasWings: false, hasFins: false, inWater: false, crawls: true }, "47쪽"),
  makeAnimal("사막여우", { title: "Fennec_fox", lang: "en" }, ["special", "land"], "사막", "털로 덮인 발로 모래 위를 걸어요.", ["큰 귀", "작은 몸", "털 많은 발바닥"], "비상 AR 자료에 있는 사막 동물 사례예요.", "큰 귀는 더운 사막에서 열을 내보내고, 털 많은 발은 뜨거운 모래 위를 걷는 데 도움을 줘요.", { hasLegs: true, hasWings: false, hasFins: false, inWater: false, crawls: false }, "비상 AR"),
  makeAnimal("사막 뱀", { title: "Crotalus_cerastes", lang: "en" }, ["special", "land"], "사막", "몸의 일부를 들고 옆으로 기어가요.", ["모래색 몸", "비늘", "다리 없음"], "비상 AR 자료에 있는 사막 동물 사례예요.", "모래와 비슷한 몸 색깔과 옆으로 기는 움직임은 사막 생활에 알맞아요.", { hasLegs: false, hasWings: false, hasFins: false, inWater: false, crawls: true }, "비상 AR"),
  makeAnimal("사막 딱정벌레", { title: "Stenocara_gracilipes", lang: "en" }, ["special", "land"], "사막", "여섯 다리로 모래 위를 걸어요.", ["단단한 몸", "다리 6개", "등의 돌기"], "비상 AR 자료에 있는 사막 곤충 사례예요.", "단단한 몸과 등에 맺히는 물방울은 건조한 사막에서 살아가는 데 도움을 줘요.", { hasLegs: true, hasWings: false, hasFins: false, inWater: false, crawls: false }, "비상 AR"),
  makeAnimal("북극곰", "북극곰", ["special"], "극지방", "얼음 위를 걷고 물에서 헤엄쳐요.", ["두꺼운 털", "넓은 발", "두꺼운 피부"], "극지방에서 사는 동물의 예예요.", "털과 두꺼운 피부가 추위를 견디는 데 도움을 줘요.", { hasLegs: true, hasWings: false, hasFins: false, inWater: true, crawls: false }, "47쪽"),
  makeAnimal("북극여우", "북극여우", ["special", "land"], "극지방", "네 다리로 눈과 얼음 위를 걸어요.", ["작은 귀", "두꺼운 털", "짧은 주둥이"], "비상 AR 자료에 있는 극지방 동물 사례예요.", "작은 귀와 두꺼운 털은 추운 곳에서 몸의 열을 지키는 데 도움을 줘요.", { hasLegs: true, hasWings: false, hasFins: false, inWater: false, crawls: false }, "비상 AR"),
  makeAnimal("펭귄", "펭귄", ["special"], "극지방과 바다", "물속에서 헤엄치고 얼음 위를 걸어요.", ["빽빽한 깃털", "날개 모양 지느러미", "짧은 다리"], "극지방에서 사는 동물의 예예요.", "빽빽한 깃털은 추위를 견디게 하고, 날개 모양 지느러미는 물속에서 헤엄치는 데 도움을 줘요.", { hasLegs: true, hasWings: true, hasFins: false, inWater: true, crawls: false }, "47쪽, 비상 AR"),
  makeAnimal("산양", "산양", ["special", "land"], "높고 가파른 산악 지형", "다리와 발굽으로 바위를 올라요.", ["다리", "발굽", "털"], "산악 지형에서 사는 동물의 예예요.", "발굽과 다리는 높은 산의 바위에서 균형을 잡는 데 도움을 줘요.", { hasLegs: true, hasWings: false, hasFins: false, inWater: false, crawls: false }, "47쪽"),
  makeAnimal("수달", "수달", ["freshwater"], "강가나 호숫가", "물갈퀴가 있는 발로 헤엄쳐요.", ["물갈퀴", "털", "긴 꼬리"], "물에서 사는 동물의 예예요.", "물갈퀴가 있는 발은 물속에서 헤엄치는 데 알맞아요.", { hasLegs: true, hasWings: false, hasFins: false, inWater: true, crawls: false }, "34쪽, 48쪽"),
  makeAnimal("다슬기", "다슬기", ["freshwater"], "강이나 호수 바닥", "물속 바닥을 기어서 이동해요.", ["껍데기", "부드러운 몸", "발"], "강이나 호수에 사는 동물의 예예요.", "단단한 껍데기와 발이 물속 바닥 생활에 도움을 줘요.", { hasLegs: false, hasWings: false, hasFins: false, inWater: true, crawls: true }, "48쪽"),
  makeAnimal("송사리", "송사리", ["freshwater"], "강이나 호수", "지느러미로 헤엄쳐요.", ["지느러미", "작은 몸", "아가미"], "강이나 호수에 사는 동물의 예예요.", "작은 몸과 지느러미가 얕은 물에서 움직이는 데 알맞아요.", { hasLegs: false, hasWings: false, hasFins: true, inWater: true, crawls: false }, "48쪽"),
  makeAnimal("소금쟁이", "소금쟁이", ["freshwater"], "연못이나 하천의 물 위", "긴 다리로 물 위를 미끄러지듯 다녀요.", ["긴 다리", "가느다란 몸", "짧은 더듬이"], "비상 AR 자료에 있는 물가 동물 사례예요.", "가늘고 긴 다리는 물 표면 위에서 몸을 지탱하고 이동하는 데 도움을 줘요.", { hasLegs: true, hasWings: false, hasFins: false, inWater: true, crawls: false }, "비상 AR"),
  makeAnimal("피라미", "피라미", ["freshwater"], "강이나 하천", "지느러미로 헤엄쳐요.", ["지느러미", "비늘", "날씬한 몸"], "비상 AR 자료에 있는 민물고기 사례예요.", "날씬한 몸과 지느러미는 흐르는 물에서 헤엄치는 데 알맞아요.", { hasLegs: false, hasWings: false, hasFins: true, inWater: true, crawls: false }, "비상 AR"),
  makeAnimal("왜가리", "왜가리", ["freshwater", "land"], "논, 하천, 물가", "긴 다리로 얕은 물을 걸어요.", ["긴 목", "긴 다리", "뾰족한 부리"], "비상 AR 자료에 있는 물가 새 사례예요.", "긴 다리와 뾰족한 부리는 얕은 물에서 먹이를 찾는 데 도움을 줘요.", { hasLegs: true, hasWings: true, hasFins: false, inWater: true, crawls: false }, "비상 AR"),
  makeAnimal("물방개", "물방개", ["freshwater"], "연못이나 논의 물속", "털이 난 뒷다리로 헤엄쳐요.", ["다리 6개", "단단한 몸", "털 난 뒷다리"], "비상 AR 자료에 있는 물속 곤충 사례예요.", "길고 털이 난 뒷다리는 물속에서 노처럼 움직이는 데 도움을 줘요.", { hasLegs: true, hasWings: false, hasFins: false, inWater: true, crawls: false }, "비상 AR"),
  makeAnimal("메기", "메기", ["freshwater"], "강이나 호수", "지느러미로 헤엄쳐요.", ["지느러미", "수염", "아가미"], "강이나 호수에 사는 동물의 예예요.", "수염은 흐린 물속에서 주변을 느끼는 데 도움을 줘요.", { hasLegs: false, hasWings: false, hasFins: true, inWater: true, crawls: false }, "48쪽"),
  makeAnimal("개구리", "개구리", ["freshwater", "land"], "연못, 논, 물가", "다리로 뛰고 물갈퀴로 헤엄쳐요.", ["다리", "물갈퀴", "축축한 피부"], "강이나 호수에 사는 동물의 예예요.", "물갈퀴가 있는 발은 물속 이동에 도움을 줘요.", { hasLegs: true, hasWings: false, hasFins: false, inWater: true, crawls: false }, "49쪽"),
  makeAnimal("청둥오리", "청둥오리", ["freshwater"], "강이나 호수", "날개로 날고 물갈퀴 발로 헤엄쳐요.", ["날개", "물갈퀴", "부리"], "강이나 호수에 사는 동물의 예예요.", "물갈퀴가 있는 발은 물 위와 물속에서 움직이는 데 도움을 줘요.", { hasLegs: true, hasWings: true, hasFins: false, inWater: true, crawls: false }, "49쪽"),
  makeAnimal("갈매기", "갈매기", ["sea"], "바닷가와 항구", "날개로 바다 위를 날아다녀요.", ["날개", "부리", "물갈퀴 발"], "비상 AR 자료에 있는 바닷가 새 사례예요.", "날개와 물갈퀴 발은 바닷가에서 날고 물 위에 머무는 데 도움을 줘요.", { hasLegs: true, hasWings: true, hasFins: false, inWater: true, crawls: false }, "비상 AR"),
  makeAnimal("조개", "조개", ["sea"], "바다, 갯벌", "물속 바닥에서 천천히 움직여요.", ["껍데기", "부드러운 몸", "발"], "바다와 갯벌에 사는 동물의 예예요.", "껍데기는 부드러운 몸을 보호하는 데 도움을 줘요.", { hasLegs: false, hasWings: false, hasFins: false, inWater: true, crawls: true }, "50쪽, 51쪽"),
  makeAnimal("게", "게", ["sea"], "갯벌과 바닷가", "다섯 쌍의 다리로 옆으로 걸어요.", ["집게", "다리 10개", "단단한 껍질"], "갯벌과 바닷가에서 사는 동물의 예예요.", "단단한 껍질과 집게는 갯벌에서 몸을 보호하고 먹이를 찾는 데 도움을 줘요.", { hasLegs: true, hasWings: false, hasFins: false, inWater: true, crawls: false }, "50쪽, 57쪽, 비상 AR"),
  makeAnimal("전복", "전복", ["sea"], "바다 바위", "넓은 발로 바위에 붙어 천천히 기어가요.", ["구멍 있는 껍데기", "넓은 발", "부드러운 몸"], "비상 AR 자료에 있는 바다 동물 사례예요.", "넓은 발과 단단한 껍데기는 바위에 붙어 생활하는 데 도움을 줘요.", { hasLegs: false, hasWings: false, hasFins: false, inWater: true, crawls: true }, "비상 AR"),
  makeAnimal("소라", "소라", ["sea"], "바다 바닥", "물속 바닥을 기어서 이동해요.", ["껍데기", "부드러운 몸", "발"], "바다에 사는 동물의 예예요.", "나선 모양 껍데기는 몸을 보호해요.", { hasLegs: false, hasWings: false, hasFins: false, inWater: true, crawls: true }, "50쪽"),
  makeAnimal("돌돔", "돌돔", ["sea"], "바다", "지느러미로 헤엄쳐요.", ["지느러미", "비늘", "줄무늬"], "바다에 사는 동물의 예예요.", "지느러미와 비늘은 바다에서 헤엄치는 데 알맞아요.", { hasLegs: false, hasWings: false, hasFins: true, inWater: true, crawls: false }, "50쪽"),
  makeAnimal("해삼", "해삼", ["sea"], "바다 바닥", "물속 바닥을 천천히 기어가요.", ["길쭉한 몸", "다리 없음", "부드러운 몸"], "바다에 사는 동물의 예예요.", "바닥에 붙어 천천히 움직이며 생활해요.", { hasLegs: false, hasWings: false, hasFins: false, inWater: true, crawls: true }, "50쪽"),
  makeAnimal("돌고래", "돌고래", ["sea"], "바다", "지느러미와 꼬리로 헤엄쳐요.", ["지느러미", "매끈한 몸", "꼬리"], "바다에 사는 동물의 예예요.", "매끈한 몸과 지느러미가 빠르게 헤엄치는 데 도움을 줘요.", { hasLegs: false, hasWings: false, hasFins: true, inWater: true, crawls: false }, "51쪽"),
  makeAnimal("오징어", "오징어", ["sea"], "바다", "몸에서 물을 뿜어 빠르게 움직여요.", ["긴 팔", "빨판", "부드러운 몸"], "바다에 사는 동물의 예예요.", "팔의 빨판은 먹이를 붙잡는 데 도움을 줘요.", { hasLegs: false, hasWings: false, hasFins: false, inWater: true, crawls: false }, "51쪽"),
  makeAnimal("바다거북", "바다거북", ["sea"], "바다", "넓은 앞다리로 헤엄쳐요.", ["넓은 앞다리", "등딱지", "부리 모양 입"], "바다에 사는 동물의 예예요.", "넓은 앞다리는 물속에서 노처럼 움직여요.", { hasLegs: true, hasWings: false, hasFins: false, inWater: true, crawls: false }, "51쪽"),
  makeAnimal("고등어", "고등어", ["sea"], "바다", "지느러미로 헤엄쳐요.", ["지느러미", "비늘", "매끈한 몸"], "바다에 사는 동물의 예예요.", "지느러미와 매끈한 몸은 물속 이동에 알맞아요.", { hasLegs: false, hasWings: false, hasFins: true, inWater: true, crawls: false }, "51쪽"),
  makeAnimal("해마", { title: "Seahorse", lang: "en" }, ["sea"], "바다", "작은 지느러미를 움직여 천천히 헤엄쳐요.", ["작은 지느러미", "말처럼 생긴 머리", "말린 꼬리"], "바다에서 이동하는 방법을 생김새와 연결해 생각해요.", "작은 지느러미와 꼬리가 바닷속에서 몸을 조절하는 데 도움을 줘요.", { hasLegs: false, hasWings: false, hasFins: true, inWater: true, crawls: false }, "51쪽")
];

export const collectedIdAliases = {
  "오색딱따구리": "딱따구리",
  "황제펭귄": "펭귄",
  "칠게": "게"
};

export const animalById = Object.fromEntries(animals.map((a) => [a.id, a]));

/** 지역(카테고리)에 속한 동물만 골라 줍니다 */
export function getAnimalsByCategory(categoryId) {
  return animals.filter((animal) => animal.categories.includes(categoryId));
}
