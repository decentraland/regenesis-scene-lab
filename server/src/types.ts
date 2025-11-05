import type {
  IConfigComponent,
  ILoggerComponent,
  IHttpServerComponent,
  IBaseComponent,
  IMetricsComponent,
  IFetchComponent
} from '@well-known-components/interfaces'
import { metricDeclarations } from './metrics'
import { ISceneStorageComponent } from './adapters/scene-storage'
import { IAIServiceComponent } from './adapters/ai-service'

export type GlobalContext = {
  components: BaseComponents
}

// components used in every environment
export type BaseComponents = {
  config: IConfigComponent
  logs: ILoggerComponent
  server: IHttpServerComponent<GlobalContext>
  metrics: IMetricsComponent<keyof typeof metricDeclarations>
  sceneStorage: ISceneStorageComponent
  aiService: IAIServiceComponent
}

// components used in runtime
export type AppComponents = BaseComponents & {
  statusChecks: IBaseComponent
}

// components used in tests
export type TestComponents = BaseComponents & {
  // A fetch component that only hits the test server
  localFetch: IFetchComponent
}

// this type simplifies the typings of http handlers
export type HandlerContextWithPath<
  ComponentNames extends keyof AppComponents,
  Path extends string = any
> = IHttpServerComponent.PathAwareContext<
  IHttpServerComponent.DefaultContext<{
    components: Pick<AppComponents, ComponentNames>
  }>,
  Path
>

export type Context<Path extends string = any> = IHttpServerComponent.PathAwareContext<GlobalContext, Path>

// Scene types
export type SceneFiles = {
  [path: string]: string
}

export type ConversationMessage = {
  id: string // Unique identifier for this message/snapshot
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  filesSnapshot: SceneFiles
}

export type SceneExport = {
  entityId: string
  hashedFiles: Map<string, Buffer> // hash -> file content
  about: any // AboutResponse from @dcl/protocol
}

export type Scene = {
  id: string
  name: string
  files: SceneFiles // Source files (TypeScript)
  builtFiles?: SceneFiles // Built files (JavaScript) - cached after build
  conversation: ConversationMessage[]
  export?: SceneExport // Current scene export
  snapshotExports: Map<string, SceneExport> // messageId -> snapshot export
  createdAt: Date
  updatedAt: Date
}