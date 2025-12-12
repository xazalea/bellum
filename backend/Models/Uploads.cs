namespace Bellum.Backend.Models;

public record UploadInitRequest(
    string FileName,
    long TotalBytes,
    int ChunkBytes,
    string? ContentType
);

public record UploadInitResponse(
    string UploadId,
    int ChunkBytes,
    int TotalChunks
);

public record UploadCompleteRequest(
    string UploadId
);

public record UploadCompleteResponse(
    string FileId,
    string ManifestPath,
    long TotalStoredBytes
);

public record FileManifest(
    string FileId,
    string FileName,
    long TotalBytes,
    int ChunkBytes,
    int TotalChunks,
    long CreatedAtUnixMs
);


