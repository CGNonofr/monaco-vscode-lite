import {
  LogLevel,
  initialize as initializeMonacoService,
} from "vscode/services"

import defaultConfiguration from "./user/configuration.json?raw"

import getAiServiceOverride from "@codingame/monaco-vscode-ai-service-override"
import getConfigurationServiceOverride, {
  updateUserConfiguration,
} from "@codingame/monaco-vscode-configuration-service-override"
import getExtensionGalleryServiceOverride from "@codingame/monaco-vscode-extension-gallery-service-override"
import getLanguagesServiceOverride from "@codingame/monaco-vscode-languages-service-override"
import "vscode/localExtensionHost"

import "@codingame/monaco-vscode-ipynb-default-extension"
import "@codingame/monaco-vscode-typescript-basics-default-extension"
import "@codingame/monaco-vscode-typescript-language-features-default-extension"

import * as monaco from "monaco-editor"

export type WorkerLoader = () => Worker

const workspaceFile = monaco.Uri.file(
  "/tmp/ide-monaco-editor/ide-monaco-editor.py"
)

await initializeMonacoService(
  {
    ...getAiServiceOverride(),
    ...getExtensionGalleryServiceOverride({ webOnly: false }),
    ...getLanguagesServiceOverride(),
    ...getConfigurationServiceOverride(),
  },
  document.body,
  {
    remoteAuthority: undefined,
    enableWorkspaceTrust: true,
    connectionToken: undefined,
    workspaceProvider: {
      trusted: true,
      async open() {
        return false
      },
      workspace: {
        workspaceUri: workspaceFile,
      },
    },
    developmentOptions: {
      logLevel: LogLevel.Info,
    },
  }
)

const workerLoaders: Partial<Record<string, WorkerLoader>> = {
  editorWorkerService: () =>
    new Worker(
      new URL("vscode/vscode/src/vs/editor/editor.worker.js", import.meta.url),
      { type: "module" }
    ),
  languageDetectionWorkerService: () =>
    new Worker(
      new URL(
        "@codingame/monaco-vscode-language-detection-worker-service-override/worker",
        import.meta.url
      ),
      { type: "module" }
    ),
}

window.MonacoEnvironment = {
  getWorker: function (moduleId, label) {
    const workerFactory = workerLoaders[label]
    if (workerFactory != null) {
      return workerFactory()
    }
    throw new Error(`Unimplemented worker ${label} (${moduleId})`)
  },
}

await updateUserConfiguration(defaultConfiguration)
