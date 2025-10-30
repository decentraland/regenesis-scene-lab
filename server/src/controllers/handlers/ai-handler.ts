import { IHttpServerComponent } from '@well-known-components/interfaces'
import { AppComponents, HandlerContextWithPath } from '../../types'

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

    // Generate modifications using AI service with conversation history BEFORE adding user message
    // This ensures first message is detected correctly and avoids duplicate messages
    const result = await aiService.generateSceneModification(
      prompt,
      scene.files,
      scene.conversation
    )

    // Add user message to conversation with snapshot of files BEFORE modification
    const userMessage = {
      role: 'user' as const,
      content: prompt,
      timestamp: new Date(),
      filesSnapshot: { ...scene.files }
    }
    await sceneStorage.addConversationMessage(params.sceneId, userMessage)

    // Merge AI-modified files with existing files (preserve unmodified files)
    const mergedFiles = {
      ...scene.files,  // Start with existing files
      ...result.files  // Overwrite only the files AI modified
    }

    // Add assistant response to conversation with snapshot of merged files
    const assistantMessage = {
      role: 'assistant' as const,
      content: result.explanation,
      timestamp: new Date(),
      filesSnapshot: { ...mergedFiles }
    }
    await sceneStorage.addConversationMessage(params.sceneId, assistantMessage)

    // Update scene with merged files
    const updatedScene = await sceneStorage.updateScene(params.sceneId, mergedFiles)

    logger.info(`AI successfully modified scene ${params.sceneId}`)

    return {
      status: 200,
      body: {
        scene: updatedScene,
        explanation: result.explanation
      }
    }
  } catch (error: any) {
    logger.error('AI prompt error:', error)
    return {
      status: 500,
      body: { error: error.message || 'AI prompt failed' }
    }
  }
}
