namespace Bellum.Backend.Models;

public class DiskImageRequest
{
    public string Url { get; set; } = string.Empty;
    public string Format { get; set; } = string.Empty; // iso, img, vhd, etc.
    public string? TargetFormat { get; set; }
}

public class StateOptimizationRequest
{
    public byte[] StateData { get; set; } = Array.Empty<byte>();
    public int CompressionLevel { get; set; } = 6;
}

public class AppExtractionRequest
{
    public string Url { get; set; } = string.Empty;
    public string AppType { get; set; } = string.Empty; // apk, msi, deb, etc.
}

public class CompatibilityPatchRequest
{
    public string Url { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public string[] Patches { get; set; } = Array.Empty<string>();
}

public class StreamRequest
{
    public string VmId { get; set; } = string.Empty;
    public Dictionary<string, object>? Config { get; set; }
}

public class StopStreamRequest
{
    public string StreamId { get; set; } = string.Empty;
}

