import type {
  IConfigComponent,
  ILoggerComponent,
  IHttpServerComponent,
  IBaseComponent,
  IMetricsComponent,
  IFetchComponent
} from '@well-known-components/interfaces'
import { metricDeclarations } from './metrics'

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
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  filesSnapshot: SceneFiles
}

export type Scene = {
  id: string
  name: string
  files: SceneFiles
  conversation: ConversationMessage[]
  createdAt: Date
  updatedAt: Date
}

export type ISceneStorageComponent = {
  createFromTemplate(templateId: string, name: string): Promise<Scene>
  getScene(sceneId: string): Promise<Scene | null>
  updateScene(sceneId: string, files: SceneFiles): Promise<Scene>
  addConversationMessage(sceneId: string, message: ConversationMessage): Promise<Scene>
  resetConversation(sceneId: string): Promise<Scene>
  getMessageSnapshot(sceneId: string, messageIndex: number): Promise<SceneFiles>
  revertToSnapshot(sceneId: string, messageIndex: number): Promise<Scene>
  deleteScene(sceneId: string): Promise<void>
  listScenes(): Promise<Scene[]>
}

export type IAIServiceComponent = {
  generateSceneModification(
    prompt: string,
    currentFiles: SceneFiles,
    conversationHistory: ConversationMessage[]
  ): Promise<{
    files: SceneFiles
    explanation: string
  }>
}
