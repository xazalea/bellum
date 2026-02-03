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

interface ChatRequest {
  prompt: string | any[];
  model?: string;
  site?: string;
}

interface ChatResponse {
  content: string;
  error?: string;
}

async function parseMessages(prompt: string | any[]): Promise<any[]> {
  if (typeof prompt === 'string') {
    return [{ role: 'user', content: prompt }];
  }
  return prompt;
}

export async function POST(req: NextRequest) {
  // Immediately return during build to prevent any code execution
  if (isBuildTime) {
    return NextResponse.json({ error: 'Service unavailable during build' }, { status: 503 });
  }
  try {
    const { Site, ModelType } = await getEnums();
    const body: ChatRequest = await req.json();
    const { prompt, model = ModelType.GPT3p5Turbo, site = Site.Auto } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Missing prompt parameter' },
        { status: 400 }
      );
    }

    const ChatModelFactory = await getChatModelFactory();
    const factory = new ChatModelFactory();
    const chatModel = factory.get(site as any);

    if (!chatModel) {
      return NextResponse.json(
        { error: `Site '${site}' not supported` },
        { status: 400 }
      );
    }

    const messages = await parseMessages(prompt);

    const result = await chatModel.ask({
      prompt: '',
      messages: messages,
      model: model as any,
    });

    const response: ChatResponse = {
      content: result.content || '',
      error: result.error,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      {
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Immediately return during build to prevent any code execution
  if (isBuildTime) {
    return NextResponse.json({ error: 'Service unavailable during build' }, { status: 503 });
  }
  const { Site, ModelType } = await getEnums();
  const searchParams = req.nextUrl.searchParams;
  const prompt = searchParams.get('prompt');
  const model = searchParams.get('model') || ModelType.GPT3p5Turbo;
  const site = searchParams.get('site') || Site.Auto;

  if (!prompt) {
    return NextResponse.json(
      { error: 'Missing prompt parameter' },
      { status: 400 }
    );
  }

  try {
    const ChatModelFactory = await getChatModelFactory();
    const factory = new ChatModelFactory();
    const chatModel = factory.get(site as any);

    if (!chatModel) {
      return NextResponse.json(
        { error: `Site '${site}' not supported` },
        { status: 400 }
      );
    }

    const messages = [{ role: 'user', content: prompt }];

    const result = await chatModel.ask({
      prompt: '',
      messages: messages,
      model: model as any,
    });

    const response: ChatResponse = {
      content: result.content || '',
      error: result.error,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      {
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
