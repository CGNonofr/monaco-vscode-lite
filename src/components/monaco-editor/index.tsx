import * as monaco from "monaco-editor"

import { useLayoutEffect, useRef } from "react"

import { IReference, ITextFileEditorModel, createModelReference } from "vscode/monaco"

const modelUri = monaco.Uri.file("inmemory://model.py")
const samplePythonCode = `print("Hello, World!")`

export const MonacoEditorComponent = () => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const modelRef = useRef<IReference<ITextFileEditorModel>>()
  const containerRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    const startEditor = async () => {
      if (containerRef.current && !editorRef.current) {
        modelRef.current = await createModelReference(
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

        await modelRef.current?.object.save()

        console.log("Languages", monaco.languages.getLanguages(), modelRef.current?.object.textEditorModel?.getLanguageId())
      }
    }
    startEditor()

    return () => {
      modelRef.current?.dispose()
      editorRef.current?.dispose()
    }
  }, [])

  return <div ref={containerRef} className="monaco-editor-component" />
}
