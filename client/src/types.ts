export type SceneFiles = {
  [path: string]: string
}

export type Scene = {
  id: string
  name: string
  files: SceneFiles
  createdAt: string
  updatedAt: string
}

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  messageIndex?: number
}
