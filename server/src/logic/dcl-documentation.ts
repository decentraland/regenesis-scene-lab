// Cache for documentation to avoid fetching every time
let docsCache: { reference: string; examples: string } | null = null

export async function fetchDecentralandDocs(): Promise<{ reference: string; examples: string }> {
  if (docsCache) {
    return docsCache
  }

  try {
    const [referenceRes, examplesRes] = await Promise.all([
      fetch(
        'https://api.github.com/repos/decentraland/documentation/contents/ai-sdk-context/sdk7-complete-reference.md'
      ),
      fetch(
        'https://api.github.com/repos/decentraland/documentation/contents/ai-sdk-context/sdk7-examples.mdc?ref=main'
      )
    ])

    if (!referenceRes.ok || !examplesRes.ok) {
      throw new Error('Failed to fetch Decentraland documentation')
    }

    const referenceData = await referenceRes.json()
    const examplesData = await examplesRes.json()

    // GitHub API returns content as base64
    const reference = Buffer.from(referenceData.content, 'base64').toString('utf-8')
    const examples = Buffer.from(examplesData.content, 'base64').toString('utf-8')

    docsCache = { reference, examples }
    console.log('✅ Decentraland SDK7 documentation loaded from GitHub')

    return docsCache
  } catch (error) {
    console.error('Failed to fetch Decentraland docs:', error)
    // Fallback to minimal examples if fetch fails
    return {
      reference: 'Decentraland SDK 7 - Use @dcl/sdk/ecs and @dcl/sdk/math imports',
      examples: 'Use engine.addEntity(), Transform.create(), MeshRenderer, Material, GltfContainer'
    }
  }
}
