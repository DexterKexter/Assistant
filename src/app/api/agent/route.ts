import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { openrouter, SYSTEM_PROMPT, agentTools } from '@/lib/agent-tools'

export const maxDuration = 60

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()
  const supabase = await createClient()

  const modelMessages = await convertToModelMessages(messages)
  const result = streamText({
    model: openrouter.chat('deepseek/deepseek-v4.1-flash'),
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    stopWhen: stepCountIs(12),
    tools: agentTools(supabase),
  })

  return result.toUIMessageStreamResponse()
}
