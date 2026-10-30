import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        optimization: "optimization.html",
        pointTransforms: "point-transforms.html",
        pointTransformsEn: "point-transforms.en.html",
      },
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/three/")) return "three";
        },
      },
    },
  },
});
