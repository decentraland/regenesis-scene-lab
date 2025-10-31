import { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { SceneFiles } from './types'
import { useMonacoSetup } from './monaco-config'

interface EditorPanelProps {
  sceneId: string
  files: SceneFiles
  onFileChange: (path: string, content: string) => void
  onBuild: () => void
  isBuilding: boolean
  viewingSnapshotId: string | null
}

export function EditorPanel({ sceneId, files, onFileChange, onBuild, isBuilding, viewingSnapshotId }: EditorPanelProps) {
  const [activeFile, setActiveFile] = useState<string>('/src/index.ts')
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code')
  const [previewKey, setPreviewKey] = useState<number>(Date.now())
  const { beforeMount } = useMonacoSetup(files)

  // Update preview key when files change (to force iframe remount)
  useEffect(() => {
    if (!viewingSnapshotId) {
      // Only update for current scene, not snapshots
      setPreviewKey(Date.now())
    }
  }, [files, viewingSnapshotId])

  // Construct preview URL
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
  const realmUrl = viewingSnapshotId
    ? `${apiUrl}/scenes/${sceneId}/snapshots/${viewingSnapshotId}`
    : `${apiUrl}/scenes/${sceneId}`
  const previewUrl = `${apiUrl}/bevy-explorer/?initialRealm=${realmUrl}`

  // Log preview URL when it changes
  useEffect(() => {
    console.log('🎮 Preview URL:', previewUrl)
    console.log('📍 Realm URL:', realmUrl)
    console.log('🔍 Viewing:', viewingSnapshotId ? `Snapshot ${viewingSnapshotId}` : 'Current scene')
  }, [previewUrl, realmUrl, viewingSnapshotId])

  const fileList = Object.keys(files).sort()
  const currentContent = files[activeFile] || ''

  // Get file language based on extension
  const getLanguage = (filename: string) => {
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return 'typescript'
    if (filename.endsWith('.js') || filename.endsWith('.jsx')) return 'javascript'
    if (filename.endsWith('.json')) return 'json'
    return 'plaintext'
  }

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onFileChange(activeFile, value)
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#1e1e1e'
    }}>
      {/* View Mode Toggle */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #333',
        backgroundColor: '#252526'
      }}>
        <button
          onClick={() => setViewMode('code')}
          style={{
            flex: 1,
            padding: '12px',
            backgroundColor: viewMode === 'code' ? '#1e1e1e' : 'transparent',
            color: viewMode === 'code' ? '#d4d4d4' : '#888',
            border: 'none',
            borderBottom: viewMode === 'code' ? '2px solid #007acc' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
        >
          <span style={{ fontSize: '16px' }}>📝</span>
          Code
        </button>
        <button
          onClick={() => setViewMode('preview')}
          style={{
            flex: 1,
            padding: '12px',
            backgroundColor: viewMode === 'preview' ? '#1e1e1e' : 'transparent',
            color: viewMode === 'preview' ? '#d4d4d4' : '#888',
            border: 'none',
            borderBottom: viewMode === 'preview' ? '2px solid #007acc' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
        >
          <span style={{ fontSize: '16px' }}>👁️</span>
          Preview
        </button>
      </div>

      {/* Code View */}
      <div style={{
        display: viewMode === 'code' ? 'flex' : 'none',
        flexDirection: 'column',
        flex: 1
      }}>
        {/* Header with file tabs */}
        <div style={{
          borderBottom: '1px solid #333',
          backgroundColor: '#252526'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            borderBottom: '1px solid #333'
          }}>
            <span style={{ color: '#d4d4d4', fontSize: '14px', fontWeight: 600 }}>
              Scene Files
            </span>
            <button
              onClick={onBuild}
              disabled={isBuilding}
              style={{
                padding: '6px 16px',
                backgroundColor: isBuilding ? '#555' : '#16825d',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: isBuilding ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 600
              }}
            >
              {isBuilding ? 'Building...' : 'Build Scene'}
            </button>
          </div>

          <div style={{
            display: 'flex',
            overflowX: 'auto',
            backgroundColor: '#2d2d30'
          }}>
            {fileList.map((file) => (
              <button
                key={file}
                onClick={() => setActiveFile(file)}
                style={{
                  padding: '10px 16px',
                  backgroundColor: activeFile === file ? '#1e1e1e' : 'transparent',
                  color: activeFile === file ? '#d4d4d4' : '#888',
                  border: 'none',
                  borderRight: '1px solid #333',
                  cursor: 'pointer',
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  fontFamily: 'monospace'
                }}
              >
                {file}
              </button>
            ))}
          </div>
        </div>

        {/* Monaco Editor */}
        <div style={{ flex: 1 }}>
          <Editor
            key={activeFile}
            height="100%"
            path={activeFile}
            language={getLanguage(activeFile)}
            theme="vs-dark"
            value={currentContent}
            onChange={handleEditorChange}
            beforeMount={beforeMount}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              formatOnPaste: true,
              formatOnType: true,
              quickSuggestions: true,
              suggestOnTriggerCharacters: true,
              acceptSuggestionOnEnter: 'on',
              parameterHints: { enabled: true }
            }}
          />
        </div>

        {/* Status bar */}
        <div style={{
          padding: '6px 16px',
          backgroundColor: '#007acc',
          color: '#fff',
          fontSize: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{activeFile}</span>
          <span>{getLanguage(activeFile).toUpperCase()}</span>
        </div>
      </div>

      {/* Preview View - Always mounted, just hidden when not active */}
      <div style={{
        display: viewMode === 'preview' ? 'flex' : 'none',
        flex: 1,
        flexDirection: 'column',
        backgroundColor: '#1e1e1e'
      }}>
        {/* Preview Header */}
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#252526',
          borderBottom: '1px solid #333',
          color: '#d4d4d4',
          fontSize: '14px',
          fontWeight: 600
        }}>
          Scene Preview - Bevy Explorer
        </div>

        {/* Bevy Explorer Iframe */}
        <div style={{ flex: 1, position: 'relative' }}>
          <iframe
            key={viewingSnapshotId || previewKey} // Force remount when snapshot or files change
            src={previewUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: '#000'
            }}
            title="Bevy Explorer Preview"
            allow="cross-origin-isolated; fullscreen"
          />
        </div>

        {/* Preview Info */}
        <div style={{
          padding: '8px 16px',
          backgroundColor: '#252526',
          borderTop: '1px solid #333',
          color: '#888',
          fontSize: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>🎮 Decentraland Scene Preview</span>
          <span style={{ fontSize: '11px', color: '#555' }}>
            Powered by Bevy Explorer Web
          </span>
        </div>
      </div>
    </div>
  )
}
