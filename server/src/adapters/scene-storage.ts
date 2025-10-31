import { Scene, SceneFiles, ConversationMessage } from '../types'
import { exportSceneInMemory } from '../logic/scene-export'

export type ISceneStorageComponent = {
  createFromTemplate(templateId: string, name: string): Promise<Scene>
  getScene(sceneId: string): Promise<Scene | null>
  updateScene(sceneId: string, files: SceneFiles): Promise<Scene>
  addConversationMessage(sceneId: string, message: ConversationMessage): Promise<Scene>
  resetConversation(sceneId: string): Promise<Scene>
  getMessageSnapshot(sceneId: string, messageId: string): Promise<SceneFiles>
  revertToSnapshot(sceneId: string, messageId: string): Promise<Scene>
  exportScene(sceneId: string, baseUrl: string): Promise<Scene>
  exportSnapshot(sceneId: string, messageId: string, baseUrl: string): Promise<Scene>
  deleteScene(sceneId: string): Promise<void>
  listScenes(): Promise<Scene[]>
}

const DEFAULT_TEMPLATE: SceneFiles = {
  'scene.json': JSON.stringify(
    {
      main: 'bin/index.js',
      runtimeVersion: '7',
      display: {
        title: 'My Scene',
        favicon: 'favicon_asset'
      },
      scene: {
        parcels: ['0,0'],
        base: '0,0'
      }
    },
    null,
    2
  ),
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
  'tsconfig.json': JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'node',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        jsx: 'react',
        jsxFactory: 'ReactEcs.createElement'
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'bin']
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
        snapshotExports: new Map(),
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

    async getMessageSnapshot(sceneId: string, messageId: string): Promise<SceneFiles> {
      const scene = scenes.get(sceneId)
      if (!scene) {
        throw new Error(`Scene ${sceneId} not found`)
      }

      const message = scene.conversation.find((msg) => msg.id === messageId)
      if (!message) {
        throw new Error(`Message ${messageId} not found in scene ${sceneId}`)
      }

      return { ...message.filesSnapshot }
    },

    async revertToSnapshot(sceneId: string, messageId: string): Promise<Scene> {
      const scene = scenes.get(sceneId)
      if (!scene) {
        throw new Error(`Scene ${sceneId} not found`)
      }

      const message = scene.conversation.find((msg) => msg.id === messageId)
      if (!message) {
        throw new Error(`Message ${messageId} not found in scene ${sceneId}`)
      }

      // Update scene files to match snapshot
      scene.files = { ...message.filesSnapshot }
      scene.updatedAt = new Date()
      scenes.set(sceneId, scene)

      return scene
    },

    async exportScene(sceneId: string, baseUrl: string): Promise<Scene> {
      const scene = scenes.get(sceneId)
      if (!scene) {
        throw new Error(`Scene ${sceneId} not found`)
      }

      // Build if no built files exist
      if (!scene.builtFiles) {
        const { buildScene } = await import('../logic/scene-build')
        const buildResult = await buildScene(sceneId, scene.files)

        if (!buildResult.success) {
          throw new Error(`Build failed: ${buildResult.stderr}`)
        }

        scene.builtFiles = buildResult.builtFiles
      }

      // Export scene in-memory (hash files, create entity, generate /about)
      // Use built files instead of source files
      const exported = await exportSceneInMemory(sceneId, scene.builtFiles, baseUrl)

      // Store export in scene
      scene.export = {
        entityId: exported.entityId,
        hashedFiles: exported.hashedFiles,
        about: exported.about
      }
      scene.updatedAt = new Date()
      scenes.set(sceneId, scene)

      return scene
    },

    async exportSnapshot(sceneId: string, messageId: string, baseUrl: string): Promise<Scene> {
      const scene = scenes.get(sceneId)
      if (!scene) {
        throw new Error(`Scene ${sceneId} not found`)
      }

      const message = scene.conversation.find((msg) => msg.id === messageId)
      if (!message) {
        throw new Error(`Message ${messageId} not found in scene ${sceneId}`)
      }

      // Export snapshot files in-memory
      const exported = await exportSceneInMemory(`${sceneId}-${messageId}`, message.filesSnapshot, baseUrl)

      // Store snapshot export
      scene.snapshotExports.set(messageId, {
        entityId: exported.entityId,
        hashedFiles: exported.hashedFiles,
        about: exported.about
      })
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
