import { Scene, SceneFiles } from './types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export const api = {
  async createScene(name: string = 'My Scene'): Promise<Scene> {
    const response = await fetch(`${API_URL}/api/scenes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, templateId: 'default' })
    })
    if (!response.ok) throw new Error('Failed to create scene')
    return response.json()
  },

  async getScene(sceneId: string): Promise<Scene> {
    const response = await fetch(`${API_URL}/api/scenes/${sceneId}`)
    if (!response.ok) throw new Error('Failed to get scene')
    return response.json()
  },

  async updateScene(sceneId: string, files: SceneFiles): Promise<Scene> {
    const response = await fetch(`${API_URL}/api/scenes/${sceneId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files })
    })
    if (!response.ok) throw new Error('Failed to update scene')
    return response.json()
  },

  async buildScene(sceneId: string): Promise<{ success: boolean; bundledCode: string; stdout: string }> {
    const response = await fetch(`${API_URL}/api/scenes/${sceneId}/build`, {
      method: 'POST'
    })
    if (!response.ok) throw new Error('Failed to build scene')
    return response.json()
  },

  async aiPrompt(sceneId: string, prompt: string): Promise<{ scene: Scene; explanation: string }> {
    const response = await fetch(`${API_URL}/api/scenes/${sceneId}/ai-prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'AI prompt failed')
    }
    return response.json()
  },

  async resetConversation(sceneId: string): Promise<{ scene: Scene; message: string }> {
    const response = await fetch(`${API_URL}/api/scenes/${sceneId}/reset-conversation`, {
      method: 'POST'
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Reset conversation failed')
    }
    return response.json()
  },

  async getSnapshot(sceneId: string, messageIndex: number): Promise<{ files: SceneFiles }> {
    const response = await fetch(`${API_URL}/api/scenes/${sceneId}/snapshot/${messageIndex}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get snapshot')
    }
    return response.json()
  },

  async revertToSnapshot(sceneId: string, messageIndex: number): Promise<{ scene: Scene; message: string }> {
    const response = await fetch(`${API_URL}/api/scenes/${sceneId}/revert/${messageIndex}`, {
      method: 'POST'
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to revert snapshot')
    }
    return response.json()
  }
}
