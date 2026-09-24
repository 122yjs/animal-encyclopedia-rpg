// Phaser 월드와 독립된 읽기용 UI는 같은 CSS viewport를 사용합니다.
import Phaser from "phaser/dist/phaser-arcade-physics.min.js";
import BootScene from "./scenes/BootScene.js";
import TitleScene from "./scenes/TitleScene.js";
import WorldMapScene from "./scenes/WorldMapScene.js";
import OverworldScene from "./scenes/OverworldScene.js";
import QuizBattleScene from "./scenes/QuizBattleScene.js";
import DexScene from "./scenes/DexScene.js";
import SortGameScene from "./scenes/SortGameScene.js";
import "./ui/screen-ui.css";

const config = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#accec1",
  resolution: Math.min(window.devicePixelRatio || 1, 2),
  pixelArt: true,
  roundPixels: true,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  // 부팅 → 타이틀 → 월드맵(지역 지도) → 오버월드 → 배틀/도감/분류 게임
  scene: [BootScene, TitleScene, WorldMapScene, OverworldScene, QuizBattleScene, DexScene, SortGameScene]
};

// 디버그·스모크 테스트에서 씬 전환을 확인하기 위해 전역에 보관
const game = new Phaser.Game(config);
window.__ANIMAL_GAME__ = game;
