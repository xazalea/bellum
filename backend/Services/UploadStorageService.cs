using System.Collections.Concurrent;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Bellum.Backend.Models;

namespace Bellum.Backend.Services;

public class UploadStorageService
{
    private readonly ILogger<UploadStorageService> _logger;
    private readonly IHttpClientFactory _http;
    private readonly IConfiguration _config;
    private readonly string _root;
    private readonly string _publicRoot;
    private readonly string _quotaRoot;

    // In-memory session registry (also persisted to disk per session).
    private readonly ConcurrentDictionary<string, UploadSession> _sessions = new();

    // Per-user cloud quota: 6GB (enforced regardless of backend; Telegram is primary).
    // Local/browser storage (OPFS) is not quota-limited.
    private const long UserQuotaBytes = 6L * 1024 * 1024 * 1024;

    public UploadStorageService(ILogger<UploadStorageService> logger, IHttpClientFactory http, IConfiguration config)
    {
        _logger = logger;
        _http = http;
        _config = config;
        _root = Path.Combine(AppContext.BaseDirectory, "App_Data", "files");
        _publicRoot = Path.Combine(AppContext.BaseDirectory, "App_Data", "public_files");
        _quotaRoot = Path.Combine(AppContext.BaseDirectory, "App_Data", "quota");
        Directory.CreateDirectory(_root);
        Directory.CreateDirectory(_publicRoot);
        Directory.CreateDirectory(_quotaRoot);
    }

    public UploadInitResponse Init(string userId, UploadInitRequest req)
    {
        if (string.IsNullOrWhiteSpace(userId)) throw new ArgumentException("userId required");
        if (req.TotalBytes <= 0) throw new ArgumentException("TotalBytes must be > 0");
        if (req.ChunkBytes <= 0 || req.ChunkBytes > 128 * 1024 * 1024) throw new ArgumentException("ChunkBytes out of range");

        // Telegram bot API has practical size limits; keep chunks conservative when enabled.
        if (IsTelegramEnabled() && req.ChunkBytes > 45 * 1024 * 1024)
        {
            throw new ArgumentException("ChunkBytes too large for Telegram storage. Use <= 45MB.");
        }

        var remaining = Math.Max(0, UserQuotaBytes - GetUserUsageBytes(userId));
        if (req.TotalBytes > remaining)
        {
            throw new InvalidOperationException($"Quota exceeded. Remaining bytes: {remaining}");
        }

        var uploadId = Guid.NewGuid().ToString("N");
        var totalChunks = (int)Math.Ceiling(req.TotalBytes / (double)req.ChunkBytes);

        var session = new UploadSession
        {
            UploadId = uploadId,
            UserId = userId,
            FileName = req.FileName,
            TotalBytes = req.TotalBytes,
            ChunkBytes = req.ChunkBytes,
            TotalChunks = totalChunks,
            CreatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            Received = new bool[totalChunks]
        };

        _sessions[uploadId] = session;
        PersistSession(session);

        Directory.CreateDirectory(GetUploadDir(uploadId));
        return new UploadInitResponse(uploadId, req.ChunkBytes, totalChunks);
    }

