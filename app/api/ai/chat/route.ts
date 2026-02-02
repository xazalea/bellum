import { NextRequest, NextResponse } from 'next/server';
import { ChatModelFactory } from '@/lib/gpt4free/model/index';
import { Site, ModelType } from '@/lib/gpt4free/model/base';
import type { Message } from '@/lib/gpt4free/model/base';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

interface ChatRequest {
  prompt: string | Message[];
  model?: string;
  site?: string;
}

interface ChatResponse {
  content: string;
  error?: string;
}

function parseMessages(prompt: string | Message[]): Message[] {
  if (typeof prompt === 'string') {
    return [{ role: 'user', content: prompt }];
  }
  return prompt;
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { prompt, model = ModelType.GPT3p5Turbo, site = Site.Auto } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Missing prompt parameter' },
        { status: 400 }
      );
    }

    const factory = new ChatModelFactory();
    const chatModel = factory.get(site as Site);

    if (!chatModel) {
      return NextResponse.json(
        { error: `Site '${site}' not supported` },
        { status: 400 }
      );
    }

    const messages = parseMessages(prompt);

    const result = await chatModel.ask({
      prompt: '',
      messages: messages,
      model: model as ModelType,
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
    const factory = new ChatModelFactory();
    const chatModel = factory.get(site as Site);

    if (!chatModel) {
      return NextResponse.json(
        { error: `Site '${site}' not supported` },
        { status: 400 }
      );
    }

    const messages: Message[] = [{ role: 'user', content: prompt }];

    const result = await chatModel.ask({
      prompt: '',
      messages: messages,
      model: model as ModelType,
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
