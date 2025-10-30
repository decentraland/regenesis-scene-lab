import { IHttpServerComponent } from '@well-known-components/interfaces'
import * as fs from 'fs'
import * as path from 'path'

// Use require.resolve to find the package, then go up to its directory
const BEVY_EXPLORER_PATH = path.dirname(require.resolve('@dcl-regenesislabs/bevy-explorer-web/package.json'))

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.bin': 'application/octet-stream',
  '.data': 'application/octet-stream',
  '.gz': 'application/gzip',
  '.br': 'application/x-br'
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  return MIME_TYPES[ext] || 'application/octet-stream'
}

export async function bevyExplorerHandler(
  context: IHttpServerComponent.DefaultContext<any>
): Promise<IHttpServerComponent.IResponse> {
  try {
    // Get the path parameter from the route (could be undefined, string, or array)
    const pathParam = (context as any).params?.path

    let requestPath = ''
    if (Array.isArray(pathParam)) {
      requestPath = pathParam.join('/')
    } else if (typeof pathParam === 'string') {
      requestPath = pathParam
    }

    // If no file specified, serve index.html
    if (!requestPath || requestPath === '') {
      requestPath = 'index.html'
    }

    // Security: prevent directory traversal
    const normalizedPath = path.normalize(requestPath).replace(/^(\.\.[\/\\])+/, '')
    const filePath = path.join(BEVY_EXPLORER_PATH, normalizedPath)

    // Ensure the file is within the bevy-explorer directory
    if (!filePath.startsWith(BEVY_EXPLORER_PATH)) {
      return {
        status: 403,
        body: { error: 'Forbidden' }
      }
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return {
        status: 404,
        body: { error: 'File not found' }
      }
    }

    // Check if it's a file (not a directory)
    const stats = fs.statSync(filePath)
    if (!stats.isFile()) {
      return {
        status: 400,
        body: { error: 'Not a file' }
      }
    }

    // Read the file
    let fileContent = fs.readFileSync(filePath)
    const mimeType = getMimeType(filePath)

    // If serving index.html, modify it to use local resources instead of CDN
    if (normalizedPath === 'index.html') {
      let htmlContent = fileContent.toString('utf-8')

      htmlContent = htmlContent.replace(
        /<script type="module" src="https:\/\/cdn\.decentraland\.org\/@dcl-regenesislabs\/bevy-explorer-web\/[^"]+\/main\.js"><\/script>/,
        '<script type="module" src="./main.js"></script>'
      )
      // Set PUBLIC_URL to empty for relative paths (matches the original second script tag)
      htmlContent = htmlContent.replace(
        /<script>window\.PUBLIC_URL = "[^"]*";<\/script>/g,
        '<script>window.PUBLIC_URL = "";</script>'
      )

      fileContent = Buffer.from(htmlContent, 'utf-8')
    }

    // Only add COEP/COOP headers for HTML files, not for all resources
    // This allows the main document to be isolated but doesn't block subresources
    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=3600'
    }

    // Add isolation headers only for HTML documents
    if (mimeType === 'text/html') {
      headers['Cross-Origin-Opener-Policy'] = 'same-origin'
    }

    headers['Cross-Origin-Embedder-Policy'] = 'require-corp'
    // Add CORP for all resources to allow them to be loaded in COEP context from different origins
    headers['Cross-Origin-Resource-Policy'] = 'cross-origin'


    return {
      status: 200,
      headers,
      body: fileContent
    }
  } catch (error: any) {
    console.error('Bevy Explorer handler error:', error)
    return {
      status: 500,
      body: { error: error.message || 'Failed to serve file' }
    }
  }
}