    public async Task PutChunkAsync(string userId, string uploadId, int chunkIndex, Stream body, string? chunkSha256Hex)
    {
        var session = GetSession(uploadId);
        if (!string.Equals(session.UserId, userId, StringComparison.Ordinal)) throw new UnauthorizedAccessException("Invalid user");
        if (chunkIndex < 0 || chunkIndex >= session.TotalChunks) throw new ArgumentOutOfRangeException(nameof(chunkIndex));

        var uploadDir = GetUploadDir(uploadId);
        Directory.CreateDirectory(uploadDir);

        var chunkPath = Path.Combine(uploadDir, $"chunk_{chunkIndex:D6}.bin");

        await using var file = File.Create(chunkPath);
        await body.CopyToAsync(file);
        await file.FlushAsync();

        if (!string.IsNullOrWhiteSpace(chunkSha256Hex))
        {
            var actual = await ComputeSha256HexAsync(chunkPath);
            if (!actual.Equals(chunkSha256Hex.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                File.Delete(chunkPath);
                throw new InvalidOperationException("Chunk hash mismatch");
            }
        }

        session.Received[chunkIndex] = true;
        PersistSession(session);
    }

    public async Task<UploadCompleteResponse> CompleteAsync(string userId, UploadCompleteRequest req)
    {
        var session = GetSession(req.UploadId);
        if (!string.Equals(session.UserId, userId, StringComparison.Ordinal)) throw new UnauthorizedAccessException("Invalid user");

        if (session.Received.Any(r => !r))
        {
            throw new InvalidOperationException("Not all chunks uploaded");
        }

        var fileId = Guid.NewGuid().ToString("N");
        var fileDir = GetFileDir(userId, fileId);
        Directory.CreateDirectory(fileDir);

        // Move chunks into canonical file directory.
        var uploadDir = GetUploadDir(req.UploadId);
        long storedBytes = 0;
        var chunkLocators = new List<ChunkLocator>(session.TotalChunks);
        for (var i = 0; i < session.TotalChunks; i++)
        {
            var src = Path.Combine(uploadDir, $"chunk_{i:D6}.bin");
            var dst = Path.Combine(fileDir, $"chunk_{i:D6}.bin");
            File.Move(src, dst, overwrite: true);
            var size = new FileInfo(dst).Length;
            storedBytes += size;
            chunkLocators.Add(new ChunkLocator(i, size, Sha256Hex: null, TelegramFileId: null, TelegramMessageId: null));
        }

        // Optional: Offload chunks to Telegram storage (unlimited remote) while still enforcing quota locally.
        var storageBackend = "disk";
        if (IsTelegramEnabled())
        {
            try
            {
                storageBackend = "telegram";
                for (var i = 0; i < session.TotalChunks; i++)
                {
                    var chunkPath = Path.Combine(fileDir, $"chunk_{i:D6}.bin");
                    var (fileIdTelegram, messageId) = await UploadChunkToTelegramAsync(userId, fileId, i, session.FileName, chunkPath);
                    chunkLocators[i] = chunkLocators[i] with { TelegramFileId = fileIdTelegram, TelegramMessageId = messageId };

                    // Reclaim local disk. Quota is tracked via ledger, not disk usage.
                    try { File.Delete(chunkPath); } catch { /* ignore */ }
                }
            }
            catch (Exception e)
            {
                // If Telegram fails, keep disk chunks and fall back to disk backend.
                _logger.LogWarning(e, "Telegram offload failed; keeping disk chunks for file {FileId}", fileId);
                storageBackend = "disk";
            }
        }

        // Persist manifest.
        var manifest = new FileManifest(
            FileId: fileId,
            FileName: session.FileName,
            TotalBytes: session.TotalBytes,
            ChunkBytes: session.ChunkBytes,
            TotalChunks: session.TotalChunks,
            CreatedAtUnixMs: session.CreatedAtUnixMs,
            StoredBytes: storedBytes,
            StorageBackend: storageBackend,
            Chunks: chunkLocators.ToArray()
        );

        var manifestPath = Path.Combine(fileDir, "manifest.json");
        await File.WriteAllTextAsync(manifestPath, JsonSerializer.Serialize(manifest, new JsonSerializerOptions { WriteIndented = true }));

        // Update quota ledger (do NOT rely on disk usage because chunks may be offloaded).
        AddUsageBytes(userId, storedBytes);

        // Cleanup upload dir + session file.
        TryDeleteDirectory(uploadDir);
        TryDeleteSession(req.UploadId);

        return new UploadCompleteResponse(fileId, manifestPath, storedBytes);
    }

    public FileManifest GetManifest(string userId, string fileId)
    {
        var manifestPath = Path.Combine(GetFileDir(userId, fileId), "manifest.json");
        if (!File.Exists(manifestPath)) throw new FileNotFoundException("Manifest not found");
        var json = File.ReadAllText(manifestPath);
        var manifest = JsonSerializer.Deserialize<FileManifest>(json);
        if (manifest is null) throw new InvalidOperationException("Invalid manifest");
        return manifest;
    }

    public async Task<Stream> OpenChunkReadAsync(string userId, string fileId, int chunkIndex)
    {
        var dir = GetFileDir(userId, fileId);
        var path = Path.Combine(dir, $"chunk_{chunkIndex:D6}.bin");
        if (File.Exists(path))
        {
            return File.OpenRead(path);
        }

        // Fallback to Telegram if manifest has locators.
        var manifest = GetManifest(userId, fileId);
        var loc = manifest.Chunks?.FirstOrDefault(c => c.Index == chunkIndex);
        if (loc is null || string.IsNullOrWhiteSpace(loc.TelegramFileId))
        {
            throw new FileNotFoundException("Chunk not found");
        }

        return await DownloadChunkFromTelegramAsync(loc.TelegramFileId);
    }

    public FileManifest GetPublicManifest(string fileId)
    {
        var manifestPath = Path.Combine(GetPublicFileDir(fileId), "manifest.json");
        if (!File.Exists(manifestPath)) throw new FileNotFoundException("Manifest not found");
        var json = File.ReadAllText(manifestPath);
        var manifest = JsonSerializer.Deserialize<FileManifest>(json);
        if (manifest is null) throw new InvalidOperationException("Invalid manifest");
        return manifest;
    }

    public async Task<Stream> OpenPublicChunkReadAsync(string fileId, int chunkIndex)
    {
        var dir = GetPublicFileDir(fileId);
        var path = Path.Combine(dir, $"chunk_{chunkIndex:D6}.bin");
        if (File.Exists(path))
        {
            return File.OpenRead(path);
        }

        var manifest = GetPublicManifest(fileId);
        var loc = manifest.Chunks?.FirstOrDefault(c => c.Index == chunkIndex);
        if (loc is null || string.IsNullOrWhiteSpace(loc.TelegramFileId))
        {
            throw new FileNotFoundException("Chunk not found");
        }
        return await DownloadChunkFromTelegramAsync(loc.TelegramFileId);
    }

    public void PromoteToPublic(string userId, string fileId)
    {
        var srcDir = GetFileDir(userId, fileId);
        if (!Directory.Exists(srcDir)) throw new DirectoryNotFoundException("File not found");

        var dstDir = GetPublicFileDir(fileId);
        if (Directory.Exists(dstDir))
        {
            // Already public.
            return;
        }

        Directory.CreateDirectory(dstDir);
        CopyDirectory(srcDir, dstDir);
    }

    public void DeleteUserFile(string userId, string fileId)
    {
        var dir = GetFileDir(userId, fileId);
        if (!Directory.Exists(dir)) return;
        try
        {
            var manifest = GetManifest(userId, fileId);
            if (manifest.StoredBytes > 0) AddUsageBytes(userId, -manifest.StoredBytes);
        }
        catch { /* ignore */ }
        TryDeleteDirectory(dir);
    }

    public long GetUserUsageBytes(string userId)
    {
        // Prefer explicit ledger (works even when chunks are offloaded to Telegram).
        var ledgerPath = GetQuotaLedgerPath(userId);
        if (File.Exists(ledgerPath))
        {
            try
            {
                var json = File.ReadAllText(ledgerPath);
                var ledger = JsonSerializer.Deserialize<QuotaLedger>(json);
                if (ledger is not null) return Math.Max(0, ledger.UsedBytes);
            }
            catch { /* ignore */ }
        }

        // Fallback (legacy): compute from disk once.
        return ComputeLegacyDiskUsageBytes(userId);
    }

    private string GetQuotaLedgerPath(string userId) =>
        Path.Combine(_quotaRoot, $"{userId}.json");

    private void AddUsageBytes(string userId, long delta)
    {
        var path = GetQuotaLedgerPath(userId);
        QuotaLedger ledger;
        try
        {
            if (File.Exists(path))
            {
                ledger = JsonSerializer.Deserialize<QuotaLedger>(File.ReadAllText(path)) ?? new QuotaLedger();
            }
            else
            {
                // Seed from disk once for migrations, so existing files count toward quota.
                ledger = new QuotaLedger { UsedBytes = ComputeLegacyDiskUsageBytes(userId) };
            }
        }
        catch
        {
            ledger = new QuotaLedger { UsedBytes = ComputeLegacyDiskUsageBytes(userId) };
        }

        ledger.UsedBytes = Math.Max(0, ledger.UsedBytes + delta);
        ledger.UpdatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, JsonSerializer.Serialize(ledger));
    }

