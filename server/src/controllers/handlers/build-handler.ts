import { IHttpServerComponent } from '@well-known-components/interfaces'
import { HandlerContextWithPath } from '../../types'
import { buildScene } from '../../logic/scene-build'

/**
 * Builds a scene using @dcl/sdk-commands
 * Takes TypeScript source files and compiles them to JavaScript
 *
 * Endpoint: POST /api/scenes/:sceneId/build
 */
export async function buildSceneHandler(
  context: HandlerContextWithPath<'sceneStorage' | 'logs', string>
): Promise<IHttpServerComponent.IResponse> {
  const {
    params,
    components: { sceneStorage, logs }
  } = context

  const logger = logs.getLogger('build-scene')

  try {
    const scene = await sceneStorage.getScene(params.sceneId)
    if (!scene) {
      return {
        status: 404,
        body: { error: 'Scene not found' }
      }
    }

    logger.info(`Building scene ${params.sceneId}...`)

    // Build the scene (TypeScript → JavaScript)
    const buildResult = await buildScene(params.sceneId, scene.files)

    if (!buildResult.success) {
      logger.error(`Build failed for scene ${params.sceneId}: ${buildResult.stderr}`)
      return {
        status: 500,
        body: {
          error: 'Build failed',
          stderr: buildResult.stderr,
          stdout: buildResult.stdout
        }
      }
    }

    // Store built files in scene for export
    scene.builtFiles = buildResult.builtFiles
    scene.updatedAt = new Date()
    await sceneStorage.updateScene(params.sceneId, scene.files) // This will trigger a save

    logger.info(`Build successful for scene ${params.sceneId}, stored ${Object.keys(buildResult.builtFiles).length} built files`)

    // Trigger export with built files (async, don't block response)
    const baseUrl = `http://localhost:3001/scenes/${params.sceneId}`
    sceneStorage.exportScene(params.sceneId, baseUrl).catch((error) => {
      logger.error(`Failed to export scene ${params.sceneId} after build:`, error)
    })

    return {
      status: 200,
      body: {
        success: true,
        message: 'Scene built successfully',
        fileCount: Object.keys(buildResult.builtFiles).length,
        stdout: buildResult.stdout
      }
    }
  } catch (error: any) {
    logger.error('Build scene error:', error)
    return {
      status: 500,
      body: { error: error.message || 'Failed to build scene' }
    }
  }
}
