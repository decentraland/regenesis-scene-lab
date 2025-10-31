import { IHttpServerComponent } from '@well-known-components/interfaces'
import { HandlerContextWithPath } from '../../types'

/**
 * Serves the /about endpoint for a snapshot realm
 * Lazily exports the snapshot if not already exported
 *
 * Endpoint: GET /scenes/:sceneId/snapshots/:messageId/about
 */
export async function getSnapshotRealmAboutHandler(
  context: HandlerContextWithPath<'sceneStorage' | 'logs', string>
): Promise<IHttpServerComponent.IResponse> {
  const {
    params,
    components: { sceneStorage, logs }
  } = context

  const logger = logs.getLogger('snapshot-realm-about')

  try {
    const scene = await sceneStorage.getScene(params.sceneId)
    if (!scene) {
      return {
        status: 404,
        body: { error: 'Scene not found' }
      }
    }

    const messageId = params.messageId
    if (!messageId) {
      return {
        status: 400,
        body: { error: 'Message ID is required' }
      }
    }

    // Check if snapshot export exists, if not, export it lazily
    let snapshotExport = scene.snapshotExports.get(messageId)
    if (!snapshotExport) {
      logger.info(`Lazy-exporting snapshot ${messageId} for scene ${params.sceneId}`)
      const baseUrl = `http://localhost:3001/scenes/${params.sceneId}/snapshots/${messageId}`
      await sceneStorage.exportSnapshot(params.sceneId, messageId, baseUrl)

      // Re-fetch scene to get updated export
      const updatedScene = await sceneStorage.getScene(params.sceneId)
      snapshotExport = updatedScene?.snapshotExports.get(messageId)

      if (!snapshotExport) {
        return {
          status: 500,
          body: { error: 'Failed to export snapshot' }
        }
      }
    }

    logger.info(`Serving /about for snapshot ${messageId} of scene ${params.sceneId}`)

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600' // Snapshots are immutable
      },
      body: snapshotExport.about
    }
  } catch (error: any) {
    logger.error('Snapshot realm about error:', error)
    return {
      status: 500,
      body: { error: error.message || 'Failed to get snapshot realm about' }
    }
  }
}

/**
 * Serves content files by hash for a snapshot
 *
 * Endpoint: GET /scenes/:sceneId/snapshots/:messageId/:hash
 */
export async function getSnapshotContentByHashHandler(
  context: HandlerContextWithPath<'sceneStorage' | 'logs', string>
): Promise<IHttpServerComponent.IResponse> {
  const {
    params,
    components: { sceneStorage, logs }
  } = context

  const logger = logs.getLogger('snapshot-content-hash')

  try {
    const scene = await sceneStorage.getScene(params.sceneId)
    if (!scene) {
      return {
        status: 404,
        body: { error: 'Scene not found' }
      }
    }

    const messageId = params.messageId
    const snapshotExport = scene.snapshotExports.get(messageId)

    if (!snapshotExport) {
      return {
        status: 404,
        body: { error: 'Snapshot not exported yet' }
      }
    }

    const hash = params.hash
    const fileContent = snapshotExport.hashedFiles.get(hash)

    if (!fileContent) {
      logger.warn(`Hash ${hash} not found in snapshot ${messageId} of scene ${params.sceneId}`)
      return {
        status: 404,
        body: { error: 'Content not found' }
      }
    }

    const contentType = getContentType(hash, fileContent)

    logger.info(`Serving snapshot content ${hash} for snapshot ${messageId} of scene ${params.sceneId}`)

    return {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable' // Content-addressable = immutable
      },
      body: fileContent
    }
  } catch (error: any) {
    logger.error('Snapshot content serving error:', error)
    return {
      status: 500,
      body: { error: error.message || 'Failed to serve snapshot content' }
    }
  }
}

function getContentType(hash: string, content: Buffer): string {
  const text = content.toString('utf-8', 0, Math.min(100, content.length))
  if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
    return 'application/json'
  }
  if (text.includes('export') || text.includes('import') || text.includes('function')) {
    return 'application/javascript'
  }
  return 'application/octet-stream'
}
