import json from "@rollup/plugin-json"
import react from "@vitejs/plugin-react"

import glob from "fast-glob"
import path from "path"
import electron from "vite-plugin-electron/simple"
import viteTsConfigs from "vite-tsconfig-paths"
import { defineConfig } from 'vite'
import importMetaUrlPlugin from '@codingame/esbuild-import-meta-url-plugin'
import vsixPlugin from '@codingame/monaco-vscode-rollup-vsix-plugin'

async function createConfig() {
  const monacoFiles = await glob("vscode/**/*.js", {
    cwd: path.resolve(__dirname, "../node_modules"),
  })

  return defineConfig({
    build: {
      outDir: "build",
      lib: {
        entry: "electron/main.ts",
        formats: ["es"], // Set the output format to 'es'
      },
      rollupOptions: {
        input: "resources/extensions/ms-python.python-2024.1.10371009.vsix",
        output: [
          {
            format: "esm",
            dir: "vscode-extensions",
            entryFileNames: "index.js",
            assetFileNames: () => {
              return `assets/[name][extname]`
            },
          },
        ],
        external: ["vscode"],
        plugins: [vsixPlugin()],
      },
    },
    plugins: [
      react(),
      json(),
      viteTsConfigs(),

      electron({
        main: {
          entry: "electron/main.ts",
        },
        preload: {
          // Shortcut of `build.rollupOptions.input`.
          // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
          input: path.join(__dirname, "electron/preload.ts"),
        },
        // Ployfill the Electron and Node.js built-in modules for Renderer process.
        // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
        renderer: {},
      }),
      {
        // For the *-language-features extensions which use SharedArrayBuffer
        name: "configure-response-headers",
        apply: "serve",
        configureServer: (server) => {
          server.middlewares.use((_req, res, next) => {
            res.setHeader("Cross-Origin-Embedder-Policy", "credentialless")
            res.setHeader("Cross-Origin-Opener-Policy", "same-origin")
            res.setHeader("Cross-Origin-Resource-Policy", "cross-origin")
            next()
          })
        },
      },
    ],
    optimizeDeps: {
      include: [
        "vscode/extensions",
        "vscode/services",
        "vscode/monaco",
        "vscode/localExtensionHost",

        "vscode-textmate",
        "vscode-oniguruma",
        "vscode-semver",
        "vscode-marked",
        ...monacoFiles,
      ],
      esbuildOptions: {
        plugins: [importMetaUrlPlugin],
      },
    },
  })
}

export default createConfig()
