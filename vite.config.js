import { defineConfig } from "vite";

// Vite 설정: 정적 에셋은 public/ 아래, 게임 코드는 src/
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
    emptyOutDir: true
  }
});
