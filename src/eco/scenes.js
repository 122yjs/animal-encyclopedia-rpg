// 생태계 확장팩(4학년 2학기 「생물과 환경」) 씬 목록
// 기본판 씬을 그대로 쓰고, 바꿀 씬만 같은 키를 쓰는 하위 클래스로 바꿔 끼웁니다.
// 화면 전환은 모두 씬 키 문자열로 하므로 바꿔 끼운 씬이 기본판 씬 자리를 그대로 이어받습니다.
// 새 씬은 목록 끝에 더합니다. src/eco의 코드는 기본판 번들에 들어가지 않습니다.
import baseScenes from "../base/scenes.js";
import TitleScene from "../scenes/TitleScene.js";
import EcoTitleScene from "./scenes/EcoTitleScene.js";
import OverworldScene from "../scenes/OverworldScene.js";
import EcoOverworldScene from "./scenes/EcoOverworldScene.js";

const replacements = new Map([
  [TitleScene, EcoTitleScene],
  [OverworldScene, EcoOverworldScene]
]);

export default baseScenes.map((Scene) => replacements.get(Scene) || Scene);
