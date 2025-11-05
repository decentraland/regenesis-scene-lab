export type SceneFiles = {
  [path: string]: string
}

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string // ISO string from server
  filesSnapshot: SceneFiles
}

export type Scene = {
  id: string
  name: string
  files: SceneFiles
  conversation: Message[]
  createdAt: string
  updatedAt: string
}
