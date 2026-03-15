export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthedUser } from "@/app/api/user/_util";
import { chatCompletion } from "@/lib/server/ai-gpt4free";
import { rateLimit, requireSameOrigin } from "@/lib/server/security";


export const dynamic = "force-dynamic";

type OpenAIChatRequest = {
  model?: string;
  messages?: Array<{ role: string; content: string }>;
  stream?: boolean;
  site?: string;
};

function streamSingleMessage(content: string, model: string) {
  const encoder = new TextEncoder();
  const id = `chatcmpl-${Date.now()}`;

  const chunk = {
    id,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, delta: { role: "assistant", content }, finish_reason: "stop" }],
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const { uid } = await requireAuthedUser(req);
    rateLimit(req, { scope: "ai_chat_completions", limit: 20, windowMs: 60_000, key: uid });

    const body = (await req.json().catch(() => ({}))) as OpenAIChatRequest;
    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (!messages.length) {
      return NextResponse.json(
        { error: { message: "Missing messages parameter", type: "invalid_request_error" } },
        { status: 400 }
      );
    }

    const result = await chatCompletion({
      messages,
      model: body.model,
      site: body.site,
    });

    if (body.stream) {
      return streamSingleMessage(result.content, result.model);
    }

    return NextResponse.json({
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: result.model,
      choices: [
        {
          index: 0,
          message: {
            role: result.role,
            content: result.content,
          },
          finish_reason: "stop",
        },
      ],
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: {
          message: error?.message || "Unknown error",
          type: "server_error",
        },
      },
      { status: error?.message?.includes("unauthenticated") ? 401 : 500 }
    );
  }
}
