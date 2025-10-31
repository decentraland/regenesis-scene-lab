import { SceneFiles, AppComponents, HandlerContextWithPath } from '../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'

// Create scene from template
export async function createSceneHandler(
  context: HandlerContextWithPath<'sceneStorage' | 'logs', '/api/scenes'>
): Promise<IHttpServerComponent.IResponse> {
  const {
    request,
    components: { sceneStorage, logs }
  } = context

  const logger = logs.getLogger('create-scene')

  try {
    const body = await request.json()
    const { templateId = 'default', name = 'My Scene' } = body as { templateId?: string; name?: string }

    const scene = await sceneStorage.createFromTemplate(templateId, name)
    logger.info(`Created scene ${scene.id} from template ${templateId}`)

    // Export scene for Bevy preview (async, don't block response)
    const baseUrl = `http://localhost:3001/scenes/${scene.id}`
    sceneStorage.exportScene(scene.id, baseUrl).catch((error) => {
      logger.error(`Failed to export scene ${scene.id}:`, error)
    })

    return {
      status: 200,
      body: scene
    }
  } catch (error: any) {
    logger.error('Error creating scene:', error)
    return {
      status: 500,
      body: { error: error.message }
    }
  }
}

// Get scene by ID
export async function getSceneHandler(
  context: HandlerContextWithPath<'sceneStorage' | 'logs', string>
): Promise<IHttpServerComponent.IResponse> {
  const {
    params,
    components: { sceneStorage, logs }
  } = context

  const logger = logs.getLogger('get-scene')

  try {
    const scene = await sceneStorage.getScene(params.sceneId)

    if (!scene) {
      return {
        status: 404,
        body: { error: 'Scene not found' }
      }
    }

    return {
      status: 200,
      body: scene
    }
  } catch (error: any) {
    logger.error('Error getting scene:', error)
    return {
      status: 500,
      body: { error: error.message }
    }
  }
}

// Update scene files
export async function updateSceneHandler(
  context: HandlerContextWithPath<'sceneStorage' | 'logs', string>
): Promise<IHttpServerComponent.IResponse> {
  const {
    params,
    request,
    components: { sceneStorage, logs }
  } = context

  const logger = logs.getLogger('update-scene')

  try {
    const body = await request.json()
    const { files } = body as { files: SceneFiles }

    const scene = await sceneStorage.updateScene(params.sceneId, files)
    logger.info(`Updated scene ${params.sceneId}`)

    return {
      status: 200,
      body: scene
    }
  } catch (error: any) {
    logger.error('Error updating scene:', error)
    return {
      status: 500,
      body: { error: error.message }
    }
  }
}

// List all scenes
export async function listScenesHandler(
  context: HandlerContextWithPath<'sceneStorage' | 'logs', string>
): Promise<IHttpServerComponent.IResponse> {
  const {
    components: { sceneStorage, logs }
  } = context

  const logger = logs.getLogger('list-scenes')

  try {
    const scenes = await sceneStorage.listScenes()
    return {
      status: 200,
      body: scenes
    }
  } catch (error: any) {
    logger.error('Error listing scenes:', error)
    return {
      status: 500,
      body: { error: error.message }
    }
  }
}
