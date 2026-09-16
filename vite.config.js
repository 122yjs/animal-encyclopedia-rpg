import { defineConfig } from "vite";

// Vite 설정: 게임 그림은 src/assets에서 import해 내용 해시 URL을 쓰고, 그대로 복사할 파일은 public/, 코드는 src/
export default defineConfig({
  base: "./",
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    open: false
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // 내용 해시가 붙는 빌드 산출물은 public/의 안정 URL(/assets/…)과 겹치지 않는 /versioned/에 모읍니다.
    // 그래야 public/_headers에서 두 접두사를 나눠 걸 수 있습니다(겹치면 Cache-Control 값이 합쳐집니다).
    assetsDir: "versioned",
    rollupOptions: {
      // credits.html의 ?url 글롭이 해시 URL로 바뀌도록 두 번째 HTML 엔트리로 처리합니다.
      input: {
        main: "index.html",
        credits: "credits.html"
      }
    }
  }
});