    private long ComputeLegacyDiskUsageBytes(string userId)
    {
        var userDir = Path.Combine(_root, userId);
        if (!Directory.Exists(userDir)) return 0;
        long total = 0;
        foreach (var file in Directory.EnumerateFiles(userDir, "*", SearchOption.AllDirectories))
        {
            try { total += new FileInfo(file).Length; } catch { /* ignore */ }
        }
        return total;
    }

    private bool IsTelegramEnabled()
    {
        var token = _config["TELEGRAM_BOT_TOKEN"] ?? Environment.GetEnvironmentVariable("TELEGRAM_BOT_TOKEN");
        var chatId = _config["TELEGRAM_STORAGE_CHAT_ID"] ?? Environment.GetEnvironmentVariable("TELEGRAM_STORAGE_CHAT_ID");
        return !string.IsNullOrWhiteSpace(token) && !string.IsNullOrWhiteSpace(chatId);
    }

    private (string Token, string ChatId) GetTelegramConfig()
    {
        var token = _config["TELEGRAM_BOT_TOKEN"] ?? Environment.GetEnvironmentVariable("TELEGRAM_BOT_TOKEN") ?? "";
        var chatId = _config["TELEGRAM_STORAGE_CHAT_ID"] ?? Environment.GetEnvironmentVariable("TELEGRAM_STORAGE_CHAT_ID") ?? "";
        if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(chatId))
            throw new InvalidOperationException("Telegram storage not configured");
        return (token.Trim(), chatId.Trim());
    }

    private async Task<(string TelegramFileId, int TelegramMessageId)> UploadChunkToTelegramAsync(
        string userId,
        string fileId,
        int chunkIndex,
        string originalFileName,
        string chunkPath)
    {
        var (token, chatId) = GetTelegramConfig();
        var client = _http.CreateClient();

        var url = $"https://api.telegram.org/bot{token}/sendDocument";

        using var form = new MultipartFormDataContent();
        form.Add(new StringContent(chatId), "chat_id");
        form.Add(new StringContent($"nacho:{userId}:{fileId}:{chunkIndex:D6}:{originalFileName}"), "caption");

        await using var fs = File.OpenRead(chunkPath);
        var fileContent = new StreamContent(fs);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
        form.Add(fileContent, "document", $"nacho_{fileId}_chunk_{chunkIndex:D6}.bin");

        var resp = await client.PostAsync(url, form);
        var body = await resp.Content.ReadAsStringAsync();
        if (!resp.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Telegram upload failed: {resp.StatusCode} {body}");
        }

        using var doc = JsonDocument.Parse(body);
        var ok = doc.RootElement.TryGetProperty("ok", out var okEl) && okEl.GetBoolean();
        if (!ok) throw new InvalidOperationException("Telegram upload failed: ok=false");

        var result = doc.RootElement.GetProperty("result");
        var messageId = result.GetProperty("message_id").GetInt32();
        var telegramFileId = result.GetProperty("document").GetProperty("file_id").GetString();
        if (string.IsNullOrWhiteSpace(telegramFileId)) throw new InvalidOperationException("Telegram upload missing file_id");
        return (telegramFileId!, messageId);
    }

    private async Task<Stream> DownloadChunkFromTelegramAsync(string telegramFileId)
    {
        var (token, _) = GetTelegramConfig();
        var client = _http.CreateClient();

        // Step 1: get file path
        var getFileUrl = $"https://api.telegram.org/bot{token}/getFile?file_id={Uri.EscapeDataString(telegramFileId)}";
        var metaResp = await client.GetAsync(getFileUrl);
        var metaBody = await metaResp.Content.ReadAsStringAsync();
        if (!metaResp.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Telegram getFile failed: {metaResp.StatusCode} {metaBody}");
        }

        using var metaJson = JsonDocument.Parse(metaBody);
        var result = metaJson.RootElement.GetProperty("result");
        var filePath = result.GetProperty("file_path").GetString();
        if (string.IsNullOrWhiteSpace(filePath)) throw new InvalidOperationException("Telegram getFile missing file_path");

        // Step 2: download file bytes
        var downloadUrl = $"https://api.telegram.org/file/bot{token}/{filePath}";
        var fileResp = await client.GetAsync(downloadUrl);
        if (!fileResp.IsSuccessStatusCode)
        {
            var err = await fileResp.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"Telegram download failed: {fileResp.StatusCode} {err}");
        }

        // Buffer in memory; chunks are capped by ChunkBytes.
        var ms = new MemoryStream();
        await fileResp.Content.CopyToAsync(ms);
        ms.Position = 0;
        return ms;
    }

    private UploadSession GetSession(string uploadId)
    {
        if (_sessions.TryGetValue(uploadId, out var s)) return s;
        // Try hydrate from disk
        var sessionPath = GetSessionPath(uploadId);
        if (File.Exists(sessionPath))
        {
            var json = File.ReadAllText(sessionPath);
            var hydrated = JsonSerializer.Deserialize<UploadSession>(json);
            if (hydrated is not null)
            {
                _sessions[uploadId] = hydrated;
                return hydrated;
            }
        }
        throw new KeyNotFoundException("Upload session not found");
    }

    private void PersistSession(UploadSession session)
    {
        var path = GetSessionPath(session.UploadId);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, JsonSerializer.Serialize(session));
    }

    private void TryDeleteSession(string uploadId)
    {
        _sessions.TryRemove(uploadId, out _);
        try { File.Delete(GetSessionPath(uploadId)); } catch { /* ignore */ }
    }

    private string GetSessionPath(string uploadId) =>
        Path.Combine(AppContext.BaseDirectory, "App_Data", "sessions", $"{uploadId}.json");

    private string GetUploadDir(string uploadId) =>
        Path.Combine(AppContext.BaseDirectory, "App_Data", "uploads", uploadId);

    private string GetFileDir(string userId, string fileId) =>
        Path.Combine(_root, userId, fileId);

    private string GetPublicFileDir(string fileId) =>
        Path.Combine(_publicRoot, fileId);

    private static void TryDeleteDirectory(string dir)
    {
        try
        {
            if (Directory.Exists(dir)) Directory.Delete(dir, recursive: true);
        }
        catch { /* ignore */ }
    }

    private static void CopyDirectory(string sourceDir, string targetDir)
    {
        Directory.CreateDirectory(targetDir);
        foreach (var file in Directory.EnumerateFiles(sourceDir, "*", SearchOption.TopDirectoryOnly))
        {
            var name = Path.GetFileName(file);
            File.Copy(file, Path.Combine(targetDir, name), overwrite: true);
        }
        foreach (var dir in Directory.EnumerateDirectories(sourceDir, "*", SearchOption.TopDirectoryOnly))
        {
            var name = Path.GetFileName(dir);
            CopyDirectory(dir, Path.Combine(targetDir, name));
        }
    }

    private static async Task<string> ComputeSha256HexAsync(string path)
    {
        await using var fs = File.OpenRead(path);
        using var sha = SHA256.Create();
        var hash = await sha.ComputeHashAsync(fs);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private sealed class UploadSession
    {
        public string UploadId { get; set; } = "";
        public string UserId { get; set; } = "";
        public string FileName { get; set; } = "";
        public long TotalBytes { get; set; }
        public int ChunkBytes { get; set; }
        public int TotalChunks { get; set; }
        public long CreatedAtUnixMs { get; set; }
        public bool[] Received { get; set; } = Array.Empty<bool>();
    }

    private sealed class QuotaLedger
    {
        public long UsedBytes { get; set; }
        public long UpdatedAtUnixMs { get; set; }
    }
}


