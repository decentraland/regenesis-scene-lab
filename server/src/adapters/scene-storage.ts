import { ISceneStorageComponent, Scene, SceneFiles, ConversationMessage } from '../types'

const DEFAULT_TEMPLATE: SceneFiles = {
  'package.json': JSON.stringify(
    {
      name: 'dcl-scene',
      version: '1.0.0',
      dependencies: {
        '@dcl/sdk': '^7.11.2'
      }
    },
    null,
    2
  ),
  '/src/index.ts': `import { engine, Transform, MeshRenderer, Material } from '@dcl/sdk/ecs'
import { Vector3, Color4 } from '@dcl/sdk/math'
import { setupUI } from './ui'

export function main() {
  // Create a red cube
  const cube = engine.addEntity()
  Transform.create(cube, {
    position: Vector3.create(8, 1, 8)
  })
  MeshRenderer.setBox(cube)
  Material.setPbrMaterial(cube, {
    albedoColor: Color4.create(1, 0, 0, 1)
  })

  // Setup UI
  setupUI()
}

// Export helper function for UI
export function getPlayerPosition() {
  return Vector3.create(8, 1, 8)
}
`,
  '/src/ui.tsx': `import ReactEcs, { ReactEcsRenderer, UiEntity, Label } from '@dcl/sdk/react-ecs'

export function setupUI() {
  ReactEcsRenderer.setUiRenderer(() => (
    <UiEntity
      uiTransform={{
        width: 200,
        height: 50,
        position: { top: 20, left: 20 }
      }}
    >
      <Label
        value="Welcome to Decentraland!"
        fontSize={18}
        color={{ r: 1, g: 1, b: 1, a: 1 }}
      />
    </UiEntity>
  ))
}
`
}

export function createSceneStorageComponent(): ISceneStorageComponent {
  const scenes = new Map<string, Scene>()
  const templates = new Map<string, SceneFiles>()

  // Register default template
  templates.set('default', DEFAULT_TEMPLATE)

  function generateId(): string {
    return `scene_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  return {
    async createFromTemplate(templateId: string, name: string): Promise<Scene> {
      const template = templates.get(templateId)
      if (!template) {
        throw new Error(`Template ${templateId} not found`)
      }

      const scene: Scene = {
        id: generateId(),
        name,
        files: { ...template },
        conversation: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      scenes.set(scene.id, scene)
      return scene
    },

    async getScene(sceneId: string): Promise<Scene | null> {
      return scenes.get(sceneId) || null
    },

    async updateScene(sceneId: string, files: SceneFiles): Promise<Scene> {
      const scene = scenes.get(sceneId)
      if (!scene) {
        throw new Error(`Scene ${sceneId} not found`)
      }

      scene.files = files
      scene.updatedAt = new Date()
      scenes.set(sceneId, scene)
      return scene
    },

    async addConversationMessage(sceneId: string, message: ConversationMessage): Promise<Scene> {
      const scene = scenes.get(sceneId)
      if (!scene) {
        throw new Error(`Scene ${sceneId} not found`)
      }

      scene.conversation.push(message)
      scene.updatedAt = new Date()
      scenes.set(sceneId, scene)
      return scene
    },

    async resetConversation(sceneId: string): Promise<Scene> {
      const scene = scenes.get(sceneId)
      if (!scene) {
        throw new Error(`Scene ${sceneId} not found`)
      }

      scene.conversation = []
      scene.updatedAt = new Date()
      scenes.set(sceneId, scene)
      return scene
    },

    async getMessageSnapshot(sceneId: string, messageIndex: number): Promise<SceneFiles> {
      const scene = scenes.get(sceneId)
      if (!scene) {
        throw new Error(`Scene ${sceneId} not found`)
      }

      if (messageIndex < 0 || messageIndex >= scene.conversation.length) {
        throw new Error(`Message index ${messageIndex} out of bounds`)
      }

      return { ...scene.conversation[messageIndex].filesSnapshot }
    },

    async revertToSnapshot(sceneId: string, messageIndex: number): Promise<Scene> {
      const scene = scenes.get(sceneId)
      if (!scene) {
        throw new Error(`Scene ${sceneId} not found`)
      }

      if (messageIndex < 0 || messageIndex >= scene.conversation.length) {
        throw new Error(`Message index ${messageIndex} out of bounds`)
      }

      // Get the snapshot files
      const snapshotFiles = scene.conversation[messageIndex].filesSnapshot

      // Update scene files to match snapshot
      scene.files = { ...snapshotFiles }
      scene.updatedAt = new Date()
      scenes.set(sceneId, scene)

      return scene
    },

    async deleteScene(sceneId: string): Promise<void> {
      scenes.delete(sceneId)
    },

    async listScenes(): Promise<Scene[]> {
      return Array.from(scenes.values())
    }
  }
}
