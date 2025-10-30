<div align="center">

# Decentraland Scene Lab 🧪

**AI-powered scene creation for Decentraland**

Build, iterate, and preview Decentraland scenes with natural language prompts and live feedback.

[Features](#features) • [Quick Start](#quick-start) • [Development](#development) • [API](#api-reference)

---

</div>

## Overview

Scene Lab is an AI-assisted development environment for creating Decentraland scenes. It combines the power of conversational AI with a live preview system, allowing you to build immersive 3D experiences through natural language prompts.

Think of it as your creative partner for building in the metaverse - describe what you want, see it come to life instantly, and iterate with simple conversations.

## Features

### 🤖 **AI-Powered Scene Generation**
- Natural language prompts to create and modify scenes
- Conversational interface that remembers context
- Smart code generation using Claude Sonnet 4
- **Prompt Caching**: 90% cost reduction on SDK documentation (shared across all users)
- Time-travel through your conversation history

### 💻 **Integrated Code Editor**
- Full Monaco editor with TypeScript support
- Syntax highlighting and IntelliSense
- Direct file editing when you need fine control
- Real-time file management

### 🎮 **Live Preview**
- Embedded Bevy Explorer for instant scene preview
- Cross-origin isolated for full WebAssembly support
- Seamless switching between code and preview
- No reload required when switching tabs

### 📦 **Scene Management**
- Template system to bootstrap new scenes
- Version control through conversation snapshots
- Revert to any point in your scene's history
- File-based scene storage

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd runtime-editor
npm run install:all
```

### Running the Application

Start both client and server in development mode:

```bash
npm run dev
```

The application will be available at:
- **Client**: http://localhost:5173
- **Server**: http://localhost:3001

## Development

### Project Structure

```
runtime-editor/
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── Editor.tsx     # Main editor layout
│   │   ├── EditorPanel.tsx    # Code editor & preview
│   │   ├── PromptInterface.tsx # AI chat interface
│   │   └── components/    # Reusable UI components
│   └── package.json
│
└── server/                # well-known-components backend
    ├── src/
    │   ├── components/
    │   │   ├── scene-storage.ts    # Scene persistence
    │   │   └── ai-service.ts       # Claude AI integration
    │   └── controllers/
    │       └── handlers/           # API route handlers
    └── package.json
```

### Available Scripts

**Root level:**
- `npm run install:all` - Install all dependencies
- `npm run dev` - Run both client and server
- `npm run build:client` - Build client for production
- `npm run build:server` - Build server for production

**Client:**
- `npm run dev` - Start dev server (port 5173)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

**Server:**
- `npm run start:dev` - Start dev server with hot reload (port 3001)
- `npm run build` - Build for production
- `npm run start` - Start production server

## API Reference

### Scenes

#### Create Scene
```http
POST /api/scenes
Content-Type: application/json

{
  "templateId": "default",
  "name": "My Scene"
}
```

#### List Scenes
```http
GET /api/scenes
```

#### Get Scene
```http
GET /api/scenes/:sceneId
```

#### Update Scene
```http
PUT /api/scenes/:sceneId
Content-Type: application/json

{
  "files": {
    "src/index.ts": "..."
  }
}
```

### AI Prompts

#### Generate Scene Modification
```http
POST /api/scenes/:sceneId/prompt
Content-Type: application/json

{
  "prompt": "Add a rotating cube in the center"
}
```

### Conversation Management

#### Reset Conversation
```http
POST /api/scenes/:sceneId/conversation/reset
```

#### Get Snapshot
```http
GET /api/scenes/:sceneId/snapshots/:messageIndex
```

#### Revert to Snapshot
```http
POST /api/scenes/:sceneId/snapshots/:messageIndex/revert
```

### Preview

#### Bevy Explorer
```http
GET /bevy-explorer/*
```
Serves the Bevy Explorer web client with proper COEP/CORP headers.

## Architecture

### Client Architecture

The client is built with React and uses:
- **Monaco Editor** for code editing
- **Bevy Explorer** embedded via iframe for 3D preview
- **Vite** for fast development and building
- **Cross-origin isolation** enabled for SharedArrayBuffer support

### Server Architecture

The server uses the `well-known-components` pattern:
- **Scene Storage Component**: File-based scene persistence with conversation history
- **AI Service Component**: Integration with Claude API for scene generation
- **HTTP Server Component**: RESTful API with typed request handlers
- **Metrics & Logging**: Built-in observability

### Key Technical Features

- **Type-safe API handlers** using `HandlerContextWithPath`
- **Conversation snapshots** stored with each message
- **File-based storage** for easy debugging and version control
- **COEP/CORP headers** properly configured for WebAssembly
- **Cross-origin resource sharing** between client and server

## Configuration

### Environment Variables

**Client (.env)**
```env
VITE_API_URL=http://localhost:3001
```

**Server (.env)**
```env
PORT=3001
ANTHROPIC_API_KEY=your-api-key-here
```

## Contributing

We welcome contributions! Please feel free to submit issues and pull requests.

---

<div align="center">

**Built with ❤️ for the Decentraland community**

Powered by [DCL Regenesis Labs](https://dclregenesislabs.xyz/)

</div>
