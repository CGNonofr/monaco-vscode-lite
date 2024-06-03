import json from "@rollup/plugin-json"
import react from "@vitejs/plugin-react"
import fs from "fs"

import glob from "fast-glob"
import path, { resolve } from "path"
import electron from "vite-plugin-electron/simple"
import viteTsConfigs from "vite-tsconfig-paths"

async function createConfig() {
  const monacoFiles = await glob("monaco-editor/esm/vs/**/common/**/*.js", {
    cwd: path.resolve(__dirname, "../node_modules"),
  })

  /** NOTE: Loading this via import yields an error, so we need to use await:
   * ✘ [ERROR] "@codingame/monaco-vscode-rollup-vsix-plugin" resolved to an ESM file. ESM file cannot be loaded by `require`.
   */
  const vsixPluginModule = await import(
    "@codingame/monaco-vscode-rollup-vsix-plugin"
  )
  const vsixPlugin = vsixPluginModule.default

  return {
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
        plugins: [
          {
            /** NOTE: Using previous implementation  -- using
             * import importMetaUrlPlugin from '@codingame/esbuild-import-meta-url-plugin'
             * yields the same error as above:
             * ✘ [ERROR] "@codingame/esbuild-import-meta-url-plugin" resolved to an ESM file. ESM file cannot be loaded by `require`. See http://vitejs.dev/guide/troubleshooting.html#this-package-is-esm-only for more details.
             */
            name: "import.meta.url",
            setup({ onLoad }) {
              onLoad({ filter: /.*\.js/, namespace: "file" }, async (args) => {
                const code = fs.readFileSync(args.path, "utf8")

                const assetImportMetaUrlRE =
                  /\bnew\s+URL\s*\(\s*('[^']+'|"[^"]+"|`[^`]+`)\s*,\s*import\.meta\.url\s*(?:,\s*)?\)/g
                let i = 0
                let newCode = ""
                for (
                  let match = assetImportMetaUrlRE.exec(code);
                  match != null;
                  match = assetImportMetaUrlRE.exec(code)
                ) {
                  newCode += code.slice(i, match.index)
                  const path = match[1].slice(1, -1)
                  const resolved = resolve(__dirname, path) // Use node's path.resolve with __dirname

                  newCode += `new URL(${JSON.stringify(
                    resolved
                  )}, import.meta.url)` // Use the resolved path

                  i = assetImportMetaUrlRE.lastIndex
                }
                newCode += code.slice(i)

                return { contents: newCode }
              })
            },
          },
        ],
      },
    },
  }
}

export default createConfig()
