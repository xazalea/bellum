export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_STORAGE_CHAT_ID;
  return Response.json({
    enabled: !!token && !!chatId,
  });
}

