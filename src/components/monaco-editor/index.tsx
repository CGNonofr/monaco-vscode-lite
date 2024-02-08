import * as monaco from "monaco-editor"

import { useLayoutEffect, useRef } from "react"
import "vscode/localExtensionHost"

import { IReference, ITextFileEditorModel } from "monaco-editor/monaco"

const modelUri = monaco.Uri.file("inmemory://model.py")
const samplePythonCode = `print("Hello, World!")`

export const MonacoEditorComponent = () => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const modelRef = useRef<IReference<ITextFileEditorModel>>()
  const containerRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    const startEditor = async () => {
      if (containerRef.current && !editorRef.current) {
        if (!monaco.editor.getModel(modelUri)) {
          monaco.editor.createModel(samplePythonCode, "python", modelUri)
        }

        modelRef.current = await monaco.editor.createModelReference(
          modelUri,
          samplePythonCode
        )

        editorRef.current = monaco.editor.create(containerRef.current, {
          model: modelRef.current?.object.textEditorModel,
          autoIndent: "full",
          automaticLayout: true,
          formatOnPaste: true,
          formatOnType: true,
          fontFamily:
            "ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace",
          fontSize: 14,
          minimap: {
            enabled: false,
          },
          renderWhitespace: "all",
          language: "python",
          theme: "vs-dark",
          value: samplePythonCode,
        })

        editorRef.current.setValue(samplePythonCode)

        if (editorRef.current) {
          monaco.editor.setModelLanguage(
            editorRef.current.getModel()!,
            "python"
          )
        }

        if (typeof modelRef.current?.object.save === "function") {
          await modelRef.current?.object.save()
        } else {
          console.error("modelRef.current?.object.save is not a function")
        }

        console.log("Languages", monaco.languages.getLanguages())
      }
    }
    startEditor()

    return () => {
      modelRef.current?.dispose()
      editorRef.current?.getModel()?.dispose()
      editorRef.current?.dispose()
    }
  }, [])

  return <div ref={containerRef} className="monaco-editor-component" />
}
