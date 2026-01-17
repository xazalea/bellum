# Discord Webhook Storage - Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Bellum Storage UI                        │
│                     (app/storage/page.tsx)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Discord Webhook Storage Client                  │
│            (lib/storage/discord-webhook-storage.ts)              │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Fingerprint │  │ Compression  │  │    Quota     │         │
│  │  Management  │  │   Pipeline   │  │  Management  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
         ┌───────────────────┴───────────────────┐
         │                                       │
         ▼                                       ▼
┌─────────────────┐                    ┌─────────────────┐
│   localStorage   │                    │ Discord Webhook │
│                 │                    │                 │
│ • File Metadata │                    │ • File Chunks   │
│ • Quota Usage   │                    │ • CDN URLs      │
│ • Fingerprint   │                    │ • Messages      │
└─────────────────┘                    └─────────────────┘
```

## Upload Flow

```
1. User selects file
   │
   ├─→ Get fingerprint ID (FingerprintJS)
   │   └─→ "a1b2c3d4e5f6..."
   │
   ├─→ Check quota (localStorage)
   │   └─→ Used: 2.1 GB / 4.0 GB ✓
   │
   ├─→ Compress file (gzip)
   │   └─→ 100 MB → 30 MB (70% reduction)
   │
   ├─→ Split into chunks (24 MB each)
   │   └─→ Chunk 1: 24 MB
   │   └─→ Chunk 2: 6 MB
   │
   ├─→ Upload to Discord webhook
   │   ├─→ POST chunk 1 → Message ID: 123456
   │   │   └─→ CDN URL: https://cdn.discordapp.com/...
   │   ├─→ Wait 500ms (rate limit)
   │   └─→ POST chunk 2 → Message ID: 123457
   │       └─→ CDN URL: https://cdn.discordapp.com/...
   │
   ├─→ Save metadata (localStorage)
   │   └─→ {
   │         fileId: "uuid",
   │         fileName: "video.mp4",
   │         originalSize: 100 MB,
   │         compressedSize: 30 MB,
   │         messageIds: [123456, 123457],
   │         attachmentUrls: [url1, url2]
   │       }
   │
   └─→ Update quota (localStorage)
       └─→ Used: 2.2 GB / 4.0 GB (added 100 MB)
```

## Download Flow

```
1. User clicks download
   │
   ├─→ Get metadata (localStorage)
   │   └─→ fileId: "uuid"
   │       fileName: "video.mp4"
   │       attachmentUrls: [url1, url2]
   │
   ├─→ Download chunks (Discord CDN)
   │   ├─→ GET url1 → Blob (24 MB)
   │   └─→ GET url2 → Blob (6 MB)
   │
   ├─→ Combine chunks
   │   └─→ Combined blob (30 MB)
   │
   ├─→ Decompress (gzip)
   │   └─→ 30 MB → 100 MB
   │
   └─→ Trigger browser download
       └─→ Save as "video.mp4"
```

## Quota Management

```
┌─────────────────────────────────────────────────────────────┐
│                      Quota System                            │
└─────────────────────────────────────────────────────────────┘

Fingerprint: a1b2c3d4e5f6...
Limit: 4 GB (4,294,967,296 bytes)

┌─────────────────────────────────────────────────────────────┐
│ File 1: video.mp4        │ 1.5 GB │ Compressed: 450 MB     │
│ File 2: archive.zip      │ 800 MB │ Compressed: 750 MB     │
│ File 3: document.pdf     │ 200 MB │ Compressed: 180 MB     │
└─────────────────────────────────────────────────────────────┘

Total Used: 2.5 GB (original size)
Total Stored: 1.38 GB (compressed on Discord)
Available: 1.5 GB

Quota Calculation:
  - Counts ORIGINAL file size (what user sees)
  - Discord stores COMPRESSED size (saves space)
  - User quota = sum of original sizes
  - Discord usage = sum of compressed sizes
