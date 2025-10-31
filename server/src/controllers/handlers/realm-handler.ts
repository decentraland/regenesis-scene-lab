import { IHttpServerComponent } from '@well-known-components/interfaces'
import { HandlerContextWithPath } from '../../types'

/**
 * Serves the /about endpoint for a scene realm
 * This tells Bevy Explorer where to find the scene entity and content
 *
 * Endpoint: GET /scenes/:sceneId/about
 */
export async function getRealmAboutHandler(
  context: HandlerContextWithPath<'sceneStorage' | 'logs', string>
): Promise<IHttpServerComponent.IResponse> {
  const {
    params,
    components: { sceneStorage, logs }
  } = context

  const logger = logs.getLogger('realm-about')

  try {
    let scene = await sceneStorage.getScene(params.sceneId)
    if (!scene) {
      return {
        status: 404,
        body: { error: 'Scene not found' }
      }
    }

    // Check if scene has been exported, if not, export it lazily
    if (!scene.export) {
      logger.info(`Lazy-exporting scene ${params.sceneId}`)
      const baseUrl = `http://localhost:3001/scenes/${params.sceneId}`
      scene = await sceneStorage.exportScene(params.sceneId, baseUrl)

      if (!scene.export) {
        logger.error(`Failed to export scene ${params.sceneId}`)
        return {
          status: 500,
          body: { error: 'Failed to export scene' }
        }
      }
    }

    logger.info(`Serving /about for scene ${params.sceneId}`)

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: scene.export.about
    }
  } catch (error: any) {
    logger.error('Realm about error:', error)
    return {
      status: 500,
      body: { error: error.message || 'Failed to get realm about' }
    }
  }
}

/**
 * Serves content files by hash
 * This is the content-addressable storage endpoint
 *
 * Endpoint: GET /scenes/:sceneId/:hash
 */
export async function getContentByHashHandler(
  context: HandlerContextWithPath<'sceneStorage' | 'logs', string>
): Promise<IHttpServerComponent.IResponse> {
  const {
    params,
    components: { sceneStorage, logs }
  } = context

  const logger = logs.getLogger('content-hash')

  try {
    let scene = await sceneStorage.getScene(params.sceneId)
    if (!scene) {
      return {
        status: 404,
        body: { error: 'Scene not found' }
      }
    }

    // Check if scene has been exported, if not, export it lazily
    if (!scene.export) {
      logger.info(`Lazy-exporting scene ${params.sceneId} for content request`)
      const baseUrl = `http://localhost:3001/scenes/${params.sceneId}`
      scene = await sceneStorage.exportScene(params.sceneId, baseUrl)

      if (!scene.export) {
        logger.error(`Failed to export scene ${params.sceneId}`)
        return {
          status: 500,
          body: { error: 'Failed to export scene' }
        }
      }
    }

    const hash = params.hash
    const fileContent = scene.export.hashedFiles.get(hash)

    if (!fileContent) {
      logger.warn(`Hash ${hash} not found in scene ${params.sceneId}`)
      return {
        status: 404,
        body: { error: 'Content not found' }
      }
    }

    // Determine content type based on content or default to octet-stream
    const contentType = getContentType(hash, fileContent)

    logger.info(`Serving content ${hash} for scene ${params.sceneId}`)

    return {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable' // Content-addressable = immutable
      },
      body: fileContent
    }
  } catch (error: any) {
    logger.error('Content serving error:', error)
    return {
      status: 500,
      body: { error: error.message || 'Failed to serve content' }
    }
  }
}

/**
 * Determines content type based on file content or hash
 * TODO: This is a simple heuristic, could be improved
 */
function getContentType(hash: string, content: Buffer): string {
  // Try to detect JSON
  const text = content.toString('utf-8', 0, Math.min(100, content.length))
  if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
    return 'application/json'
  }

  // Check for common extensions in content (TypeScript/JavaScript)
  if (text.includes('export') || text.includes('import') || text.includes('function')) {
    return 'application/javascript'
  }

  // Default to octet-stream for binary content
  return 'application/octet-stream'
}
