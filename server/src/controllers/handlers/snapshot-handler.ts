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
    const messageId = params.messageId

    if (!messageId) {
      return {
        status: 400,
        body: { error: 'Message ID is required' }
      }
    }

    const files = await sceneStorage.getMessageSnapshot(params.sceneId, messageId)

    logger.info(`Retrieved snapshot ${messageId} for scene ${params.sceneId}`)

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
    const messageId = params.messageId

    if (!messageId) {
      return {
        status: 400,
        body: { error: 'Message ID is required' }
      }
    }

    const scene = await sceneStorage.revertToSnapshot(params.sceneId, messageId)

    logger.info(`Reverted scene ${params.sceneId} to snapshot ${messageId}`)

    return {
      status: 200,
      body: {
        scene,
        message: `Reverted to snapshot ${messageId}`
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
