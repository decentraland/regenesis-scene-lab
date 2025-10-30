import Anthropic from '@anthropic-ai/sdk'
import { SceneFiles, IAIServiceComponent, ConversationMessage, AppComponents } from '../types'
import { fetchDecentralandDocs } from '../logic/dcl-documentation'
import { parseAIResponse } from '../logic/parse-ai-response'

function buildMessages(
  prompt: string,
  currentFiles: SceneFiles,
  conversationHistory: ConversationMessage[]
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []
  const isFirstMessage = conversationHistory.length === 0

  // If FIRST message, send full files context
  if (isFirstMessage) {
    const filesContext = Object.entries(currentFiles)
      .map(([path, content]) => `File: ${path}\n\`\`\`\n${content}\n\`\`\``)
      .join('\n\n')

    messages.push({
      role: 'user',
      content: `Initial scene files:
${filesContext}

User request: ${prompt}

Analyze the current code and modify it to fulfill the user's request. Follow the official SDK 7 documentation provided in the system prompt. Return the response in JSON format with "files" and "explanation" fields.`
    })
  } else {
    // For follow-ups, use conversation history (which already has file context)
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role,
        content: msg.content
      })
    }

    // Just add the new user request (Claude knows files from conversation)
    messages.push({
      role: 'user',
      content: `User request: ${prompt}\n\nReturn the modified files in JSON format with "files" and "explanation" fields.`
    })
  }

  return messages
}

export async function createAIServiceComponent({ config }: Pick<AppComponents, 'config'>): Promise<IAIServiceComponent> {
  const anthropicApiKey = await config.getString('ANTHROPIC_API_KEY')

  const anthropic = new Anthropic({ apiKey: anthropicApiKey })

  return {
    async generateSceneModification(
      prompt: string,
      currentFiles: SceneFiles,
      conversationHistory: ConversationMessage[]
    ): Promise<{ files: SceneFiles; explanation: string }> {
      const messages = buildMessages(prompt, currentFiles, conversationHistory)

      // ALWAYS use full docs with prompt caching (cache lasts ~5 minutes)
      // This way EVERY new scene benefits from cached docs, not just follow-ups
      const docs = await fetchDecentralandDocs()
      const isFirstMessage = conversationHistory.length === 0

      // Build system prompt with cacheable documentation
      const baseInstructions = `You are an expert Decentraland SDK 7 developer. Your job is to modify scene code based on user requests.

IMPORTANT RULES:
1. Always use Decentraland SDK 7 syntax (NOT SDK 6)
2. Follow the official SDK 7 reference documentation provided below
3. Avoid importing files that are not being used. After returning read the code again and do a clean-up.
4. Keep the main() function structure
5. Return ONLY the modified files in JSON format
6. After returning, read again the file and find errors or unused vars. Remove all unused code.
7. Never import anything from react. Use always @dcl/sdk/react-ecs

Response format (JSON):
{
  "files": {
    "/src/index.ts": "...full file content...",
    "package.json": "...full file content if changed..."
  },
  "explanation": "Brief explanation of changes made"
}`

      // Log what we're sending
      console.log('\n========================================')
      console.log('🤖 ANTHROPIC API REQUEST')
      console.log('========================================')
      console.log(`📊 Message type: ${isFirstMessage ? 'FIRST' : 'FOLLOW-UP'}`)
      console.log(`📝 Using PROMPT CACHING for SDK docs (~30k tokens)`)
      console.log(`💬 Messages count: ${messages.length}`)

      messages.forEach((msg, idx) => {
        const contentPreview = msg.content.substring(0, 100).replace(/\n/g, ' ')
        console.log(`   ${idx + 1}. [${msg.role}] ${msg.content.length} chars - "${contentPreview}..."`)
      })

      console.log('========================================\n')

      try {
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8000,
          // Use array format for system with cache_control
          system: [
            {
              type: 'text',
              text: baseInstructions
            },
            {
              type: 'text',
              text: `---

# OFFICIAL DECENTRALAND SDK 7 REFERENCE

${docs.reference}

---

# OFFICIAL DECENTRALAND SDK 7 EXAMPLES

${docs.examples}`,
              cache_control: { type: 'ephemeral' }
            }
          ],
          messages
        })

        // Log token usage from API response
        console.log('\n========================================')
        console.log('✅ ANTHROPIC API RESPONSE')
        console.log('========================================')
        console.log(`📥 Input tokens: ${message.usage.input_tokens}`)
        console.log(`📤 Output tokens: ${message.usage.output_tokens}`)

        // Log cache metrics if available
        if ('cache_creation_input_tokens' in message.usage && message.usage.cache_creation_input_tokens) {
          console.log(`💾 Cache write: ${message.usage.cache_creation_input_tokens} tokens (first time)`)
        }
        if ('cache_read_input_tokens' in message.usage && message.usage.cache_read_input_tokens) {
          console.log(`⚡ Cache hit: ${message.usage.cache_read_input_tokens} tokens (90% cheaper!)`)
        }

        console.log(`💰 Total tokens: ${message.usage.input_tokens + message.usage.output_tokens}`)

        // Cost calculation with cache pricing
        // Regular input: $3/M, Cache write: $3.75/M, Cache read: $0.30/M, Output: $15/M
        const cacheWriteTokens = ('cache_creation_input_tokens' in message.usage) ? (message.usage.cache_creation_input_tokens || 0) : 0
        const cacheReadTokens = ('cache_read_input_tokens' in message.usage) ? (message.usage.cache_read_input_tokens || 0) : 0
        const regularInputTokens = message.usage.input_tokens - cacheReadTokens

        const regularInputCost = (regularInputTokens / 1_000_000) * 3
        const cacheWriteCost = (cacheWriteTokens / 1_000_000) * 3.75
        const cacheReadCost = (cacheReadTokens / 1_000_000) * 0.30
        const outputCost = (message.usage.output_tokens / 1_000_000) * 15
        const totalCost = regularInputCost + cacheWriteCost + cacheReadCost + outputCost

        console.log(`💵 Estimated cost: $${totalCost.toFixed(6)}`)
        if (cacheWriteTokens > 0) {
          console.log(`   └─ Cache write: $${cacheWriteCost.toFixed(6)}`)
        }
        if (cacheReadTokens > 0) {
          console.log(`   └─ Cache read: $${cacheReadCost.toFixed(6)} (saved ~$${((cacheReadTokens / 1_000_000) * 2.7).toFixed(6)})`)
        }
        console.log('========================================\n')

        const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
        return parseAIResponse(responseText)
      } catch (error: any) {
        console.error('AI generation error:', error)
        throw new Error(`AI generation failed: ${error.message}`)
      }
    }
  }
}
