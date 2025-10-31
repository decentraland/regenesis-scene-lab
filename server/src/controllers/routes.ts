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
import { getRealmAboutHandler, getContentByHashHandler } from './handlers/realm-handler'
import { getSnapshotRealmAboutHandler, getSnapshotContentByHashHandler } from './handlers/realm-snapshot-handler'
import { buildSceneHandler } from './handlers/build-handler'

// We return the entire router because it will be easier to test than a whole server
export async function setupRouter(globalContext: GlobalContext): Promise<Router<GlobalContext>> {
  const router = new Router<GlobalContext>()

  router.get('/ping', pingHandler)

  // Scene routes
  router.post('/api/scenes', createSceneHandler)
  router.get('/api/scenes', listScenesHandler)
  router.get('/api/scenes/:sceneId', getSceneHandler)
  router.put('/api/scenes/:sceneId', updateSceneHandler)
  router.post('/api/scenes/:sceneId/build', buildSceneHandler)

  // AI routes
  router.post('/api/scenes/:sceneId/ai-prompt', aiPromptHandler)
  router.post('/api/scenes/:sceneId/reset-conversation', resetConversationHandler)

  // Snapshot routes (using messageId now)
  router.get('/api/scenes/:sceneId/snapshot/:messageId', getSnapshotHandler)
  router.post('/api/scenes/:sceneId/revert/:messageId', revertSnapshotHandler)

  // Realm content-server endpoints (for Bevy Explorer)
  // Current scene realm
  router.get('/scenes/:sceneId/about', getRealmAboutHandler)

  // Snapshot realm (for viewing historical snapshots)
  router.get('/scenes/:sceneId/snapshots/:messageId/about', getSnapshotRealmAboutHandler)
  router.get('/scenes/:sceneId/snapshots/:messageId/contents/:hash', getSnapshotContentByHashHandler)

  // Content by hash - /contents/:hash (matches Worlds pattern)
  router.get('/scenes/:sceneId/contents/:hash', getContentByHashHandler)

  // Bevy Explorer static files (catch-all route)
  router.get('/bevy-explorer/:path*', bevyExplorerHandler)

  // Note: We don't need catch-all proxy routes anymore
  // Bevy will fetch content-server APIs directly from peer.decentraland.org/content
  // We only serve our own content files by hash above

  return router
}
