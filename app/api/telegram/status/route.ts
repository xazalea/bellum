
// Edge runtime for Cloudflare compatibility
export const runtime = 'edge';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_STORAGE_CHAT_ID;
  const hasToken = !!token;
  const hasChatId = !!chatId;
  const enabled = hasToken && hasChatId;
  const misconfigured = hasToken !== hasChatId;
  return Response.json({
    enabled,
    chatId: enabled ? chatId : undefined,
    misconfigured,
  });
}

