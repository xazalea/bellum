import { NextRequest, NextResponse } from 'next/server';

// Check if we're in build mode - if so, export stub handlers
const isBuildTime = typeof process !== 'undefined' && 
  (process.env.NEXT_PHASE === 'phase-production-build' || 
   process.env.CF_PAGES === '1' ||
   process.env.NEXT_PHASE);

// Dynamic imports to avoid webpack static analysis during build
const getChatModelFactory = async () => {
  if (isBuildTime) {
    throw new Error('ChatModelFactory not available during build');
  }
  const { ChatModelFactory } = await import(
    /* webpackIgnore: true */
    '@/lib/gpt4free/model/index'
  );
  return ChatModelFactory;
};

const getEnums = async () => {
  const { Site, ModelType } = await import(
    /* webpackIgnore: true */
    '@/lib/gpt4free/model/enums'
  );
  return { Site, ModelType };
};

// Message is a type, not a value, so we can't import it dynamically
// We'll use 'any' for the type in Edge runtime to avoid build-time analysis
type Message = any;

export const runtime = 'edge';
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
  // Immediately return during build to prevent any code execution
  if (isBuildTime) {
    return NextResponse.json({ error: { message: 'Service unavailable during build', type: 'server_error' } }, { status: 503 });
  }
  try {
    const body: OpenAIChatRequest = await req.json();
    const { Site, ModelType } = await getEnums();
    const { model, messages, stream = false, site = Site.Auto } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: { message: 'Missing messages parameter', type: 'invalid_request_error' } },
        { status: 400 }
      );
    }

    const ChatModelFactory = await getChatModelFactory();
    const factory = new ChatModelFactory();
    const chatModel = factory.get(site as any);

    if (!chatModel) {
      return NextResponse.json(
        { error: { message: `Site '${site}' not supported`, type: 'invalid_request_error' } },
        { status: 400 }
      );
    }

    if (stream) {
      // Dynamic import of utils to avoid execution during build
      const { EventStream, Event } = await import('@/lib/gpt4free/utils');
      // Streaming response
      const eventStream = new EventStream();

      // Start the stream in the background
      chatModel.askStream({
        prompt: '',
        messages: messages,
        model: model as any,
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
        model: model as any,
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
