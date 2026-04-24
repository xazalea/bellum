export const runtime = 'edge';
import { NextRequest } from 'next/server';
import { requireAuthedUser } from '@/app/api/user/_util';
import { rateLimit, requireSameOrigin } from '@/lib/server/security';
import { streamChatCompletion } from '@/lib/server/ai-edge';
import 'server-only';


export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type ChatBody = {
  prompt?: string | Array<{ role: string; content: string }>;
  model?: string;
  site?: string;
};

export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const { uid } = await requireAuthedUser(req);
    rateLimit(req, { scope: 'ai_chat_stream', limit: 20, windowMs: 60_000, key: uid });

    const body = (await req.json().catch(() => ({}))) as ChatBody;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of streamChatCompletion({
            prompt: body.prompt,
            model: body.model,
            site: body.site,
          })) {
            if (event.type === 'message' && event.content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: event.content })}\n\n`));
            } else if (event.type === 'error') {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: event.error })}\n\n`));
              break;
            } else if (event.type === 'done') {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              break;
            }
          }
        } catch (error: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error?.message || 'Unknown error' })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    return new Response(
      `data: ${JSON.stringify({ error: error?.message || 'Unknown error' })}\n\n`,
      {
        status: error?.message?.includes('unauthenticated') ? 401 : 500,
        headers: { 'Content-Type': 'text/event-stream' },
      }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}