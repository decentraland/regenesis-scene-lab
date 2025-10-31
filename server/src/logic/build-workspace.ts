/**
 * Build workspace manager
 *
 * Creates and manages a persistent build workspace with pre-installed node_modules
 * that can be symlinked into temporary build directories for fast, isolated builds.
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

let workspaceDir: string | null = null
let nodeModulesPath: string | null = null

/**
 * Package.json for the shared build workspace
 */
const WORKSPACE_PACKAGE_JSON = {
  name: 'dcl-scene-lab-build-workspace',
  version: '1.0.0',
  private: true,
  dependencies: {
    '@dcl/sdk': '^7.0.0',
    '@dcl/ecs': '^7.0.0'
  }
}

/**
 * Initializes the shared build workspace
 * This should be called once on server startup
 *
 * Creates:
 * - ~/.dcl-scene-lab/build-workspace/
 * - package.json with SDK dependencies
 * - node_modules/ with installed dependencies
 *
 * @returns Path to the node_modules directory
 */
export async function initializeBuildWorkspace(): Promise<string> {
  if (nodeModulesPath) {
    console.log(`[build-workspace] Already initialized at ${nodeModulesPath}`)
    return nodeModulesPath
  }

  try {
    // Create workspace directory in user's home
    const homeDir = os.homedir()
    workspaceDir = path.join(homeDir, '.dcl-scene-lab', 'build-workspace')

    console.log(`[build-workspace] Creating workspace at ${workspaceDir}`)
    await fs.mkdir(workspaceDir, { recursive: true })

    // Write package.json
    const packageJsonPath = path.join(workspaceDir, 'package.json')
    await fs.writeFile(
      packageJsonPath,
      JSON.stringify(WORKSPACE_PACKAGE_JSON, null, 2),
      'utf-8'
    )
    console.log(`[build-workspace] Wrote package.json`)

    // Check if node_modules already exists (from previous run)
    nodeModulesPath = path.join(workspaceDir, 'node_modules')
    try {
      await fs.access(nodeModulesPath)
      console.log(`[build-workspace] Found existing node_modules, skipping install`)
      return nodeModulesPath
    } catch {
      // node_modules doesn't exist, need to install
    }

    // Install dependencies
    console.log(`[build-workspace] Installing dependencies (this may take a minute)...`)
    const { stdout, stderr } = await execAsync('npm install', {
      cwd: workspaceDir,
      timeout: 300000 // 5 minute timeout for install
    })

    if (stdout) console.log(`[build-workspace] npm install stdout:`, stdout)
    if (stderr) console.log(`[build-workspace] npm install stderr:`, stderr)

    // Verify node_modules was created
    await fs.access(nodeModulesPath)
    console.log(`[build-workspace] ✓ Build workspace initialized successfully`)

    return nodeModulesPath
  } catch (error) {
    console.error(`[build-workspace] Failed to initialize build workspace:`, error)
    throw new Error(`Failed to initialize build workspace: ${error}`)
  }
}

/**
 * Gets the path to the shared node_modules directory
 * Must call initializeBuildWorkspace() first
 */
export function getNodeModulesPath(): string {
  if (!nodeModulesPath) {
    throw new Error('Build workspace not initialized. Call initializeBuildWorkspace() first.')
  }
  return nodeModulesPath
}

/**
 * Creates a symlink to the shared node_modules in a target directory
 *
 * @param targetDir - Directory where the symlink should be created
 */
export async function symlinkNodeModules(targetDir: string): Promise<void> {
  const sharedNodeModules = getNodeModulesPath()
  const symlinkPath = path.join(targetDir, 'node_modules')

  try {
    // Create symlink: targetDir/node_modules -> shared/node_modules
    await fs.symlink(sharedNodeModules, symlinkPath, 'dir')
    console.log(`[build-workspace] Created symlink: ${symlinkPath} -> ${sharedNodeModules}`)
  } catch (error: any) {
    if (error.code === 'EEXIST') {
      console.log(`[build-workspace] Symlink already exists at ${symlinkPath}`)
    } else {
      throw new Error(`Failed to create symlink: ${error}`)
    }
  }
}

/**
 * Cleans up old workspace (useful for forcing reinstall)
 */
export async function cleanupWorkspace(): Promise<void> {
  if (workspaceDir) {
    try {
      await fs.rm(workspaceDir, { recursive: true, force: true })
      console.log(`[build-workspace] Cleaned up workspace at ${workspaceDir}`)
      workspaceDir = null
      nodeModulesPath = null
    } catch (error) {
      console.error(`[build-workspace] Failed to cleanup workspace:`, error)
    }
  }
}
