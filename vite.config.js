import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// Vite 설정: 게임 그림은 src/assets에서 import해 내용 해시 URL을 쓰고, 그대로 복사할 파일은 public/, 코드는 src/
// `--mode eco`는 생태계 확장팩입니다. @edition이 src/eco를 가리키고 dist-eco/에 따로 빌드하며,
// 탭 제목은 .env.eco의 VITE_APP_TITLE을 씁니다. 그 밖의 모드는 기본판(src/base, dist/)입니다.
export default defineConfig(({ mode }) => {
  const eco = mode === "eco";
  return {
    base: "./",
    resolve: {
      alias: {
        "@edition": fileURLToPath(new URL(eco ? "./src/eco" : "./src/base", import.meta.url))
      }
    },
    server: {
      host: "127.0.0.1",
      port: eco ? 5174 : 5173,
      strictPort: true,
      open: false
    },
    build: {
      outDir: eco ? "dist-eco" : "dist",
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
  };
});
