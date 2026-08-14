import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // "/" for local dev and the iOS build; "/repo-name/" only for the production web build
  base: command === "serve" ? "/" : "/sat-free/",
  server: { watch: { ignored: ["**/.vs/**"] } },
}));