import { adminDb, requireAuthedUser } from "@/app/api/user/_util";
import { rateLimit, requireSameOrigin } from "@/lib/server/security";


// Edge runtime for Cloudflare compatibility
export const runtime = 'edge';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DiscordManifest = {
  fileId: string;
  fileName: string;
  totalBytes: number;
  chunkBytes: number;
  totalChunks: number;
  chunks: Array<{
    index: number;
    sizeBytes: number;
    sha256: string;
    messageId: string;
    attachmentUrl: string;
  }>;
  createdAt: number;
  ownerUid: string;
};

/**
 * Stores or retrieves a Discord file manifest.
 *
 * POST: Store a new manifest
 * GET: Retrieve an existing manifest by fileId
 */
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const { uid } = await requireAuthedUser(req);
    rateLimit(req, { scope: "discord_manifest_write", limit: 30, windowMs: 60_000, key: uid });

    const body = (await req.json()) as Partial<DiscordManifest>;

    if (!body.fileName || !body.totalBytes || !body.chunks) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const fileId = crypto.randomUUID();
    const manifest: DiscordManifest = {
      fileId,
      fileName: body.fileName,
      totalBytes: body.totalBytes,
      chunkBytes: body.chunkBytes || 24 * 1024 * 1024,
      totalChunks: body.chunks.length,
      chunks: body.chunks,
      createdAt: body.createdAt || Date.now(),
      ownerUid: uid,
    };

    await adminDb()
      .collection("discord_manifests")
      .doc(fileId)
      .set(manifest);

    return Response.json({ fileId, manifest });
  } catch (e: any) {
    const msg = e?.message || "Failed to store manifest";
    const status = msg.includes("unauthenticated") ? 401 : 500;
    return Response.json({ error: msg }, { status });
  }
}

export async function GET(req: Request) {
  try {
    requireSameOrigin(req);
    const { uid } = await requireAuthedUser(req);
    rateLimit(req, { scope: "discord_manifest_read", limit: 100, windowMs: 60_000, key: uid });

    const url = new URL(req.url);
    const fileId = url.searchParams.get("fileId");

    if (!fileId) {
      return Response.json({ error: "Missing fileId parameter" }, { status: 400 });
    }

    const doc = await adminDb().collection("discord_manifests").doc(fileId).get();

    if (!doc.exists) {
      return Response.json({ error: "Manifest not found" }, { status: 404 });
    }

    const manifest = doc.data() as DiscordManifest;

    // Verify ownership
    if (manifest.ownerUid !== uid) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    return Response.json({ manifest });
  } catch (e: any) {
    const msg = e?.message || "Failed to retrieve manifest";
    const status = msg.includes("unauthenticated") ? 401 : 500;
    return Response.json({ error: msg }, { status });
  }
}
