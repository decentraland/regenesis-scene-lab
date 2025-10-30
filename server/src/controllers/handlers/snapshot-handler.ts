import { IHttpServerComponent } from '@well-known-components/interfaces'
import { AppComponents, HandlerContextWithPath } from '../../types'

export async function getSnapshotHandler(
  context: HandlerContextWithPath<'sceneStorage' | 'logs', string>
): Promise<IHttpServerComponent.IResponse> {
  const {
    params,
    components: { sceneStorage, logs }
  } = context

  const logger = logs.getLogger('get-snapshot')

  try {
    const messageIndex = parseInt(params.messageIndex, 10)

    if (isNaN(messageIndex)) {
      return {
        status: 400,
        body: { error: 'Invalid message index' }
      }
    }

    const files = await sceneStorage.getMessageSnapshot(params.sceneId, messageIndex)

    logger.info(`Retrieved snapshot ${messageIndex} for scene ${params.sceneId}`)

    return {
      status: 200,
      body: { files }
    }
  } catch (error: any) {
    logger.error('Get snapshot error:', error)
    return {
      status: 500,
      body: { error: error.message || 'Failed to get snapshot' }
    }
  }
}

export async function revertSnapshotHandler(
  context: HandlerContextWithPath<'sceneStorage' | 'logs', string>
): Promise<IHttpServerComponent.IResponse> {
  const {
    params,
    components: { sceneStorage, logs }
  } = context

  const logger = logs.getLogger('revert-snapshot')

  try {
    const messageIndex = parseInt(params.messageIndex, 10)

    if (isNaN(messageIndex)) {
      return {
        status: 400,
        body: { error: 'Invalid message index' }
      }
    }

    const scene = await sceneStorage.revertToSnapshot(params.sceneId, messageIndex)

    logger.info(`Reverted scene ${params.sceneId} to snapshot ${messageIndex}`)

    return {
      status: 200,
      body: {
        scene,
        message: `Reverted to snapshot ${messageIndex}`
      }
    }
  } catch (error: any) {
    logger.error('Revert snapshot error:', error)
    return {
      status: 500,
      body: { error: error.message || 'Failed to revert snapshot' }
    }
  }
}
