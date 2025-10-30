import { IHttpServerComponent } from '@well-known-components/interfaces'
import { AppComponents, HandlerContextWithPath } from '../../types'

export async function resetConversationHandler(
  context: HandlerContextWithPath<'sceneStorage' | 'logs', string>
): Promise<IHttpServerComponent.IResponse> {
  const {
    params,
    components: { sceneStorage, logs }
  } = context

  const logger = logs.getLogger('reset-conversation')

  try {
    const scene = await sceneStorage.getScene(params.sceneId)
    if (!scene) {
      return {
        status: 404,
        body: { error: 'Scene not found' }
      }
    }

    const updatedScene = await sceneStorage.resetConversation(params.sceneId)
    logger.info(`Conversation reset for scene ${params.sceneId}`)

    return {
      status: 200,
      body: {
        scene: updatedScene,
        message: 'Conversation reset successfully'
      }
    }
  } catch (error: any) {
    logger.error('Reset conversation error:', error)
    return {
      status: 500,
      body: { error: error.message || 'Failed to reset conversation' }
    }
  }
}
