import { useEffect, useRef } from 'react'
import { Monaco } from '@monaco-editor/react'
import { SceneFiles } from './types'

const DCL_SDK_TYPES_URL = 'https://unpkg.com/@dcl/playground-assets@latest/dist/index.bundled.d.ts'

let typesLoaded = false
let typesCache: string | null = null
let monacoInstance: Monaco | null = null
let sceneFileDisposables: Array<{ dispose: () => void }> = []

export async function loadDCLTypes(): Promise<string> {
  if (typesCache) return typesCache

  try {
    const response = await fetch(DCL_SDK_TYPES_URL)
    if (!response.ok) throw new Error('Failed to load DCL types')
    typesCache = await response.text()
    return typesCache
  } catch (error) {
    console.error('Failed to load Decentraland SDK types:', error)
    return ''
  }
}

export function setupMonacoForDecentraland(monaco: Monaco) {
  if (typesLoaded) return

  monacoInstance = monaco

  // Configure TypeScript compiler options
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    noEmit: true,
    esModuleInterop: true,
    jsx: monaco.languages.typescript.JsxEmit.React,
    jsxFactory: 'ReactEcs.createElement',
    jsxFragmentFactory: 'ReactEcs.Fragment',
    allowJs: true,
    typeRoots: ['node_modules/@types'],
    strict: false,
    skipLibCheck: true,
    paths: {
      '@dcl/sdk/ecs': ['file:///node_modules/@dcl/sdk/ecs/index.d.ts'],
      '@dcl/sdk/math': ['file:///node_modules/@dcl/sdk/math/index.d.ts'],
      '@dcl/sdk/react-ecs': ['file:///node_modules/@dcl/sdk/react-ecs/index.d.ts'],
      '@dcl/sdk/components': ['file:///node_modules/@dcl/sdk/components/index.d.ts']
    }
  })

  // Enable type checking and diagnostics
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false
  })

  // Load and add Decentraland SDK types
  loadDCLTypes().then((types) => {
    if (types) {
      // Add main SDK types
      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        types,
        'file:///node_modules/@dcl/sdk/index.d.ts'
      )

      // Add virtual modules for subpaths
      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        types,
        'file:///node_modules/@dcl/sdk/ecs/index.d.ts'
      )

      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        types,
        'file:///node_modules/@dcl/sdk/math/index.d.ts'
      )

      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        types,
        'file:///node_modules/@dcl/sdk/components/index.d.ts'
      )

      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        types,
        'file:///node_modules/@dcl/sdk/react-ecs/index.d.ts'
      )

      // Add minimal React types for JSX support
      const reactTypes = `
declare namespace React {
  type ReactNode = any
  type FC<P = {}> = (props: P) => ReactNode
  type PropsWithChildren<P> = P & { children?: ReactNode }

  function createElement(type: any, props?: any, ...children: any[]): ReactNode
  function Fragment(props: { children?: ReactNode }): ReactNode
}

declare global {
  namespace JSX {
    interface Element extends React.ReactNode {}
    interface IntrinsicElements {
      [elemName: string]: any
    }
  }
}

export = React
export as namespace React
`
      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        reactTypes,
        'file:///node_modules/@types/react/index.d.ts'
      )

      // Decentraland SDK types loaded
    }
  })

  typesLoaded = true
}

// Update scene files in Monaco to enable imports between files
export function updateSceneFiles(files: SceneFiles) {
  if (!monacoInstance) return

  // Dispose old scene file libs
  sceneFileDisposables.forEach(disposable => {
    try {
      disposable.dispose()
    } catch (error) {
      // Ignore disposal errors
    }
  })
  sceneFileDisposables = []

  // Add each scene file as an extra lib so Monaco can resolve imports
  Object.entries(files).forEach(([path, content]) => {
    // Only add TypeScript/JavaScript files
    if (path.endsWith('.ts') || path.endsWith('.tsx') || path.endsWith('.js') || path.endsWith('.jsx')) {
      // Convert path to Monaco URI format (file:// protocol)
      const uri = `file://${path}`

      try {
        if (monacoInstance) {
          const disposable = monacoInstance.languages.typescript.typescriptDefaults.addExtraLib(content, uri)
          sceneFileDisposables.push(disposable)
        }
      } catch (error) {
        console.error('Failed to add extra lib:', path, error)
      }
    }
  })

  // Scene files updated in Monaco
}

export function useMonacoSetup(files: SceneFiles) {
  const setupDone = useRef(false)

  // Update scene files whenever they change
  useEffect(() => {
    if (setupDone.current) {
      updateSceneFiles(files)
    }
  }, [files])

  return {
    beforeMount: (monaco: Monaco) => {
      if (!setupDone.current) {
        setupMonacoForDecentraland(monaco)
        updateSceneFiles(files)
        setupDone.current = true
      }
    }
  }
}
