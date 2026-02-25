import { NextRequest, NextResponse } from "next/server";

// Use Node.js runtime for file handling
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Maximum file size: 25MB (Discord limit is 25MB for webhooks)
const MAX_FILE_SIZE = 25 * 1024 * 1024;

/**
 * Discord Upload API
 * Uploads files to Discord via webhook and returns the message ID and file URL
 */
export async function POST(request: NextRequest) {
  try {
    // Get Discord webhook URL from environment
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      return NextResponse.json(
        {
          error: "Discord storage not configured",
          details: "DISCORD_WEBHOOK_URL environment variable is not set",
        },
        { status: 503 },
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "File too large",
          details: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 413 },
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create form data for Discord
    const discordFormData = new FormData();
    discordFormData.append(
      "file",
      new Blob([buffer], { type: file.type }),
      file.name,
    );

    // Add optional message content
    const metadata = {
      filename: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: Date.now(),
      source: "challenger-deep",
    };

    discordFormData.append(
      "payload_json",
      JSON.stringify({
        content: `File uploaded: ${file.name}`,
        embeds: [
          {
            title: "Challenger Deep Storage",
            description: `**${file.name}**\nSize: ${(file.size / 1024).toFixed(2)} KB`,
            color: 0x00d9ff,
            timestamp: new Date().toISOString(),
            footer: {
              text: "Challenger Deep Cloud Storage",
            },
          },
        ],
      }),
    );

    // Upload to Discord
    const response = await fetch(webhookUrl, {
      method: "POST",
      body: discordFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Discord Upload] Failed:", response.status, errorText);
      return NextResponse.json(
        {
          error: "Failed to upload to Discord",
          details: `Discord returned status ${response.status}`,
        },
        { status: response.status },
      );
    }

    // Discord returns the message object
    const message = await response.json();

    // Extract file URL from attachments
    const attachment = message.attachments?.[0];
    if (!attachment) {
      return NextResponse.json(
        {
          error: "No attachment in Discord response",
          details: "File may not have been uploaded correctly",
        },
        { status: 500 },
      );
    }

    // Return success with message ID and file URL
    return NextResponse.json(
      {
        success: true,
        messageId: message.id,
        url: attachment.url,
        filename: attachment.filename,
        size: attachment.size,
        metadata,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error: any) {
    console.error("[Discord Upload] Error:", error);
    return NextResponse.json(
      {
        error: "Upload failed",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}

// OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
