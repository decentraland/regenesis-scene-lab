import { Lifecycle } from '@well-known-components/interfaces'
import { setupRouter } from './controllers/routes'
import { AppComponents, GlobalContext, TestComponents } from './types'

// this function wires the business logic (adapters & controllers) with the components (ports)
export async function main(program: Lifecycle.EntryPointParameters<AppComponents | TestComponents>) {
  const { components, startComponents } = program
  const globalContext: GlobalContext = {
    components
  }

  // Add CORS middleware
  components.server.use(async (ctx, next) => {
    const response = await next()
    return {
      ...response,
      headers: {
        ...response?.headers,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        // Allow cross-origin resources to be loaded in COEP contexts
        'Cross-Origin-Resource-Policy': 'cross-origin'
      }
    }
  })

  // wire the HTTP router (make it automatic? TBD)
  const router = await setupRouter(globalContext)
  // register routes middleware
  components.server.use(router.middleware())
  // register not implemented/method not allowed/cors responses middleware
  components.server.use(router.allowedMethods())
  // set the context to be passed to the handlers
  components.server.setContext(globalContext)

  // start ports: db, listeners, synchronizations, etc
  await startComponents()
}
