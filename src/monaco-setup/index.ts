import {
  LogLevel,
  initialize as initializeMonacoService,
} from "vscode/services"

import defaultConfiguration from "./user/configuration.json?raw"

import getConfigurationServiceOverride, {
  initUserConfiguration,
} from "@codingame/monaco-vscode-configuration-service-override"
import getLanguagesServiceOverride from "@codingame/monaco-vscode-languages-service-override"
import getTextmateServiceOverride from '@codingame/monaco-vscode-textmate-service-override'
import getThemeServiceOverride from '@codingame/monaco-vscode-theme-service-override'
import getModelServiceOverride from '@codingame/monaco-vscode-model-service-override'
import "vscode/localExtensionHost"

import "@codingame/monaco-vscode-ipynb-default-extension"
import "@codingame/monaco-vscode-typescript-basics-default-extension"
import "@codingame/monaco-vscode-typescript-language-features-default-extension"
import "@codingame/monaco-vscode-theme-defaults-default-extension"
import "@codingame/monaco-vscode-python-default-extension"

import * as monaco from "monaco-editor"

export type WorkerLoader = () => Worker

const workspaceFile = monaco.Uri.file(
  "/tmp/ide-monaco-editor/ide-monaco-editor.py"
)

await initUserConfiguration(defaultConfiguration)

await initializeMonacoService(
  {
    ...getLanguagesServiceOverride(),
    ...getConfigurationServiceOverride(),
    ...getTextmateServiceOverride(),
    ...getThemeServiceOverride(),
    ...getModelServiceOverride()
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
      new URL("monaco-editor/esm/vs/editor/editor.worker.js", import.meta.url),
      { type: "module" }
    ),
  textMateWorker: () => new Worker(new URL('@codingame/monaco-vscode-textmate-service-override/worker', import.meta.url), { type: 'module' }),

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
