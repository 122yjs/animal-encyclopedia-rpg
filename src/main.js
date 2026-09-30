// Phaser 월드와 독립된 읽기용 UI는 같은 CSS viewport를 사용합니다.
import Phaser from "phaser/dist/phaser-arcade-physics.min.js";
// 빌드 모드에 따라 기본판(src/base) 또는 생태계 확장팩(src/eco) 씬 목록입니다 (vite.config.js의 @edition 별칭).
import scenes from "@edition/scenes.js";
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
  scene: scenes
};

// 디버그·스모크 테스트에서 씬 전환을 확인하기 위해 전역에 보관
const game = new Phaser.Game(config);
window.__ANIMAL_GAME__ = game;
