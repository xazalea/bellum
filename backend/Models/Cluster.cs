namespace Bellum.Backend.Models;

public record ClusterHeartbeatRequest(
    string DeviceId,
    string? UserAgent,
    string? Label,
    double? Load
);

public record ClusterPeer(
    string UserId,
    string DeviceId,
    string? UserAgent,
    string? Label,
    double? Load,
    long LastSeenUnixMs
);


