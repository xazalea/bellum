import { NextRequest } from "next/server";
import { requireAuthedUser } from "@/app/api/user/_util";
import { rateLimit, requireSameOrigin } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

type ChatRequestBody = {
  prompt?: string | Array<{ role: string; content: string }>;
  model?: string;
  site?: string;
};

function normalizeMessages(input: ChatRequestBody["prompt"]) {
  if (typeof input === "string") {
    const text = input.trim();
    return text ? [{ role: "user", content: text }] : [];
  }

  if (!Array.isArray(input)) return [];
  return input
    .map((m) => ({ role: String(m?.role || "user"), content: String(m?.content || "") }))
    .filter((m) => m.content.trim().length > 0);
}

async function streamChat(body: ChatRequestBody) {
  const { getChatModel, Site, ModelType } = await import("@/lib/gpt4free/model/index");
  const { EventStream, Event } = await import("@/lib/gpt4free/utils/index");

  const selectedSite = body.site && Object.values(Site).includes(body.site as any) ? body.site : Site.Auto;
  const selectedModel = body.model && Object.values(ModelType).includes(body.model as any) ? body.model : ModelType.GPT3p5Turbo;

  const messages = normalizeMessages(body.prompt);
  if (!messages.length) throw new Error("Missing prompt parameter");

  const factory = getChatModel();
  const chat = factory.get(selectedSite as any) || factory.get(Site.Auto as any);
  if (!chat) throw new Error(`Site '${selectedSite}' not supported`);

  let preHandled = await chat.preHandle({
    prompt: "",
    messages,
    model: selectedModel as any,
  });

  const eventStream = new EventStream();
  chat.askStream(preHandled, eventStream).catch((error: any) => {
    eventStream.write(Event.error, { error: error?.message || "stream_failed" });
    eventStream.end();
  });

  return eventStream;
}

export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const { uid } = await requireAuthedUser(req);
    rateLimit(req, { scope: "ai_chat_stream", limit: 20, windowMs: 60_000, key: uid });

    const body = (await req.json().catch(() => ({}))) as ChatRequestBody;
    const eventStream = await streamChat(body);

    const readable = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        eventStream.stream().on("data", (chunk: string) => controller.enqueue(encoder.encode(chunk)));
        eventStream.stream().on("end", () => controller.close());
        eventStream.stream().on("error", () => controller.close());
      },
      cancel() {
        eventStream.end();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    return new Response(
      `event: error\ndata: ${JSON.stringify({ error: error?.message || "Unknown error" })}\n\n`,
      {
        status: error?.message?.includes("unauthenticated") ? 401 : 500,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }
    );
  }
}
