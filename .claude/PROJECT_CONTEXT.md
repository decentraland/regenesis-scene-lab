# Decentraland Scene Lab 🧪 - Project Context

This document provides comprehensive context about the Decentraland Scene Lab project for AI assistants and developers.

## Project Overview

**Scene Lab** is an AI-powered scene creation tool for Decentraland, similar to Lovable/Rosebud/v0.dev but specialized for building Decentraland scenes. It combines conversational AI (Claude) with a live preview system using Bevy Explorer.

### Core Concept
Users describe what they want to build in natural language, and the AI generates/modifies Decentraland SDK 7 scene code. Changes are instantly previewed in an embedded Bevy Explorer instance.

## Architecture

### Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js with `well-known-components` pattern
- **Editor**: Monaco Editor (VS Code's editor)
- **Preview**: Bevy Explorer Web (embedded via iframe)
- **AI**: Claude Sonnet 4 via Anthropic API

### Project Structure

```
runtime-editor/
├── client/                          # React frontend
│   ├── src/
│   │   ├── App.tsx                 # Main app component, state management
│   │   ├── PromptPanel.tsx         # Left panel - AI chat interface
│   │   ├── EditorPanel.tsx         # Right panel - Code editor + preview
│   │   ├── api.ts                  # API client for backend communication
│   │   ├── types.ts                # TypeScript type definitions
│   │   ├── monaco-config.ts        # Monaco editor setup with DCL types
│   │   └── vite-env.d.ts           # Vite environment types
│   ├── vite.config.ts              # Vite config with COEP headers
│   ├── package.json
│   └── .env.example                # Template for environment variables
│
└── server/                          # Node.js backend
    ├── src/
    │   ├── index.ts                # Entry point
    │   ├── service.ts              # Service initialization
    │   ├── components.ts           # Component factory
    │   ├── types.ts                # Global types
    │   ├── metrics.ts              # Metrics definitions
    │   ├── adapters/
    │   │   ├── scene-storage.ts    # File-based scene storage
    │   │   └── ai-service.ts       # Claude AI integration
    │   ├── logic/
    │   │   ├── dcl-documentation.ts    # Fetches SDK docs from GitHub
    │   │   └── parse-ai-response.ts    # Parses AI JSON responses
    │   └── controllers/
    │       ├── routes.ts           # Route definitions
    │       └── handlers/
    │           ├── scenes-handler.ts           # Scene CRUD operations
    │           ├── ai-handler.ts               # AI prompt processing
    │           ├── snapshot-handler.ts         # Time-travel snapshots
    │           ├── reset-conversation-handler.ts
    │           ├── bevy-explorer-handler.ts    # Serves Bevy static files
    │           └── ping-handler.ts             # Health check
    ├── package.json
    └── .env.example
```

## Key Features

### 1. AI-Powered Scene Generation
- Uses Claude Sonnet 4 for code generation
- Conversational interface with context retention
- Fetches official Decentraland SDK 7 documentation from GitHub
- **Token Optimization**: Only sends full docs on first message, uses minimal prompt for follow-ups

### 2. Scene Storage
- **File-based storage** in `server/.storage/scenes/`
- Each scene has:
  - Scene files (src/index.ts, scene.json, package.json, etc.)
  - Conversation history with snapshots
  - Metadata (id, name, timestamps)

### 3. Conversation Snapshots (Time Travel)
- **Every message** (user + assistant) stores a snapshot of files at that point
- Users can:
  - View snapshots (read-only preview)
  - Revert to any point in conversation history
  - Reset conversation to start fresh

### 4. Monaco Editor Integration
- Full TypeScript support with IntelliSense
- Loads Decentraland SDK types from CDN
- File navigation and editing
- Syntax highlighting and error checking

### 5. Bevy Explorer Preview
- **Embedded via iframe** with proper cross-origin isolation
- Uses `@dcl-regenesislabs/bevy-explorer-web` package served locally
- **No reload on tab switch** (uses CSS display toggle instead of conditional rendering)
- Requires `crossOriginIsolated` for SharedArrayBuffer support

## Critical Technical Details

### Cross-Origin Isolation (COEP/CORP)
**Why**: Bevy Explorer uses WebAssembly with SharedArrayBuffer, which requires cross-origin isolation.

**Implementation**:
1. **Client (Vite)**:
   ```ts
   server: {
     headers: {
       'Cross-Origin-Opener-Policy': 'same-origin',
       'Cross-Origin-Embedder-Policy': 'require-corp'
     }
   }
   ```

2. **Server (Middleware)**:
   ```ts
   'Cross-Origin-Resource-Policy': 'cross-origin'
   ```

3. **Bevy Handler**:
   - Serves static files from `@dcl-regenesislabs/bevy-explorer-web`
   - Modifies index.html on-the-fly to use local resources
   - Adds COEP/CORP headers to all responses

### Type Safety Pattern
All route handlers use this pattern:
```ts
import { HandlerContextWithPath } from '../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'

export async function handlerName(
  context: HandlerContextWithPath<'component1' | 'component2', string>
): Promise<IHttpServerComponent.IResponse> {
  const { components: { component1, component2 } } = context
  // ... handler logic
  return {
    status: 200,
    body: result
  }
}
```

### AI Service Token Optimization
```ts
// First message: Send full context
if (conversationHistory.length === 0) {
  const docs = await fetchDecentralandDocs()
  systemPrompt = buildSystemPrompt(docs.reference, docs.examples)
  // ~50k tokens but only once
}
// Follow-up messages: Minimal prompt
else {
  systemPrompt = MINIMAL_SYSTEM_PROMPT // ~500 tokens
}
```

**Result**: First message costs ~$0.20, follow-ups cost ~$0.02 (90% savings)

## API Reference

### Scene Management
- `POST /api/scenes` - Create scene from template
- `GET /api/scenes` - List all scenes
- `GET /api/scenes/:sceneId` - Get scene by ID
- `PUT /api/scenes/:sceneId` - Update scene files

### AI & Conversation
- `POST /api/scenes/:sceneId/prompt` - Send AI prompt
- `POST /api/scenes/:sceneId/conversation/reset` - Reset conversation

### Snapshots (Time Travel)
- `GET /api/scenes/:sceneId/snapshots/:messageIndex` - View snapshot
- `POST /api/scenes/:sceneId/snapshots/:messageIndex/revert` - Revert to snapshot

### Preview
- `GET /bevy-explorer/*` - Serves Bevy Explorer web client

## Environment Variables

### Client (.env)
```env
VITE_API_URL=http://localhost:3001
```

### Server (.env)
```env
PORT=3001
HTTP_SERVER_HOST=0.0.0.0
CORS_ORIGIN=*
CORS_METHOD=*
ANTHROPIC_API_KEY=sk-ant-api03-...
```

## Important Code Patterns

### 1. BaseComponents vs AppComponents
```ts
// BaseComponents: Used everywhere (client + server handlers)
export type BaseComponents = {
  config: IConfigComponent
  logs: ILoggerComponent
  server: IHttpServerComponent<GlobalContext>
  metrics: IMetricsComponent<keyof typeof metricDeclarations>
  sceneStorage: ISceneStorageComponent
  aiService: IAIServiceComponent
}

// AppComponents: Runtime-specific (adds status checks)
export type AppComponents = BaseComponents & {
  statusChecks: IBaseComponent
}
```

### 2. Conversation Message Structure
```ts
export type ConversationMessage = {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  filesSnapshot: SceneFiles  // Full snapshot at this point
}
```

### 3. Scene Storage Location
```
server/.storage/scenes/{sceneId}/
├── files/               # Current scene files
│   ├── src/
│   │   └── index.ts
│   ├── scene.json
│   └── package.json
└── metadata.json        # Scene metadata + conversation history
```

## Development Workflow

### Setup
```bash
# Install all dependencies
npm run install:all

# Or individually
cd client && npm install
cd server && npm install

# Create .env files from examples
cp client/.env.example client/.env
cp server/.env.example server/.env

# Add your Anthropic API key to server/.env
```

### Running
```bash
# Run both (from root)
npm run dev

# Or separately
npm run dev:client  # http://localhost:5173
npm run dev:server  # http://localhost:3001
```

### Building
```bash
npm run build:client
npm run build:server
```

## Common Issues & Solutions

### 1. SharedArrayBuffer Error
**Error**: `SharedArrayBuffer transfer requires self.crossOriginIsolated`
**Solution**: Ensure COEP/CORP headers are set on both client and server

### 2. Bevy Explorer Not Loading
**Check**:
- Is `@dcl-regenesislabs/bevy-explorer-web` installed in server?
- Are CORP headers set to `cross-origin`?
- Is the iframe src pointing to correct server URL?

### 3. Monaco TypeScript Errors
**Issue**: `Property 'env' does not exist on type 'ImportMeta'`
**Solution**: Ensure `vite-env.d.ts` exists in client/src

### 4. High Token Usage
**Check**:
- Is `conversationHistory.length === 0` check working?
- Are you sending full docs on every message?
- Look for console logs in server showing token usage

### 5. Iframe Reloading on Tab Switch
**Fix**: Use CSS display toggle, not conditional rendering:
```tsx
<div style={{ display: viewMode === 'preview' ? 'flex' : 'none' }}>
  <iframe /> {/* Always mounted */}
</div>
```

## AI Prompt Engineering

### System Prompt Rules
1. Always use Decentraland SDK 7 syntax (NOT SDK 6)
2. Follow official SDK 7 reference documentation
3. Avoid importing unused files
4. Keep the main() function structure
5. Return ONLY modified files in JSON format
6. Never import from 'react', use '@dcl/sdk/react-ecs'

### Response Format
```json
{
  "files": {
    "/src/index.ts": "...full file content...",
    "package.json": "...full file if changed..."
  },
  "explanation": "Brief explanation of changes"
}
```

## Decentraland SDK 7 Key Imports

```ts
// ECS core
import { engine, Transform, Entity } from '@dcl/sdk/ecs'

// Math utilities
import { Vector3, Quaternion } from '@dcl/sdk/math'

// Components
import {
  MeshRenderer,
  Material,
  GltfContainer,
  pointerEventsSystem
} from '@dcl/sdk/ecs'

// React ECS (for UI)
import { ReactEcsRenderer } from '@dcl/sdk/react-ecs'
```

## Security & Best Practices

### Never Commit
- `.env` files (use `.env.example` instead)
- `node_modules/`
- `.storage/` directory (contains user scenes)
- API keys or secrets

### Always Check
- TypeScript types are correct (no `any` unless necessary)
- CORS headers for cross-origin requests
- Error handling in all async functions
- Console logs removed in production code (except useful debugging)

## Future Improvements

### Potential Features
- [ ] Multi-scene management (currently single scene per session)
- [ ] Export to Decentraland CLI format
- [ ] Collaborative editing
- [ ] Scene templates library
- [ ] Asset browser integration
- [ ] Live preview with hot reload
- [ ] Deployment to Decentraland World

### Technical Debt
- Scene storage is file-based (consider database for production)
- No authentication/authorization
- No rate limiting on AI API calls
- Monaco types loaded from CDN (could be bundled)

## Community & Resources

**Built with ❤️ for the Decentraland community**

Powered by [DCL Regenesis Labs](https://github.com/dcl-regenesislabs)

### Useful Links
- [Decentraland SDK Documentation](https://docs.decentraland.org/)
- [Bevy Explorer](https://github.com/decentraland/bevy-explorer)
- [Well-Known Components](https://github.com/well-known-components)
- [Anthropic API](https://docs.anthropic.com/)

## Debugging Tips

### Server Logs
The AI service logs detailed token usage:
```
🤖 ANTHROPIC API REQUEST
📊 Message type: FIRST (with full docs)
📝 System prompt length: 125000 chars (~31250 tokens)
💬 Messages count: 1
📦 Total estimated input: ~32000 tokens
---
✅ ANTHROPIC API RESPONSE
📥 Input tokens: 31845
📤 Output tokens: 1234
💰 Total tokens: 33079
💵 Estimated cost: $0.214350
```

### Client State
Use React DevTools to inspect:
- `scene` - Current scene state
- `messages` - Conversation history
- `viewingSnapshotIndex` - Currently viewing snapshot
- `snapshotFiles` - Snapshot file contents

### Network
Monitor these requests:
- POST `/api/scenes/:id/prompt` - AI generation
- PUT `/api/scenes/:id` - Save files
- GET `/api/scenes/:id/snapshots/:index` - View snapshot
- GET `/bevy-explorer/*` - Preview resources

## Version History

### v1.0.0 (Current)
- ✅ AI-powered scene generation with Claude Sonnet 4
- ✅ Monaco editor with Decentraland SDK types
- ✅ Bevy Explorer preview with cross-origin isolation
- ✅ Conversation snapshots and time travel
- ✅ File-based scene storage
- ✅ Token optimization (first message vs follow-up)
- ✅ Type-safe API handlers
- ✅ No iframe reload on tab switch

---

*Last Updated: 2025-01-29*
