import { NextRequest, NextResponse } from 'next/server';
import { Site, ModelType } from '@/lib/gpt4free/model/base';
import type { Message } from '@/lib/gpt4free/model/base';
import { EventStream, Event } from '@/lib/gpt4free/utils';

// Dynamic import to avoid execution during build
const getChatModelFactory = async () => {
  // Skip during build
  if (process.env.NEXT_PHASE === 'phase-production-build' || process.env.CF_PAGES === '1') {
    throw new Error('ChatModelFactory not available during build');
  }
  const { ChatModelFactory } = await import('@/lib/gpt4free/model/index');
  return ChatModelFactory;
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
// Prevent Next.js from trying to collect page data during build
export const generateStaticParams = async () => [];

interface OpenAIChatRequest {
  model: string;
  messages: Message[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  site?: string;
}

interface OpenAIChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function POST(req: NextRequest) {
  // Skip execution during build
  if (process.env.NEXT_PHASE === 'phase-production-build' || process.env.CF_PAGES === '1') {
    return NextResponse.json({ error: { message: 'Service unavailable during build', type: 'server_error' } }, { status: 503 });
  }
  try {
    const body: OpenAIChatRequest = await req.json();
    const { model, messages, stream = false, site = Site.Auto } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: { message: 'Missing messages parameter', type: 'invalid_request_error' } },
        { status: 400 }
      );
    }

    const ChatModelFactory = await getChatModelFactory();
    const factory = new ChatModelFactory();
    const chatModel = factory.get(site as Site);

    if (!chatModel) {
      return NextResponse.json(
        { error: { message: `Site '${site}' not supported`, type: 'invalid_request_error' } },
        { status: 400 }
      );
    }

    if (stream) {
      // Streaming response
      const eventStream = new EventStream();

      // Start the stream in the background
      chatModel.askStream({
        prompt: '',
        messages: messages,
        model: model as ModelType,
      }, eventStream).catch((error) => {
        console.error('Stream error:', error);
        eventStream.write(Event.error, { error: error.message });
        eventStream.end();
      });

      const responseStream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();

          eventStream.stream().on('data', (chunk: string) => {
            // Parse the SSE format from EventStream
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.content) {
                    const openAIChunk = {
                      id: `chatcmpl-${Date.now()}`,
                      object: 'chat.completion.chunk',
                      created: Math.floor(Date.now() / 1000),
                      model,
                      choices: [
                        {
                          index: 0,
                          delta: { content: data.content },
                          finish_reason: null,
                        },
                      ],
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAIChunk)}\n\n`));
                  }
                } catch (e) {
                  // Ignore parse errors
                }
              }
            }
          });

          eventStream.stream().on('end', () => {
            const finalChunk = {
              id: `chatcmpl-${Date.now()}`,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model,
              choices: [
                {
                  index: 0,
                  delta: {},
                  finish_reason: 'stop',
                },
              ],
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          });

          eventStream.stream().on('error', (error: Error) => {
            console.error('Stream error:', error);
            controller.close();
          });
        },
        cancel() {
          eventStream.end();
        },
      });

      return new Response(responseStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Non-streaming response
      const result = await chatModel.ask({
        prompt: '',
        messages: messages,
        model: model as ModelType,
      });

      const response: OpenAIChatResponse = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: result.content || '',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
      };

      return NextResponse.json(response);
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          type: 'server_error',
        },
      },
      { status: 500 }
    );
  }
}