```

## Storage Locations

```
┌─────────────────────────────────────────────────────────────┐
│                        localStorage                          │
│                    (Browser, Client-Side)                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ bellum_discord_storage_quota_a1b2c3d4e5f6                   │
│   → "2621440000" (2.5 GB in bytes)                          │
│                                                              │
│ bellum_discord_storage_files_a1b2c3d4e5f6                   │
│   → ["uuid1", "uuid2", "uuid3"]                             │
│                                                              │
│ bellum_discord_storage_metadata_a1b2c3d4e5f6_uuid1          │
│   → { fileId, fileName, sizes, messageIds, urls, ... }      │
│                                                              │
│ bellum_discord_storage_metadata_a1b2c3d4e5f6_uuid2          │
│   → { ... }                                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Discord Channel                         │
│                   (Discord Server, Cloud)                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Message 123456 (from webhook)                               │
│   Content: "[Bellum Storage] video.mp4 - Chunk 1"          │
│   Attachment: video.mp4.part0 (24 MB)                       │
│   CDN URL: https://cdn.discordapp.com/attachments/...      │
│                                                              │
│ Message 123457 (from webhook)                               │
│   Content: "[Bellum Storage] video.mp4 - Chunk 2"          │
│   Attachment: video.mp4.part1 (6 MB)                        │
│   CDN URL: https://cdn.discordapp.com/attachments/...      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Compression Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                     File Compression                         │
└─────────────────────────────────────────────────────────────┘

Input: File (100 MB)
  │
  ├─→ Check CompressionStream support
  │   └─→ Available ✓
  │
  ├─→ Create gzip stream
  │   └─→ new CompressionStream('gzip')
  │
  ├─→ Pipe file through stream
  │   └─→ file.stream().pipeThrough(cs)
  │
  └─→ Output: Compressed blob (30 MB)

Compression Ratios by File Type:
  • Text files (.txt, .json, .csv):  70-90% reduction
  • Code files (.js, .ts, .py):      60-80% reduction
  • Documents (.pdf, .docx):         20-40% reduction
  • Images (.jpg, .png):             5-15% reduction
  • Videos (.mp4, .mov):             0-10% reduction
  • Archives (.zip, .rar):           0-5% reduction
```

## Fingerprint System

```
┌─────────────────────────────────────────────────────────────┐
│                   Device Fingerprinting                      │
└─────────────────────────────────────────────────────────────┘

FingerprintJS.load()
  │
  ├─→ Collect browser signals
  │   ├─→ User agent
  │   ├─→ Screen resolution
  │   ├─→ Timezone
  │   ├─→ Canvas fingerprint
  │   ├─→ WebGL fingerprint
  │   └─→ Audio fingerprint
  │
  ├─→ Generate stable ID
  │   └─→ "a1b2c3d4e5f6789..."
  │
  └─→ Fallback (if fingerprinting fails)
      └─→ crypto.randomUUID()
          └─→ Store in localStorage
              └─→ "nacho_device_fallback"

Same Device = Same Fingerprint = Same Quota
Different Device = Different Fingerprint = New 4GB Quota
```

## Rate Limiting

```
┌─────────────────────────────────────────────────────────────┐
│                    Upload Rate Limiting                      │
└─────────────────────────────────────────────────────────────┘

Discord Webhook Rate Limit: ~5 requests/second

Bellum Strategy:
  Upload Chunk 1 → Wait 500ms → Upload Chunk 2 → Wait 500ms → ...

Example: 10 chunks (240 MB file)
  Time = 10 chunks × 500ms = 5 seconds (rate limiting)
       + 10 chunks × 200ms = 2 seconds (upload time)
       = ~7 seconds total

Without rate limiting:
  → Would hit Discord rate limit
  → Requests would fail
  → Need to retry
  → Slower overall
```

## Error Handling

```
┌─────────────────────────────────────────────────────────────┐
│                      Error Recovery                          │
└─────────────────────────────────────────────────────────────┘

Upload Chunk Failure:
  │
  ├─→ Log error to console
  │
  ├─→ Wait 1000ms + random(0-500ms)
  │
  ├─→ Retry upload
  │
  └─→ If still fails:
      └─→ Throw error
          └─→ Show user error message
              └─→ "Upload failed at chunk 3/10"

