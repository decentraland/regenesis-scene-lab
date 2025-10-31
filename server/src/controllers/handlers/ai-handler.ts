import { IHttpServerComponent } from '@well-known-components/interfaces'
import { AppComponents, HandlerContextWithPath } from '../../types'
import { buildScene } from '../../logic/scene-build'

const MAX_BUILD_RETRIES = 2

export async function aiPromptHandler(
  context: HandlerContextWithPath<'sceneStorage' | 'logs' | 'aiService', string>
): Promise<IHttpServerComponent.IResponse> {
  const {
    params,
    request,
    components: { sceneStorage, logs, aiService }
  } = context

  const logger = logs.getLogger('ai-prompt')

  try {
    const body = await request.json()
    const { prompt } = body as { prompt: string }

    if (!prompt || !prompt.trim()) {
      return {
        status: 400,
        body: { error: 'Prompt is required' }
      }
    }

    // Get current scene
    const scene = await sceneStorage.getScene(params.sceneId)
    if (!scene) {
      return {
        status: 404,
        body: { error: 'Scene not found' }
      }
    }

    logger.info(`AI prompt for scene ${params.sceneId}: "${prompt}"`)

    // Retry loop for build validation
    let currentPrompt = prompt
    let retryCount = 0
    let buildError: string | null = null

    while (retryCount <= MAX_BUILD_RETRIES) {
      // Generate modifications using AI service with conversation history
      const result = await aiService.generateSceneModification(
        currentPrompt,
        scene.files,
        scene.conversation
      )

      // Merge AI-modified files with existing files (preserve unmodified files)
      const mergedFiles = {
        ...scene.files,  // Start with existing files
        ...result.files  // Overwrite only the files AI modified
      }

      // Try to build the modified scene
      logger.info(`Building scene ${params.sceneId} (attempt ${retryCount + 1}/${MAX_BUILD_RETRIES + 1})`)
      const buildResult = await buildScene(params.sceneId, mergedFiles)

      if (buildResult.success) {
        // Build succeeded! Save everything
        logger.info(`✓ Build succeeded for scene ${params.sceneId}`)

        // Generate unique IDs for messages
        const userMessageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
        const assistantMessageId = `msg_${Date.now() + 1}_${Math.random().toString(36).substring(2, 11)}`

        // Add user message to conversation with snapshot of files BEFORE modification
        // Always use original prompt, not the retry prompt with errors
        const userMessage = {
          id: userMessageId,
          role: 'user' as const,
          content: prompt,
          timestamp: new Date(),
          filesSnapshot: { ...scene.files }
        }
        await sceneStorage.addConversationMessage(params.sceneId, userMessage)

        // Add assistant response to conversation with snapshot of merged files
        const assistantMessage = {
          id: assistantMessageId,
          role: 'assistant' as const,
          content: result.explanation,
          timestamp: new Date(),
          filesSnapshot: { ...mergedFiles }
        }
        await sceneStorage.addConversationMessage(params.sceneId, assistantMessage)

        // Update scene with merged files and built files
        const updatedScene = await sceneStorage.updateScene(params.sceneId, mergedFiles)
        updatedScene.builtFiles = buildResult.builtFiles

        // Export scene for Bevy preview (async, don't block response)
        const baseUrl = `http://localhost:3001/scenes/${params.sceneId}`
        sceneStorage.exportScene(params.sceneId, baseUrl).catch((error) => {
          logger.error(`Failed to export scene ${params.sceneId}:`, error)
        })

        logger.info(`AI successfully modified scene ${params.sceneId}`)

        return {
          status: 200,
          body: {
            scene: updatedScene,
            explanation: result.explanation,
            buildRetries: retryCount
          }
        }
      } else {
        // Build failed
        buildError = buildResult.stderr
        logger.warn(`✗ Build failed for scene ${params.sceneId} (attempt ${retryCount + 1}): ${buildError}`)

        if (retryCount < MAX_BUILD_RETRIES) {
          // Retry with error feedback
          currentPrompt = `The previous changes caused TypeScript build errors. Please fix them.

Build errors:
${buildError}

Original request: ${prompt}

Please fix ONLY the TypeScript errors while keeping the original intent of the changes.`
          retryCount++
          logger.info(`Retrying with error feedback (attempt ${retryCount + 1}/${MAX_BUILD_RETRIES + 1})`)
        } else {
          // Max retries reached, save the files anyway but return build error
          logger.error(`Max retries reached for scene ${params.sceneId}, saving files with build errors`)

          // Generate unique IDs for messages
          const userMessageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
          const assistantMessageId = `msg_${Date.now() + 1}_${Math.random().toString(36).substring(2, 11)}`

          // Add user message
          const userMessage = {
            id: userMessageId,
            role: 'user' as const,
            content: prompt,
            timestamp: new Date(),
            filesSnapshot: { ...scene.files }
          }
          await sceneStorage.addConversationMessage(params.sceneId, userMessage)

          // Add assistant response with warning about build errors
          const assistantMessage = {
            id: assistantMessageId,
            role: 'assistant' as const,
            content: `${result.explanation}\n\n⚠️ Warning: The changes have TypeScript errors and may not build correctly.`,
            timestamp: new Date(),
            filesSnapshot: { ...mergedFiles }
          }
          await sceneStorage.addConversationMessage(params.sceneId, assistantMessage)

          // Update scene with files (but no built files since build failed)
          const updatedScene = await sceneStorage.updateScene(params.sceneId, mergedFiles)
          updatedScene.builtFiles = undefined

          return {
            status: 200, // Return 200 so client gets the files
            body: {
              scene: updatedScene,
              explanation: `${result.explanation}\n\n⚠️ Warning: Build failed after ${retryCount} retries. The code has TypeScript errors.`,
              buildError: buildError,
              buildRetries: retryCount,
              buildFailed: true
            }
          }
        }
      }
    }

    // Should never reach here, but just in case
    return {
      status: 500,
      body: { error: 'Unexpected error in build retry loop' }
    }
  } catch (error: any) {
    logger.error('AI prompt error:', error)
    return {
      status: 500,
      body: { error: error.message || 'AI prompt failed' }
    }
  }
}
