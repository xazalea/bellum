# Discord Webhook Storage - Quick Start Guide

## 🚀 Getting Started

Your Bellum project now has **4GB of free storage per device** using Discord webhooks!

## How to Use

### 1. Navigate to Storage Page
```
http://localhost:3000/storage
```

### 2. Upload a File
1. Select **"Discord Webhook (4GB Free)"** storage mode
2. Click **"Select File"** and choose a file
3. Click **"Upload File"**
4. Watch the progress: "Uploading chunk 1/3 (12.5 MB compressed)"
5. File appears in your list!

### 3. Check Your Quota
At the top of the page, you'll see:
```
Storage Quota
Fingerprint: a1b2c3d4e5f6...

2.1 GB / 4.0 GB (52.5% used)
[████████████████░░░░░░░░░░░░] 
1.9 GB available
```

### 4. Download a File
1. Find your file in the list
2. Click the **download** icon
3. File is automatically decompressed and downloaded!

### 5. Delete a File
1. Find a webhook storage file (blue "discord-webhook" badge)
2. Click the **delete** icon
3. Quota is automatically reclaimed!

## 🎯 Key Features

### Automatic Compression
- All files are compressed with gzip before upload
- Text files: ~70-90% smaller
- Binary files: ~10-40% smaller
- You see the original size, Discord stores the compressed version

### Smart Quota System
- **4GB per device** (based on browser fingerprint)
- Quota counts **original file size** (not compressed)
- This prevents confusion about how much space you've used
- Even though Discord stores less, you see the "real" file size

### No Authentication Required
- Uses browser fingerprint for identification
- No login needed for webhook storage
- Files are tied to your device
- Private and secure

## 📊 Storage Modes

### Discord Webhook (Recommended)
- ✅ 4GB free storage
- ✅ No authentication
- ✅ Automatic compression
- ✅ Fast uploads
- ❌ No sync across devices
- ❌ Can't delete Discord messages (only metadata)

### API Storage
- ✅ Sync across devices
- ✅ Full deletion support
- ❌ Requires authentication
- ❌ 5GB quota (user-based)

## 🔧 Technical Details

### Webhook URL
```
https://discord.com/api/webhooks/1462182344021770413/VAvTz9ibnGBLEhI3GRHFfbsyy0uw5AsLGihzbTrkorkvivBEiEDLg9s2fduZKIwDeqY9
```

### How It Works
1. **Fingerprint**: Your device gets a unique ID
2. **Compress**: File is compressed with gzip
3. **Chunk**: Split into 24MB pieces (Discord limit: 25MB)
4. **Upload**: Each chunk sent to Discord webhook
5. **Store**: Metadata saved in localStorage
6. **Quota**: Updated based on original file size

### File Storage
```
Browser localStorage:
  - File metadata (name, size, chunks, URLs)
  - Quota usage
  - Fingerprint ID

Discord:
  - Actual file chunks (compressed)
  - Permanent CDN URLs
```

## 🎨 UI Features

### Quota Display
- Visual progress bar
- Used/available space
- Percentage used
- Fingerprint ID (truncated)

### Upload Progress
- Real-time chunk tracking
- Compression ratio
- Upload speed
- Status messages

### File List
- File name and size
- Compression ratio (if applicable)
- Upload date
- Storage type badge
- Download/delete buttons

## 🧪 Testing

### Test Small File
```javascript
// Upload a 1MB text file
// Expected: ~90% compression
// Expected time: <1 second
```

### Test Large File
```javascript
// Upload a 100MB video file
// Expected: ~10% compression
// Expected chunks: 4-5
// Expected time: ~5 seconds
```

### Test Quota
```javascript
// Upload files until quota is full
// Expected: Error message when exceeding 4GB
// Expected: "Not enough storage" alert
```

## 🐛 Troubleshooting

### "Quota exceeded" error
- Check quota display at top of page
- Delete old files to reclaim space
- Each device gets 4GB (not shared)

### Upload fails
- Check browser console for errors
- Verify Discord webhook URL is accessible
- Try smaller file first
- Check internet connection

### Can't find uploaded files
- Files are tied to device/browser
- Check you're using same browser
- Check localStorage isn't cleared
- Verify fingerprint ID matches

### Compression not working
- Requires modern browser (2020+)
- Check for `CompressionStream` support
- Falls back to uncompressed if unavailable

## 📱 Browser Compatibility

### Supported Browsers
- ✅ Chrome 80+ (2020)
- ✅ Edge 80+ (2020)
- ✅ Safari 16.4+ (2023)
- ✅ Firefox 113+ (2023)

### Required Features
- `CompressionStream` / `DecompressionStream` (gzip)
- `crypto.subtle` (fingerprinting)
- `localStorage` (metadata)
- `fetch` API (uploads/downloads)

## 🔐 Security & Privacy

### What's Stored Where
- **localStorage**: File metadata, quota, fingerprint
- **Discord**: Compressed file chunks
- **Server**: Nothing (entirely client-side)

### Privacy Considerations
- Fingerprint is client-side only
- No server-side tracking
- Discord CDN URLs are public (if leaked)
- Consider encrypting sensitive files before upload

### Webhook Security
- Webhook URL is in source code (public)
- Anyone with URL can upload to channel
- Discord rate limits apply
- Consider server-side proxy for production

## 🎓 Advanced Usage

### Programmatic Upload
```typescript
import * as storage from '@/lib/storage/discord-webhook-storage';

// Upload
const metadata = await storage.uploadFile(file, (progress) => {
  console.log(`${progress.percent}%`);
});

// Download
const blob = await storage.downloadFile(metadata.fileId);

// Check quota
const quota = await storage.getQuotaInfo();
console.log(`${quota.usedBytes} / ${quota.limitBytes}`);
```

### Export Metadata (Backup)
```javascript
// Get all files
const files = await storage.listFiles();

// Export to JSON
const backup = JSON.stringify(files, null, 2);
localStorage.setItem('bellum_backup', backup);

// Download backup
const blob = new Blob([backup], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'bellum-storage-backup.json';
a.click();
```

## 📚 Documentation

- **Technical Docs**: See `DISCORD_WEBHOOK_STORAGE.md`
- **Integration Summary**: See `INTEGRATION_SUMMARY.md`
- **Source Code**: `lib/storage/discord-webhook-storage.ts`
- **UI Code**: `app/storage/page.tsx`

## 🎉 You're Ready!

Start uploading files and enjoy your 4GB of free storage! 🚀

For questions or issues, check the browser console for detailed logs.
