import { NextRequest } from 'next/server';
import { Site, ModelType } from '@/lib/gpt4free/model/enums';
import type { Message } from '@/lib/gpt4free/model/base';
// Dynamic import to avoid execution during build
// import { EventStream, Event } from '@/lib/gpt4free/utils';

// Check if we're in build mode - if so, export stub handlers
const isBuildTime = typeof process !== 'undefined' && 
  (process.env.NEXT_PHASE === 'phase-production-build' || 
   process.env.CF_PAGES === '1' ||
   process.env.NEXT_PHASE);

// Dynamic import to avoid execution during build
const getChatModelFactory = async () => {
  if (isBuildTime) {
    throw new Error('ChatModelFactory not available during build');
  }
  const { ChatModelFactory } = await import('@/lib/gpt4free/model/index');
  return ChatModelFactory;
};

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
// Prevent Next.js from trying to collect page data during build
export const generateStaticParams = async () => [];

interface ChatRequest {
  prompt: string | Message[];
  model?: string;
  site?: string;
}

function parseMessages(prompt: string | Message[]): Message[] {
  if (typeof prompt === 'string') {
    return [{ role: 'user', content: prompt }];
  }
  return prompt;
}

export async function POST(req: NextRequest) {
  // Immediately return during build to prevent any code execution
  if (isBuildTime) {
    const encoder = new TextEncoder();
    return new Response(encoder.encode('Service unavailable during build'), { status: 503 });
  }
  try {
    const body: ChatRequest = await req.json();
    const { prompt, model = ModelType.GPT3p5Turbo, site = Site.Auto } = body;

    if (!prompt) {
      const encoder = new TextEncoder();
      return new Response(
        encoder.encode('event: error\ndata: {"error":"Missing prompt parameter"}\n\n'),
        {
          status: 400,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    const ChatModelFactory = await getChatModelFactory();
    const factory = new ChatModelFactory();
    const chatModel = factory.get(site as Site);

    if (!chatModel) {
      const encoder = new TextEncoder();
      return new Response(
        encoder.encode(`event: error\ndata: {"error":"Site '${site}' not supported"}\n\n`),
        {
          status: 400,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    const messages = parseMessages(prompt);
    // Dynamic import of utils to avoid execution during build
    const { EventStream, Event } = await import('@/lib/gpt4free/utils');
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

    // Convert EventStream to ReadableStream
    const readableStream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        
        eventStream.stream().on('data', (chunk: string) => {
          controller.enqueue(encoder.encode(chunk));
        });

        eventStream.stream().on('end', () => {
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

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Stream error:', error);
    const encoder = new TextEncoder();
    return new Response(
      encoder.encode(`event: error\ndata: ${JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })}\n\n`),
      {
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    );
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const prompt = searchParams.get('prompt');
  const model = searchParams.get('model') || ModelType.GPT3p5Turbo;
  const site = searchParams.get('site') || Site.Auto;

  if (!prompt) {
    const encoder = new TextEncoder();
    return new Response(
      encoder.encode('event: error\ndata: {"error":"Missing prompt parameter"}\n\n'),
      {
        status: 400,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    );
  }

  try {
    const ChatModelFactory = await getChatModelFactory();
    const factory = new ChatModelFactory();
    const chatModel = factory.get(site as Site);

    if (!chatModel) {
      const encoder = new TextEncoder();
      return new Response(
        encoder.encode(`event: error\ndata: {"error":"Site '${site}' not supported"}\n\n`),
        {
          status: 400,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    const messages: Message[] = [{ role: 'user', content: prompt }];
    // Dynamic import of utils to avoid execution during build
    const { EventStream, Event } = await import('@/lib/gpt4free/utils');
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

    // Convert EventStream to ReadableStream
    const readableStream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        
        eventStream.stream().on('data', (chunk: string) => {
          controller.enqueue(encoder.encode(chunk));
        });

        eventStream.stream().on('end', () => {
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

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Stream error:', error);
    const encoder = new TextEncoder();
    return new Response(
      encoder.encode(`event: error\ndata: ${JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })}\n\n`),
      {
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    );
  }
}
