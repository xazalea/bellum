using System.Collections.Concurrent;
using Bellum.Backend.Models;

namespace Bellum.Backend.Services;

public class ClusterPresenceService
{
    private readonly ConcurrentDictionary<string, ClusterPeer> _peers = new();

    // Consider a peer "online" if seen within last 60s.
    private const long OnlineWindowMs = 60_000;

    public void Heartbeat(string userId, ClusterHeartbeatRequest req)
    {
        if (string.IsNullOrWhiteSpace(userId)) throw new ArgumentException("userId required");
        if (string.IsNullOrWhiteSpace(req.DeviceId)) throw new ArgumentException("deviceId required");

        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var key = $"{userId}:{req.DeviceId}";
        _peers[key] = new ClusterPeer(
            UserId: userId,
            DeviceId: req.DeviceId,
            UserAgent: req.UserAgent,
            Label: req.Label,
            Load: req.Load,
            LastSeenUnixMs: now
        );
    }

    public IReadOnlyList<ClusterPeer> ListOnline()
    {
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        return _peers.Values
            .Where(p => now - p.LastSeenUnixMs <= OnlineWindowMs)
            .OrderByDescending(p => p.LastSeenUnixMs)
            .ToList();
    }
}


