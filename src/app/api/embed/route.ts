import { embed } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })

export const maxDuration = 30

export async function POST(req: Request) {
  let text: string | undefined
  try {
    const body = await req.json()
    text = body?.text
  } catch {}
  if (!text || typeof text !== 'string') {
    return Response.json({ error: 'expected { text: string }' }, { status: 400 })
  }
  if (text.length > 8000) text = text.slice(0, 8000)

  try {
    const { embedding } = await embed({
      model: openrouter.textEmbeddingModel('openai/text-embedding-3-small'),
      value: text,
    })
    return Response.json({ embedding, dim: embedding.length })
  } catch (e: any) {
    return Response.json({ error: e?.message || 'embed failed' }, { status: 500 })
  }
}
