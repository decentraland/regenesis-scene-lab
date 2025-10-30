import { Router } from '@well-known-components/http-server'
import { GlobalContext } from '../types'
import { pingHandler } from './handlers/ping-handler'
import {
  createSceneHandler,
  getSceneHandler,
  updateSceneHandler,
  listScenesHandler
} from './handlers/scenes-handler'
import { aiPromptHandler } from './handlers/ai-handler'
import { resetConversationHandler } from './handlers/reset-conversation-handler'
import { getSnapshotHandler, revertSnapshotHandler } from './handlers/snapshot-handler'
import { bevyExplorerHandler } from './handlers/bevy-explorer-handler'

// We return the entire router because it will be easier to test than a whole server
export async function setupRouter(globalContext: GlobalContext): Promise<Router<GlobalContext>> {
  const router = new Router<GlobalContext>()

  router.get('/ping', pingHandler)

  // Scene routes
  router.post('/api/scenes', createSceneHandler)
  router.get('/api/scenes', listScenesHandler)
  router.get('/api/scenes/:sceneId', getSceneHandler)
  router.put('/api/scenes/:sceneId', updateSceneHandler)

  // AI routes
  router.post('/api/scenes/:sceneId/ai-prompt', aiPromptHandler)
  router.post('/api/scenes/:sceneId/reset-conversation', resetConversationHandler)

  // Snapshot routes
  router.get('/api/scenes/:sceneId/snapshot/:messageIndex', getSnapshotHandler)
  router.post('/api/scenes/:sceneId/revert/:messageIndex', revertSnapshotHandler)

  // Bevy Explorer static files (catch-all route)
  router.get('/bevy-explorer/:path*', bevyExplorerHandler)

  return router
}
