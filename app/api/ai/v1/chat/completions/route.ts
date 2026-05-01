import { NextRequest, NextResponse } from 'next/server';
import { requireAuthedUser } from '@/app/api/user/_util';
import { chatCompletion } from '@/lib/server/ai-edge';
import { rateLimit, requireSameOrigin } from '@/lib/server/security';
import 'server-only';


export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionRequest {
  model?: string;
  messages: Message[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const { uid } = await requireAuthedUser(req);
    rateLimit(req, { scope: 'ai_chat_completion', limit: 20, windowMs: 60_000, key: uid });

    const body = (await req.json().catch(() => ({}))) as ChatCompletionRequest;

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: { message: 'messages is required and must be a non-empty array', type: 'invalid_request_error' } },
        { status: 400 }
      );
    }

    // Handle streaming
    if (body.stream) {
      const encoder = new TextEncoder();
      const { streamChatCompletion } = await import('@/lib/server/ai-edge');

      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of streamChatCompletion({
              messages: body.messages,
              model: body.model,
            })) {
              if (event.type === 'message' && event.content) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  id: 'chatcmpl-edge',
                  object: 'chat.completion.chunk',
                  created: Math.floor(Date.now() / 1000),
                  model: body.model || 'gpt-3.5-turbo',
                  choices: [{ index: 0, delta: { content: event.content }, finish_reason: null }]
                })}\n\n`));
              } else if (event.type === 'error') {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: { message: event.error } })}\n\n`));
                break;
              } else if (event.type === 'done') {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  id: 'chatcmpl-edge',
                  object: 'chat.completion.chunk',
                  created: Math.floor(Date.now() / 1000),
                  model: body.model || 'gpt-3.5-turbo',
                  choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
                })}\n\ndata: [DONE]\n\n`));
                break;
              }
            }
          } catch (error: any) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: { message: error?.message || 'Unknown error' } })}\n\n`));
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
    }

    // Non-streaming
    const result = await chatCompletion({
      messages: body.messages,
      model: body.model,
    });

    if (result.error) {
      return NextResponse.json(
        { error: { message: result.error, type: 'api_error' } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: 'chatcmpl-edge-' + Math.random().toString(36).slice(2, 18),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: result.model,
      choices: [{
        index: 0,
        message: {
          role: result.role,
          content: result.content,
        },
        finish_reason: 'stop',
      }],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error?.message || 'Unknown error', type: 'api_error' } },
      { status: error?.message?.includes('unauthenticated') ? 401 : 500 }
    );
  }
}