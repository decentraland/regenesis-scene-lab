import { useEffect, useState, useRef } from 'react'
import { PromptPanel } from './PromptPanel'
import { EditorPanel } from './EditorPanel'
import { api } from './api'
import { Scene, Message, SceneFiles } from './types'

export function App() {
  const [scene, setScene] = useState<Scene | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isBuilding, setIsBuilding] = useState(false)
  const [viewingSnapshotId, setViewingSnapshotId] = useState<string | null>(null)
  const [snapshotFiles, setSnapshotFiles] = useState<SceneFiles | null>(null)
  const isInitialized = useRef(false)

  // Get messages from scene conversation
  const messages = scene?.conversation || []

  // Initialize: Create scene from template on mount
  useEffect(() => {
    // Prevent double initialization (React StrictMode in dev runs effects twice)
    if (isInitialized.current) return
    isInitialized.current = true

    const initScene = async () => {
      try {
        const newScene = await api.createScene('My First Scene')
        setScene(newScene)
      } catch (error) {
        console.error('Failed to initialize scene:', error)
      }
    }
    initScene()
  }, [])

  const handlePromptSubmit = async (prompt: string) => {
    if (!scene) return

    // Clear snapshot view when submitting new prompt
    setViewingSnapshotId(null)
    setSnapshotFiles(null)
    setIsProcessing(true)

    // Optimistically add user message to UI
    const optimisticUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
      filesSnapshot: scene.files
    }
    setScene({
      ...scene,
      conversation: [...scene.conversation, optimisticUserMessage]
    })

    try {
      // Call AI API to process the prompt and modify files
      // Server will handle adding messages to conversation
      const result = await api.aiPrompt(scene.id, prompt)

      // Update scene with new files and conversation from server
      setScene(result.scene)
    } catch (error: any) {
      console.error('Failed to process prompt:', error)
      // Revert optimistic update and show error
      setScene(scene)
      alert(`Error: ${error.message || error}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileChange = async (path: string, content: string) => {
    if (!scene) return

    const updatedFiles = {
      ...scene.files,
      [path]: content
    }

    setScene({
      ...scene,
      files: updatedFiles
    })

    // Debounce the API call or save on demand
    // For now, just update local state
  }

  const handleBuild = async () => {
    if (!scene) return

    setIsBuilding(true)
    try {
      // First, save current files to server
      await api.updateScene(scene.id, scene.files)

      // Then build
      await api.buildScene(scene.id)

      alert('✅ Build successful! Scene compiled and ready.')
    } catch (error) {
      console.error('Build failed:', error)
      alert(`❌ Build failed: ${error}`)
    } finally {
      setIsBuilding(false)
    }
  }

  const handleResetConversation = async () => {
    if (!scene) return

    try {
      const result = await api.resetConversation(scene.id)
      setScene(result.scene)
      setViewingSnapshotId(null)
      setSnapshotFiles(null)
      alert('🔄 Conversation reset. Starting fresh!')
    } catch (error: any) {
      console.error('Reset failed:', error)
      alert(`❌ Reset failed: ${error.message || error}`)
    }
  }

  const handleViewSnapshot = async (messageId: string) => {
    if (!scene) return

    try {
      const result = await api.getSnapshot(scene.id, messageId)
      setSnapshotFiles(result.files)
      setViewingSnapshotId(messageId)
    } catch (error: any) {
      console.error('Failed to view snapshot:', error)
      alert(`❌ Failed to view snapshot: ${error.message || error}`)
    }
  }

  const handleRevertSnapshot = async (messageId: string) => {
    if (!scene) return

    try {
      const result = await api.revertToSnapshot(scene.id, messageId)
      setScene(result.scene)
      setViewingSnapshotId(null)
      setSnapshotFiles(null)
      alert(`🔄 ${result.message}`)
    } catch (error: any) {
      console.error('Failed to revert snapshot:', error)
      alert(`❌ Failed to revert: ${error.message || error}`)
    }
  }

  if (!scene) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#1e1e1e',
        color: '#d4d4d4',
        fontSize: '16px'
      }}>
        Loading scene...
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden'
    }}>
      {/* Left Panel - AI Prompts */}
      <div style={{ width: '400px', minWidth: '300px', maxWidth: '600px' }}>
        <PromptPanel
          messages={messages}
          onPromptSubmit={handlePromptSubmit}
          onResetConversation={handleResetConversation}
          onViewSnapshot={handleViewSnapshot}
          onRevertSnapshot={handleRevertSnapshot}
          isProcessing={isProcessing}
          viewingSnapshotId={viewingSnapshotId}
        />
      </div>

      {/* Right Panel - Editor */}
      <div style={{ flex: 1 }}>
        <EditorPanel
          sceneId={scene.id}
          files={snapshotFiles || scene.files}
          onFileChange={handleFileChange}
          onBuild={handleBuild}
          isBuilding={isBuilding}
          viewingSnapshotId={viewingSnapshotId}
        />
      </div>
    </div>
  )
}
