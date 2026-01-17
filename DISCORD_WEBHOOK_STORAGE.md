# Discord Webhook Storage Integration

## Overview

Bellum now includes a **Discord webhook-based storage system** inspired by [Disbox](https://github.com/DisboxApp/web), providing **4GB of free storage per device** using browser fingerprinting.

## Key Features

### 1. **Fingerprint-Based Quota System**
- Each unique device/browser gets **4GB of free storage**
- Quota is tracked using `@fingerprintjs/fingerprintjs` for device identification
- Fallback to localStorage UUID if fingerprinting fails
- Quota usage is stored in localStorage and persists across sessions

### 2. **Automatic File Compression**
- All files are compressed using gzip before upload
- Uses native browser `CompressionStream` API
- Compression ratios vary by file type (text files: 70-90%, binaries: 10-40%)
- **Important**: Quota is calculated based on **original file size**, not compressed size
- This means your compressed files take up less Discord space, but count at full size toward your quota to prevent confusion

### 3. **Chunked Upload System**
- Files are split into 24MB chunks (safe margin below Discord's 25MB limit)
- Sequential uploads with 500ms delay between chunks to respect rate limits
- Progress tracking for each chunk
- Automatic retry on failure

### 4. **Discord Webhook Integration**
- Webhook URL: `https://discord.com/api/webhooks/1462182344021770413/...`
- Files are uploaded as Discord attachments
- Each chunk is stored as a separate message
- Metadata (file name, chunks, URLs) stored in localStorage

### 5. **Download & Decompression**
- Downloads chunks from Discord CDN
- Automatic decompression using `DecompressionStream`
- Progress tracking during download
- Reassembles original file

## Technical Architecture

### Storage Client: `lib/storage/discord-webhook-storage.ts`

```typescript
// Upload a file with compression
const metadata = await uploadFile(file, (progress) => {
  console.log(`${progress.percent}% - Chunk ${progress.chunkIndex + 1}/${progress.totalChunks}`);
});

// Download a file
const blob = await downloadFile(fileId, (progress) => {
  console.log(`Downloaded: ${progress.downloadedBytes}/${progress.totalBytes} bytes`);
});

// Check quota
const quota = await getQuotaInfo();
console.log(`Used: ${quota.usedBytes} / ${quota.limitBytes}`);

// List all files
const files = await listFiles();
```

### File Metadata Structure

```typescript
interface FileMetadata {
  fileId: string;              // Unique identifier
  fileName: string;            // Original filename
  originalSize: number;        // Pre-compression size (what counts toward quota)
  compressedSize: number;      // Post-compression size (actual Discord usage)
  chunkCount: number;          // Number of Discord messages
  fingerprint: string;         // Device identifier
  createdAt: number;           // Upload timestamp
  messageIds: string[];        // Discord message IDs
  attachmentUrls: string[];    // Discord CDN URLs
  mimeType?: string;           // File MIME type
}
```

### Quota Management

```typescript
// Constants
const QUOTA_PER_FINGERPRINT = 4 * 1024 * 1024 * 1024; // 4GB
const MAX_CHUNK_SIZE = 24 * 1024 * 1024; // 24MB

// LocalStorage keys
const QUOTA_KEY = (fp: string) => `bellum_discord_storage_quota_${fp}`;
const METADATA_KEY = (fp: string) => `bellum_discord_storage_metadata_${fp}`;
const FILES_INDEX_KEY = (fp: string) => `bellum_discord_storage_files_${fp}`;
```

## UI Integration: `app/storage/page.tsx`

### Features
- **Quota Display**: Visual progress bar showing used/available storage
- **Storage Mode Selector**: Toggle between webhook storage and API storage
- **Upload Progress**: Real-time progress with chunk tracking
- **File List**: Shows all files with type badges (webhook/discord/telegram)
- **Download**: One-click download with automatic decompression
- **Delete**: Remove webhook files and reclaim quota

### Storage Modes
1. **Discord Webhook (Recommended)**
   - 4GB free per device
   - No authentication required
   - Automatic compression
   - Best for personal files

2. **API Storage**
   - Requires authentication
   - Uses existing Discord/Telegram APIs
   - Good for shared/collaborative storage

## Compression Pipeline Integration

The system uses the existing compression utilities from `lib/storage/compression.ts`:

```typescript
import { compressFileGzip } from './compression';

// Compress before upload
const compressed = await compressFileGzip(file);
console.log(`${file.size} → ${compressed.compressedBytes} bytes`);
console.log(`${((1 - compressed.compressedBytes / file.size) * 100).toFixed(1)}% reduction`);
```

## Quota Enforcement

### Upload-Time Checks
```typescript
// Before upload, check if file fits in available quota
const hasQuota = await discordWebhookStorage.hasQuota(file.size);
if (!hasQuota) {
  throw new Error('Quota exceeded');
}
```

### Quota Updates
- **On Upload**: Add original file size to quota
- **On Delete**: Subtract original file size from quota
- Quota is tied to fingerprint, not user account

## Limitations & Considerations

### Discord Webhook Limitations
1. **No Message Deletion**: Discord webhooks cannot delete messages
   - Deleted files only remove metadata, not Discord messages
   - Quota is still reclaimed when metadata is deleted
   - Old messages remain in Discord channel but are inaccessible

2. **Rate Limits**: 
   - Discord has rate limits for webhooks (~5 requests/second)
   - System includes 500ms delay between chunks
   - Large files may take time to upload

3. **CDN URLs**:
   - Discord CDN URLs are permanent
   - Files remain downloadable even if metadata is deleted
   - URLs are stored in localStorage for access

### Browser Storage
- Metadata stored in localStorage
- Large file lists may approach localStorage limits (5-10MB typical)
- Fingerprint-based, so clearing localStorage loses file access

### Compression
- Gzip compression requires modern browsers (2020+)
- Falls back to uncompressed if `CompressionStream` unavailable
- Pre-compressed files (zip, jpg, mp4) see minimal benefit

## Example Usage

### Basic Upload Flow
```typescript
// 1. Select file
const file = document.getElementById('fileInput').files[0];

// 2. Check quota
const quota = await getQuotaInfo();
if (quota.availableBytes < file.size) {
  alert('Not enough space!');
  return;
}

// 3. Upload with progress
const metadata = await uploadFile(file, (progress) => {
  updateProgressBar(progress.percent);
});

// 4. File is now stored and quota updated
```

### Download Flow
```typescript
// 1. Get file metadata
const metadata = await getFileMetadata(fileId);

// 2. Download and decompress
const blob = await downloadFile(fileId, (progress) => {
  console.log(`Downloading: ${progress.downloadedBytes}/${progress.totalBytes}`);
});

// 3. Create download link
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = metadata.fileName;
a.click();
```

## Security & Privacy

### Fingerprinting
- Uses `@fingerprintjs/fingerprintjs` for stable device IDs
- No server-side storage of fingerprints
- Fingerprints are hashed on client-side
- Fallback to localStorage UUID if fingerprinting fails

### File Privacy
- Files stored in Discord channel (public/private depending on webhook setup)
- Metadata in localStorage (client-side only)
- No server-side database of file metadata
- Discord CDN URLs are publicly accessible if someone has the link

### Webhook Security
- Webhook URL is hardcoded in source (read-only for uploads)
- No authentication required for uploads
- Malicious actors could abuse webhook if URL is exposed
- Consider implementing server-side proxy for production

## Future Enhancements

### Potential Improvements
1. **Server-Side Proxy**: Hide webhook URL, add authentication
2. **Encryption**: Encrypt files before upload for privacy
3. **Multiple Webhooks**: Load balancing across multiple Discord servers
4. **Telegram Integration**: Add Telegram as alternative backend
5. **Shared Storage**: Allow quota pooling for teams
6. **File Versioning**: Keep multiple versions of files
7. **Folder Organization**: Add virtual folder structure

### Known Issues
1. **Message Cleanup**: Deleted files leave messages in Discord (webhook limitation)
2. **localStorage Limits**: Large file lists may hit storage limits
3. **No Sync**: Files don't sync across devices (fingerprint-based)

## Comparison with Disbox

### Similarities
- Discord webhooks as storage backend
- Chunked uploads for large files
- Metadata management
- Free storage using Discord infrastructure

### Differences
1. **Quota System**: Bellum uses fingerprint-based quotas (4GB/device) vs. Disbox's unlimited
2. **Compression**: Bellum has built-in gzip compression pipeline
3. **Integration**: Bellum integrates with existing auth/storage systems
4. **UI**: Pixel art deep-ocean theme vs. Disbox's minimal UI
5. **Hybrid Storage**: Bellum supports both webhook and API-based storage

## Credits

- Inspired by [Disbox](https://github.com/DisboxApp/web)
- Fingerprinting via [@fingerprintjs/fingerprintjs](https://github.com/fingerprintjs/fingerprintjs)
- Compression using native browser APIs

## Support

For issues or questions:
1. Check browser console for detailed logs
2. Verify Discord webhook URL is accessible
3. Clear localStorage to reset quota (loses file access)
4. Ensure modern browser with CompressionStream support
