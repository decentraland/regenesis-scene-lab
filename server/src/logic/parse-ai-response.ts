import { SceneFiles } from '../types'

export function parseAIResponse(responseText: string): { files: SceneFiles; explanation: string } {
  // Try to parse JSON from the response
  // Claude might wrap it in markdown code blocks
  const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/\{[\s\S]*\}/)

  if (!jsonMatch) {
    throw new Error('Could not parse JSON from AI response')
  }

  const jsonText = jsonMatch[1] || jsonMatch[0]
  const parsed = JSON.parse(jsonText)

  return {
    files: parsed.files || {},
    explanation: parsed.explanation || 'Code modified successfully'
  }
}
