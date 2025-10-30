# AI Code Generation Setup

## How It Works

The AI-powered code generation uses **Claude Sonnet 4** with full code context awareness to modify Decentraland scenes based on natural language prompts.

### Architecture Flow

```
User types: "Add zombies"
    ↓
Client sends prompt + scene ID to server
    ↓
Server builds context:
  - Current scene files (/src/index.ts, package.json, etc.)
  - SDK 7 examples (entities, animations, models, etc.)
  - System instructions for Decentraland scenes
    ↓
Claude Sonnet analyzes:
  - Understands current code structure
  - Knows Decentraland SDK 7 patterns
  - Suggests code modifications
    ↓
Claude returns structured response:
  {
    "files": {
      "/src/index.ts": "...modified code...",
      "package.json": "...updated dependencies..."
    },
    "explanation": "Added zombie entity with walk animation..."
  }
    ↓
Server parses and updates scene
    ↓
Client updates Monaco editor with new code
```

## Setup Instructions

### 1. Get Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to **API Keys**
4. Create a new API key
5. Copy the key (starts with `sk-ant-...`)

### 2. Configure Server

Edit `server/.env`:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
```

**Important:** Never commit your API key to git! The `.env` file should be in `.gitignore`.

### 3. Start the Server

```bash
cd server
npm install
npm run start:dev
```

### 4. Start the Client

```bash
cd client
npm install
npm run dev
```

## How to Use

1. **Open the app** at http://localhost:5173
2. **Type a prompt** in the left panel:
   - "Add zombies"
   - "Create a rotating cube at position 10, 2, 10"
   - "Add a click event that makes the cube jump"
   - "Load a zombie model from models/zombie.glb with walk animation"
3. **Click Send**
4. **Wait for AI** to analyze and modify the code
5. **See changes** in the Monaco editor (right panel)

## Example Prompts

### Simple Entity Creation
```
Add a blue sphere at position 5, 1, 5
```

### Model Loading
```
Add a zombie model from models/zombie.glb with walk animation
```

### Interactions
```
Make the cube clickable and change its color when clicked
```

### Complex Scenes
```
Create a garden with 5 trees placed randomly, each tree should have a different scale
```

## Context Awareness Features

The AI understands:

✅ **Current scene structure** - Reads all your files
✅ **Decentraland SDK 7** - Uses **official documentation** from Decentraland repo
✅ **Code style** - Maintains your existing code format
✅ **Dependencies** - Updates package.json if needed
✅ **Entity relationships** - Understands parent/child entities
✅ **Component patterns** - Transform, MeshRenderer, Material, etc.

## Official Decentraland Documentation

The AI is powered by **official Decentraland SDK 7 documentation** fetched directly from GitHub:

### Documentation Sources

1. **SDK 7 Complete Reference**
   - URL: https://github.com/decentraland/documentation/blob/main/ai-sdk-context/sdk7-complete-reference.md
   - Contains: Complete API reference, rules, best practices

2. **SDK 7 Examples**
   - URL: https://github.com/decentraland/documentation/blob/main/ai-sdk-context/sdk7-examples.mdc
   - Contains: Real-world code examples, patterns, use cases

### How It Works

On first AI request:
1. Server fetches both markdown files from GitHub API
2. Parses base64-encoded content
3. **Caches in memory** (no repeated fetches)
4. Injects into Claude's system prompt

This means the AI always has:
- ✅ Latest official patterns
- ✅ Decentraland team's recommended approaches
- ✅ Real examples from production code
- ✅ Complete API reference

### Benefits

**Up-to-date**: Documentation maintained by Decentraland team
**Accurate**: Official examples, not custom interpretations
**Comprehensive**: Full SDK 7 coverage
**Cached**: Fast after first load (no repeated GitHub calls)

### Refreshing Documentation Cache

Documentation is cached in memory. To get the latest version:
- **Restart the server**: `npm run start:dev` (cache clears)
- Automatic on server restart

The cache prevents unnecessary GitHub API calls and improves performance.

## Cost Considerations

- Uses **Claude Sonnet 4** model
- ~$3 per million input tokens
- ~$15 per million output tokens
- Typical scene modification: ~2000-5000 tokens (~$0.01-0.05 per request)

For development, set a budget limit in your Anthropic console.

## Troubleshooting

### "Anthropic API key not configured"
→ Check `server/.env` has `ANTHROPIC_API_KEY=sk-ant-...`

### "AI prompt failed"
→ Check server logs for detailed error
→ Verify API key is valid
→ Check you have credits in Anthropic account

### AI returns invalid code
→ The AI is instructed to return JSON with "files" and "explanation"
→ If parsing fails, check server logs for the raw response
→ May need to adjust the system prompt in `ai-service.ts`

### Code doesn't compile
→ AI should generate valid SDK 7 code
→ Check Monaco editor for TypeScript errors
→ You can manually fix and re-save
→ Try a more specific prompt

## Advanced: Customizing AI Behavior

Edit `server/src/adapters/ai-service.ts`:

### Add More Examples
```typescript
const SDK7_EXAMPLES = `
// Add your own patterns here
\`\`\`typescript
// Custom example
\`\`\`
`
```

### Modify System Prompt
```typescript
const SYSTEM_PROMPT = `
You are an expert...
// Add custom instructions
`
```

### Change Model
```typescript
model: 'claude-sonnet-4-20250514', // or 'claude-opus-4-20250514'
```

## Next Steps

- [ ] Add conversation history (multi-turn modifications)
- [ ] Add "Undo" functionality
- [ ] Streaming responses for real-time feedback
- [ ] Fine-tune with Decentraland-specific examples
- [ ] Add model library search and auto-insertion
