/**
 * In-memory scene export logic
 *
 * This module replicates sdk-commands export-static functionality without requiring disk I/O.
 * It can be replaced with the official export-static command if we move to file-based storage.
 *
 * References:
 * - @dcl/sdk-commands/src/commands/export-static/index.ts
 * - @dcl/sdk-commands/src/logic/project-files.ts
 */

import { hashV1 } from '@dcl/hashing'
import { Entity, EntityType } from '@dcl/schemas'
import { SceneFiles } from '../types'

// AboutResponse type based on ADR-110 realm configuration
export interface AboutResponse {
  healthy: boolean
  acceptingUsers: boolean
  configurations: {
    networkId: number
    globalScenesUrn: string[]
    scenesUrn: string[]
    realmName: string
  }
  content: {
    healthy: boolean
    publicUrl: string
  }
  comms: {
    healthy: boolean
    protocol: string
    fixedAdapter: string
  }
  lambdas: {
    healthy: boolean
    publicUrl: string
  }
  bff: {
    healthy: boolean
    publicUrl: string
  }
}

export interface ExportedScene {
  entityId: string
  hashedFiles: Map<string, Buffer> // hash -> file content
  about: AboutResponse
}

/**
 * Normalizes a file path to Decentraland format:
 * - Converts Windows separators to Unix
 * - Converts to lowercase
 * - Removes leading slashes
 */
function normalizeFilePath(filepath: string): string {
  return filepath
    .replace(/\\/g, '/') // Windows to Unix
    .replace(/^\/+/, '') // Remove leading slashes
    .toLowerCase()
}

/**
 * Exports a scene in-memory without writing to disk
 *
 * Process:
 * 1. Hash each file using hashV1 (IPFS CIDv1)
 * 2. Create entity with content mappings
 * 3. Hash the entity to get entityId
 * 4. Create /about response with realm configuration
 *
 * @param sceneId - Unique scene identifier
 * @param files - Scene files (path -> content)
 * @param baseUrl - Public URL where this scene will be served (e.g., http://localhost:3001/scenes/scene_123)
 * @returns Exported scene with hashed files and about endpoint
 */
export async function exportSceneInMemory(
  sceneId: string,
  files: SceneFiles,
  baseUrl: string
): Promise<ExportedScene> {
  const contentMappings: Array<{ file: string; hash: string }> = []
  const hashedFiles = new Map<string, Buffer>()

  // Step 1: Hash each file and build content mappings
  for (const [filepath, content] of Object.entries(files)) {
    const normalizedPath = normalizeFilePath(filepath)
    const buffer = Buffer.from(content, 'utf-8')
    const uint8Array = new Uint8Array(buffer)
    const hash = await hashV1(uint8Array)

    hashedFiles.set(hash, buffer)
    contentMappings.push({ file: normalizedPath, hash })
  }

  // Step 2: Parse scene.json for metadata
  let sceneMetadata: any
  try {
    const sceneJsonContent = files['scene.json'] || files['/scene.json']
    if (!sceneJsonContent) {
      throw new Error('scene.json not found in scene files')
    }
    sceneMetadata = JSON.parse(sceneJsonContent)
  } catch (error) {
    throw new Error(`Failed to parse scene.json: ${error}`)
  }

  // Step 3: Create entity (without ID yet)
  const entity: Omit<Entity, 'id'> = {
    content: contentMappings,
    pointers: [], // Scenes don't need pointers for static export
    timestamp: Date.now(),
    type: EntityType.SCENE,
    metadata: sceneMetadata,
    version: 'v3'
  }

  // Step 4: Hash the entity to get entityId
  const entityBuffer = Buffer.from(JSON.stringify(entity), 'utf-8')
  const entityUint8Array = new Uint8Array(entityBuffer)
  const entityId = await hashV1(entityUint8Array)
  hashedFiles.set(entityId, entityBuffer)

  // Step 5: Create /about response (realm configuration)
  const about = createAboutResponse(sceneId, entityId, baseUrl)

  return {
    entityId,
    hashedFiles,
    about
  }
}

/**
 * Creates an AboutResponse for the realm
 * This tells Bevy Explorer where to find the scene and how to load it
 *
 * @param sceneId - Scene identifier
 * @param entityId - Hashed entity ID
 * @param baseUrl - Base URL for content serving
 * @returns AboutResponse conforming to ADR-110
 */
function createAboutResponse(sceneId: string, entityId: string, baseUrl: string): AboutResponse {
  // baseUrl should end with /contents/ (like worlds does)
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const contentFilesUrl = `${normalizedBaseUrl}/contents/`

  return {
    healthy: true,
    acceptingUsers: true,
    configurations: {
      networkId: 0,
      globalScenesUrn: [],
      scenesUrn: [`urn:decentraland:entity:${entityId}?=&baseUrl=${contentFilesUrl}`],
      realmName: `scene-lab-${sceneId}`
    },
    content: {
      healthy: true,
      publicUrl: 'https://peer.decentraland.org/content' // Use real catalyst for content-server APIs
    },
    comms: {
      healthy: true,
      protocol: 'v3',
      fixedAdapter: 'offline:offline' // No multiplayer for now
    },
    lambdas: {
      healthy: true,
      publicUrl: 'https://peer.decentraland.org/lambdas' // Use real catalyst for lambdas
    },
    bff: {
      healthy: false,
      publicUrl: '' // No BFF needed
    }
  }
}