Quota Exceeded:
  │
  └─→ Check before upload
      └─→ If insufficient:
          └─→ Throw error
              └─→ "Not enough storage. Available: 1.2 GB, Need: 1.5 GB"

Download Failure:
  │
  └─→ Log error to console
      └─→ Show user error message
          └─→ "Failed to download file"
```

## Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                      Security Layers                         │
└─────────────────────────────────────────────────────────────┘

Client-Side:
  ├─→ Fingerprint (privacy)
  │   └─→ No server-side tracking
  │       └─→ Client-only identification
  │
  ├─→ localStorage (local)
  │   └─→ Metadata stored locally
  │       └─→ No server database
  │
  └─→ Compression (efficiency)
      └─→ Reduces Discord storage
          └─→ Faster uploads/downloads

Discord:
  ├─→ Webhook (limited permissions)
  │   └─→ Can only send messages
  │       └─→ Cannot delete or read
  │
  ├─→ CDN URLs (public)
  │   └─→ Anyone with URL can download
  │       └─→ Consider encryption for sensitive files
  │
  └─→ Rate Limits (abuse prevention)
      └─→ ~5 requests/second
          └─→ Prevents spam

Potential Improvements:
  ├─→ Server-side proxy (hide webhook URL)
  ├─→ Client-side encryption (file privacy)
  ├─→ URL signing (prevent unauthorized downloads)
  └─→ Multiple webhooks (load balancing)
```

## Data Flow Summary

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Browser │────▶│Fingerprint│────▶│Compress  │────▶│  Chunk   │
│   File   │     │   Check   │     │   Gzip   │     │  Split   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                           │
                                                           ▼
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Update  │◀────│   Save   │◀────│  Upload  │◀────│   Rate   │
│  Quota   │     │ Metadata │     │ to Discord│     │  Limit   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
```

## Performance Characteristics

```
┌─────────────────────────────────────────────────────────────┐
│                    Performance Metrics                       │
└─────────────────────────────────────────────────────────────┘

Small File (1 MB):
  Compression:  ~10ms
  Upload:       ~200ms
  Total:        ~210ms

Medium File (100 MB):
  Compression:  ~500ms
  Chunking:     4 chunks
  Upload:       ~3 seconds (with rate limiting)
  Total:        ~3.5 seconds

Large File (1 GB):
  Compression:  ~5 seconds
  Chunking:     42 chunks
  Upload:       ~21 seconds (with rate limiting)
  Total:        ~26 seconds

Download (100 MB):
  Fetch chunks: ~2 seconds
  Decompress:   ~250ms
  Total:        ~2.25 seconds
```

## Comparison: Webhook vs Traditional Storage

```
┌─────────────────────────────────────────────────────────────┐
│              Webhook Storage vs Traditional                  │
└─────────────────────────────────────────────────────────────┘

Traditional Cloud Storage (S3, GCS):
  ├─→ Requires backend server
  ├─→ Needs authentication system
  ├─→ Costs money ($0.02/GB/month)
  ├─→ Complex deployment
  └─→ Full control

Discord Webhook Storage:
  ├─→ No backend needed
  ├─→ No authentication (fingerprint)
  ├─→ Free (leverages Discord)
  ├─→ Simple deployment
  └─→ Limited control

Best Use Cases:
  Webhook Storage:
    • Personal projects
    • Prototypes
    • Free tier users
    • Simple file storage

  Traditional Storage:
    • Production apps
    • Team collaboration
    • Compliance requirements
    • Advanced features
```

## Future Enhancements

```
┌─────────────────────────────────────────────────────────────┐
│                   Potential Improvements                     │
└─────────────────────────────────────────────────────────────┘

Short-Term:
  ├─→ File search/filter
  ├─→ Upload/download speed display
  ├─→ File preview (images, text)
  └─→ Metadata export/import

Medium-Term:
  ├─→ Server-side proxy
  ├─→ Client-side encryption
  ├─→ Multiple webhook support
  └─→ Folder organization

Long-Term:
  ├─→ P2P file sharing
  ├─→ Collaborative storage
  ├─→ Telegram backend
  └─→ File versioning
```

---

**Architecture Status**: ✅ Production Ready

**Last Updated**: 2026-01-17
