import { useEffect, useState } from 'react'
import { PromptPanel } from './PromptPanel'
import { EditorPanel } from './EditorPanel'
import { api } from './api'
import { Scene, Message, SceneFiles } from './types'

export function App() {
  const [scene, setScene] = useState<Scene | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isBuilding, setIsBuilding] = useState(false)
  const [viewingSnapshotIndex, setViewingSnapshotIndex] = useState<number | null>(null)
  const [snapshotFiles, setSnapshotFiles] = useState<SceneFiles | null>(null)

  // Initialize: Create scene from template on mount
  useEffect(() => {
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
    setViewingSnapshotIndex(null)
    setSnapshotFiles(null)

    // Calculate message indices (user message will be next index, AI message will be next + 1)
    const nextIndex = messages.length

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
      timestamp: new Date(),
      messageIndex: nextIndex
    }
    setMessages((prev) => [...prev, userMessage])
    setIsProcessing(true)

    try {
      // Call AI API to process the prompt and modify files
      const result = await api.aiPrompt(scene.id, prompt)

      // Update scene with AI-modified files
      setScene(result.scene)

      // Add AI response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.explanation,
        timestamp: new Date(),
        messageIndex: nextIndex + 1
      }
      setMessages((prev) => [...prev, aiMessage])
    } catch (error: any) {
      console.error('Failed to process prompt:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Error: ${error.message || error}`,
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, errorMessage])
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

      const buildMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ Build successful! Scene compiled and ready.`,
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, buildMessage])
    } catch (error) {
      console.error('Build failed:', error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Build failed: ${error}`,
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsBuilding(false)
    }
  }

  const handleResetConversation = async () => {
    if (!scene) return

    try {
      const result = await api.resetConversation(scene.id)
      setScene(result.scene)
      setMessages([])
      setViewingSnapshotIndex(null)
      setSnapshotFiles(null)

      const resetMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '🔄 Conversation reset. Starting fresh!',
        timestamp: new Date()
      }
      setMessages([resetMessage])
    } catch (error: any) {
      console.error('Reset failed:', error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Reset failed: ${error.message || error}`,
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, errorMessage])
    }
  }

  const handleViewSnapshot = async (messageIndex: number) => {
    if (!scene) return

    try {
      const result = await api.getSnapshot(scene.id, messageIndex)
      setSnapshotFiles(result.files)
      setViewingSnapshotIndex(messageIndex)
    } catch (error: any) {
      console.error('Failed to view snapshot:', error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Failed to view snapshot: ${error.message || error}`,
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, errorMessage])
    }
  }

  const handleRevertSnapshot = async (messageIndex: number) => {
    if (!scene) return

    try {
      const result = await api.revertToSnapshot(scene.id, messageIndex)
      setScene(result.scene)
      setViewingSnapshotIndex(null)
      setSnapshotFiles(null)

      const revertMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `🔄 ${result.message}`,
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, revertMessage])
    } catch (error: any) {
      console.error('Failed to revert snapshot:', error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Failed to revert: ${error.message || error}`,
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, errorMessage])
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
          viewingSnapshotIndex={viewingSnapshotIndex}
        />
      </div>

      {/* Right Panel - Editor */}
      <div style={{ flex: 1 }}>
        <EditorPanel
          files={snapshotFiles || scene.files}
          onFileChange={handleFileChange}
          onBuild={handleBuild}
          isBuilding={isBuilding}
        />
      </div>
    </div>
  )
}
