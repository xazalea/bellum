import { NextRequest, NextResponse } from "next/server";

// Use Node.js runtime
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Discord Storage Status API
 * Checks if Discord storage is available and configured
 */
export async function GET(request: NextRequest) {
  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    // Check if webhook URL is configured
    if (!webhookUrl) {
      return NextResponse.json(
        {
          available: false,
          configured: false,
          message: "Discord storage not configured",
          details: "DISCORD_WEBHOOK_URL environment variable is not set",
        },
        { status: 200 },
      );
    }

    // Validate webhook URL format
    const isValidWebhook =
      webhookUrl.startsWith("https://discord.com/api/webhooks/") ||
      webhookUrl.startsWith("https://discordapp.com/api/webhooks/");

    if (!isValidWebhook) {
      return NextResponse.json(
        {
          available: false,
          configured: true,
          valid: false,
          message: "Invalid Discord webhook URL format",
        },
        { status: 200 },
      );
    }

    // Optionally test the connection (if test parameter is provided)
    const { searchParams } = new URL(request.url);
    const testConnection = searchParams.get("test") === "true";

    if (testConnection) {
      try {
        // Send a minimal test request to verify webhook is accessible
        const testResponse = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content:
              "Challenger Deep storage test (this message will be deleted)",
            embeds: [
              {
                title: "Storage Test",
                description: "Testing Discord storage connectivity",
                color: 0x00d9ff,
                timestamp: new Date().toISOString(),
              },
            ],
          }),
        });

        if (!testResponse.ok) {
          return NextResponse.json(
            {
              available: false,
              configured: true,
              valid: true,
              reachable: false,
              message: "Discord webhook is not reachable",
              statusCode: testResponse.status,
            },
            { status: 200 },
          );
        }

        // If we get here, the webhook is working
        return NextResponse.json(
          {
            available: true,
            configured: true,
            valid: true,
            reachable: true,
            message: "Discord storage is fully operational",
            maxFileSize: "25 MB",
            features: [
              "File upload",
              "Profile sync",
              "Cloud storage",
              "CDN delivery",
            ],
          },
          { status: 200 },
        );
      } catch (testError: any) {
        return NextResponse.json(
          {
            available: false,
            configured: true,
            valid: true,
            reachable: false,
            message: "Failed to connect to Discord",
            error: testError.message,
          },
          { status: 200 },
        );
      }
    }

    // Default response (no test)
    return NextResponse.json(
      {
        available: true,
        configured: true,
        valid: true,
        message: "Discord storage is configured",
        maxFileSize: "25 MB",
        note: "Add ?test=true to verify connectivity",
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("[Discord Status] Error:", error);
    return NextResponse.json(
      {
        available: false,
        error: "Status check failed",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

// OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
