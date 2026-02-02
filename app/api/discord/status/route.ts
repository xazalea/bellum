import { getDiscordWebhookUrls, getDiscordWebhookCount, DiscordError } from "@/lib/server/discord";

export const runtime = 'edge';

export const dynamic = "force-dynamic";

/**
 * Checks if Discord storage is enabled and available.
 *
 * Response:
 *  { enabled: boolean, configured: boolean, webhookCount?: number }
 */
export async function GET() {
  try {
    const webhooks = getDiscordWebhookUrls();
    const count = getDiscordWebhookCount();
    
    if (count === 0) {
      return Response.json({ 
        enabled: false, 
        configured: false,
        reason: "No webhooks configured"
      });
    }
    
    // Webhook(s) configured, return enabled
    return Response.json({ 
      enabled: true, 
      configured: true,
      backend: "discord",
      webhookCount: count,
      rateLimit: count * 50, // 50 req/min per webhook
      loadBalancing: count > 1
    });
  } catch (e: any) {
    if (e instanceof DiscordError) {
      // Webhook not configured
      return Response.json({ 
        enabled: false, 
        configured: false,
        reason: e.message
      });
    }
    
    return Response.json({ 
      enabled: false, 
      configured: false,
      reason: "Unknown error"
    });
  }
}
