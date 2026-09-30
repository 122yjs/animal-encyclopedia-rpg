// 확장팩 타이틀 — 기본판 시작 화면에 확장팩 이름만 바꿔 답니다.
import TitleScene from "../../scenes/TitleScene.js";

export default class EcoTitleScene extends TitleScene {
  createDom() {
    super.createDom();
    const kicker = this.ui.root.querySelector(".title-kicker");
    if (kicker) kicker.textContent = "생태계 확장팩 · 4학년 「생물과 환경」";
  }
}
