import { defineConfig } from "vite";

// base "./": the same build works at https://<user>.github.io/afterglow-fm1/ and from any folder
export default defineConfig({ base: "./", build: { target: "es2022" } });
