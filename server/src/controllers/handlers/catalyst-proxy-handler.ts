import { IHttpServerComponent } from '@well-known-components/interfaces'
import { HandlerContextWithPath } from '../../types'

/**
 * Redirects/proxies missing catalyst/content-server endpoints to a real Decentraland catalyst
 *
 * This handles endpoints that Bevy Explorer needs but we don't implement:
 * - /content/entities/active (POST)
 * - /lambdas/*
 * - /content/contents/*
 * - etc.
 *
 * GET requests: Uses 307 Temporary Redirect
 * POST requests: Proxies the request (can't redirect POST with body)
 *
 * Endpoint: GET/POST /scenes/:sceneId/* (catch-all for unhandled paths)
 */

const CATALYST_URL = 'https://peer.decentraland.org'

export async function catalystProxyHandler(
  context: HandlerContextWithPath<'logs', string>
): Promise<IHttpServerComponent.IResponse> {
  const {
    url,
    request,
    components: { logs }
  } = context

  const logger = logs.getLogger('catalyst-proxy')

  try {
    // Extract the path after /scenes/:sceneId/
    // Also handle double slashes in the URL
    const urlObj = new URL(url.href)
    const pathMatch = urlObj.pathname.replace(/\/+/g, '/').match(/^\/scenes\/[^/]+\/(.+)$/)

    if (!pathMatch) {
      return {
        status: 404,
        body: { error: 'Invalid proxy path' }
      }
    }

    const proxyPath = pathMatch[1]
    const targetUrl = `${CATALYST_URL}/${proxyPath}${urlObj.search}`

    // GET requests: redirect (efficient)
    if (request.method === 'GET') {
      logger.info(`Redirecting GET to catalyst: ${targetUrl}`)
      return {
        status: 307,
        headers: {
          'Location': targetUrl,
          'Access-Control-Allow-Origin': '*'
        },
        body: ''
      }
    }

    // POST requests: proxy (can't redirect with body)
    if (request.method === 'POST') {
      logger.info(`Proxying POST to catalyst: ${targetUrl}`)

      const body = await request.json()
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      const contentType = response.headers.get('content-type') || 'application/json'
      let responseBody: any

      if (contentType.includes('application/json')) {
        responseBody = await response.json()
      } else {
        responseBody = await response.text()
      }

      logger.info(`Catalyst response: ${response.status}`)

      return {
        status: response.status,
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*'
        },
        body: responseBody
      }
    }

    return {
      status: 405,
      body: { error: 'Method not allowed' }
    }
  } catch (error: any) {
    logger.error('Catalyst proxy error:', error)
    return {
      status: 500,
      body: { error: 'Failed to proxy to catalyst', details: error.message }
    }
  }
}
