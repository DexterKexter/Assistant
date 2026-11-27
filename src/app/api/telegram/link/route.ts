import { createClient } from '@/lib/supabase/server'
import { BOT_USERNAME, linkToken } from '@/lib/telegram'

// Opened from the dashboard header: sends the signed-in user to the bot with a one-time link token.
export async function GET() {
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) return new Response('unauthorized', { status: 401 })
  return Response.redirect(`https://t.me/${BOT_USERNAME}?start=${linkToken(user.id)}`)
}
