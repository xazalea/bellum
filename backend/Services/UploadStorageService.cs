using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text.Json;
using Bellum.Backend.Models;

namespace Bellum.Backend.Services;

public class UploadStorageService
{
    private readonly ILogger<UploadStorageService> _logger;
    private readonly string _root;
    private readonly string _publicRoot;

    // In-memory session registry (also persisted to disk per session).
    private readonly ConcurrentDictionary<string, UploadSession> _sessions = new();

    // Per-user quota: 7GB (storage is only cluster-local, not Firebase Storage).
    private const long UserQuotaBytes = 7L * 1024 * 1024 * 1024;

    public UploadStorageService(ILogger<UploadStorageService> logger)
    {
        _logger = logger;
        _root = Path.Combine(AppContext.BaseDirectory, "App_Data", "files");
        _publicRoot = Path.Combine(AppContext.BaseDirectory, "App_Data", "public_files");
        Directory.CreateDirectory(_root);
        Directory.CreateDirectory(_publicRoot);
    }

    public UploadInitResponse Init(string userId, UploadInitRequest req)
    {
        if (string.IsNullOrWhiteSpace(userId)) throw new ArgumentException("userId required");
        if (req.TotalBytes <= 0) throw new ArgumentException("TotalBytes must be > 0");
        if (req.ChunkBytes <= 0 || req.ChunkBytes > 128 * 1024 * 1024) throw new ArgumentException("ChunkBytes out of range");

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
        for (var i = 0; i < session.TotalChunks; i++)
        {
            var src = Path.Combine(uploadDir, $"chunk_{i:D6}.bin");
            var dst = Path.Combine(fileDir, $"chunk_{i:D6}.bin");
            File.Move(src, dst, overwrite: true);
            storedBytes += new FileInfo(dst).Length;
        }

        // Persist manifest.
        var manifest = new FileManifest(
            FileId: fileId,
            FileName: session.FileName,
            TotalBytes: session.TotalBytes,
            ChunkBytes: session.ChunkBytes,
            TotalChunks: session.TotalChunks,
            CreatedAtUnixMs: session.CreatedAtUnixMs
        );

        var manifestPath = Path.Combine(fileDir, "manifest.json");
        await File.WriteAllTextAsync(manifestPath, JsonSerializer.Serialize(manifest, new JsonSerializerOptions { WriteIndented = true }));

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

    public Stream OpenChunkRead(string userId, string fileId, int chunkIndex)
    {
        var path = Path.Combine(GetFileDir(userId, fileId), $"chunk_{chunkIndex:D6}.bin");
        if (!File.Exists(path)) throw new FileNotFoundException("Chunk not found");
        return File.OpenRead(path);
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

    public Stream OpenPublicChunkRead(string fileId, int chunkIndex)
    {
        var path = Path.Combine(GetPublicFileDir(fileId), $"chunk_{chunkIndex:D6}.bin");
        if (!File.Exists(path)) throw new FileNotFoundException("Chunk not found");
        return File.OpenRead(path);
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
        TryDeleteDirectory(dir);
    }

    public long GetUserUsageBytes(string userId)
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
}


