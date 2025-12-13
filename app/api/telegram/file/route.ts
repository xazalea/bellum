export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TelegramGetFileResponse = {
  ok: boolean;
  result?: {
    file_path?: string;
  };
  description?: string;
};

function requireToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN || "";
  if (!token) throw new Error("Telegram bot token not configured.");
  return token;
}

export async function GET(req: Request) {
  try {
    const token = requireToken();
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("file_id") || "";
    if (!fileId) return Response.json({ error: "file_id required" }, { status: 400 });

    const metaUrl = `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`;
    const metaRes = await fetch(metaUrl, { method: "GET" });
    const metaJson = (await metaRes.json().catch(() => null)) as TelegramGetFileResponse | null;
    if (!metaRes.ok || !metaJson?.ok) {
      const msg = metaJson?.description || `Telegram getFile failed (${metaRes.status})`;
      return Response.json({ error: msg }, { status: 500 });
    }
    const filePath = metaJson.result?.file_path;
    if (!filePath) return Response.json({ error: "Telegram file_path missing" }, { status: 500 });

    const dlUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
    const fileRes = await fetch(dlUrl, { method: "GET" });
    if (!fileRes.ok) {
      const t = await fileRes.text().catch(() => "");
      return Response.json({ error: `Telegram download failed (${fileRes.status}): ${t}` }, { status: 500 });
    }

    // Stream bytes through
    return new Response(fileRes.body, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        // cache aggressively; Telegram file_id is stable for content-addressed object
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Telegram download failed" }, { status: 500 });
  }
}

