/**
 * Scene build logic using @dcl/sdk-commands
 *
 * This module writes scene files to a temporary directory, runs the build,
 * and returns the built output files.
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { SceneFiles } from '../types'
import { symlinkNodeModules } from './build-workspace'
import { buildScene as sdkBuildScene } from '@dcl/sdk-commands/dist/commands/build'
import { initComponents } from '@dcl/sdk-commands/dist/components'

export interface BuildResult {
  success: boolean
  builtFiles: SceneFiles
  stdout: string
  stderr: string
}

/**
 * Builds a scene using @dcl/sdk-commands
 *
 * Process:
 * 1. Create temporary directory
 * 2. Write scene files to disk
 * 3. Symlink shared node_modules into temp directory
 * 4. Run `npx @dcl/sdk-commands build --skip-install`
 * 5. Read bin/index.js (bundled JavaScript)
 * 6. Copy assets (models, images, sounds, etc.) excluding .ts/.tsx files
 * 7. Clean up temp directory (symlink gets deleted, shared node_modules stays)
 *
 * @param sceneId - Scene identifier for logging
 * @param files - Scene source files (TypeScript + assets)
 * @returns Built files ready for export (bin/index.js + assets + scene.json)
 */
export async function buildScene(sceneId: string, files: SceneFiles): Promise<BuildResult> {
  let tempDir: string | null = null

  try {
    // Step 1: Create temporary directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `dcl-scene-${sceneId}-`))
    console.log(`[build] Created temp directory: ${tempDir}`)

    // Step 2: Write all scene files to temp directory
    for (const [filepath, content] of Object.entries(files)) {
      const normalizedPath = filepath.startsWith('/') ? filepath.slice(1) : filepath
      const fullPath = path.join(tempDir, normalizedPath)

      // Create parent directories if needed
      await fs.mkdir(path.dirname(fullPath), { recursive: true })
      await fs.writeFile(fullPath, content, 'utf-8')
    }

    console.log(`[build] Wrote ${Object.keys(files).length} files to ${tempDir}`)

    // Step 3: Create symlink to shared node_modules
    await symlinkNodeModules(tempDir)

    // Step 4: Run build using SDK directly
    console.log(`[build] Running build for scene ${sceneId}...`)

    // Initialize SDK components
    const components = await initComponents()

    // Parse scene.json to get scene config
    const sceneJsonContent = files['scene.json'] || files['/scene.json']
    if (!sceneJsonContent) {
      throw new Error('scene.json not found in files')
    }
    const sceneJson = JSON.parse(sceneJsonContent)

    // Call SDK buildScene directly
    await sdkBuildScene(
      {
        args: {
          '--skip-install': true,
          '--production': true,
          _: []
        },
        components
      },
      {
        kind: 'scene',
        workingDirectory: tempDir,
        scene: sceneJson
      }
    )

    console.log(`[build] Build completed for scene ${sceneId}`)

    // Step 5: Read built output from bin/index.js
    const indexJsPath = path.join(tempDir, 'bin', 'index.js')
    const builtFiles: SceneFiles = {}

    try {
      const indexJsContent = await fs.readFile(indexJsPath, 'utf-8')
      builtFiles['bin/index.js'] = indexJsContent
      console.log(`[build] Read bin/index.js (${indexJsContent.length} bytes)`)
    } catch (error) {
      console.error(`[build] Failed to read bin/index.js:`, error)
      throw new Error(`Build output not found at bin/index.js: ${error}`)
    }

    // Step 6: Copy assets (non-TypeScript files) to built files
    // These include models (.glb, .gltf), images (.png, .jpg), sounds (.mp3, .ogg), etc.
    const assetExtensions = ['.glb', '.gltf', '.png', '.jpg', '.jpeg', '.gif', '.mp3', '.ogg', '.wav', '.json']

    for (const [filepath, content] of Object.entries(files)) {
      const normalizedPath = filepath.startsWith('/') ? filepath.slice(1) : filepath
      const ext = path.extname(normalizedPath).toLowerCase()

      // Skip TypeScript/TSX files
      if (ext === '.ts' || ext === '.tsx') {
        continue
      }

      // Include scene.json (required)
      if (normalizedPath === 'scene.json') {
        builtFiles['scene.json'] = content
        continue
      }

      // Include asset files
      if (assetExtensions.includes(ext)) {
        builtFiles[normalizedPath] = content
        console.log(`[build] Included asset: ${normalizedPath}`)
      }
    }

    console.log(`[build] Final built files: ${Object.keys(builtFiles).length} files (bin/index.js + assets)`)

    return {
      success: true,
      builtFiles,
      stdout: 'Build completed successfully',
      stderr: ''
    }
  } catch (error: any) {
    console.error(`[build] Build failed for scene ${sceneId}:`, error)
    return {
      success: false,
      builtFiles: {},
      stdout: '',
      stderr: error.message || String(error)
    }
  } finally {
    // Step 5: Clean up temp directory
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true })
        console.log(`[build] Cleaned up temp directory: ${tempDir}`)
      } catch (error) {
        console.error(`[build] Failed to clean up temp directory ${tempDir}:`, error)
      }
    }
  }
}
