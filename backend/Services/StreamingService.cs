using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace Bellum.Backend.Services;

public class StreamingService
{
    private readonly Dictionary<string, StreamSession> _activeStreams = new();
    private readonly ILogger<StreamingService> _logger;

    public StreamingService(ILogger<StreamingService> logger)
    {
        _logger = logger;
    }

    public async Task<string> StartStreamAsync(string vmId, Dictionary<string, object>? config = null)
    {
        var streamId = Guid.NewGuid().ToString();
        var session = new StreamSession
        {
            StreamId = streamId,
            VmId = vmId,
            Config = config ?? new Dictionary<string, object>(),
            StartedAt = DateTime.UtcNow
        };

        _activeStreams[streamId] = session;
        _logger.LogInformation($"Started stream {streamId} for VM {vmId}");

        return streamId;
    }

    public async Task StopStreamAsync(string streamId)
    {
        if (_activeStreams.TryGetValue(streamId, out var session))
        {
            _activeStreams.Remove(streamId);
            _logger.LogInformation($"Stopped stream {streamId}");
        }
    }

    public async Task HandleStreamAsync(WebSocket webSocket, string vmId)
    {
        var buffer = new byte[1024 * 4];
        
        try
        {
            while (webSocket.State == WebSocketState.Open)
            {
                var result = await webSocket.ReceiveAsync(
                    new ArraySegment<byte>(buffer), 
                    CancellationToken.None
                );

                if (result.MessageType == WebSocketMessageType.Text)
                {
                    var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                    await ProcessStreamMessageAsync(webSocket, vmId, message);
                }
                else if (result.MessageType == WebSocketMessageType.Close)
                {
                    await webSocket.CloseAsync(
                        WebSocketCloseStatus.NormalClosure,
                        "Closed by client",
                        CancellationToken.None
                    );
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error handling stream for VM {vmId}");
        }
    }

    private async Task ProcessStreamMessageAsync(WebSocket webSocket, string vmId, string message)
    {
        try
        {
            var command = JsonSerializer.Deserialize<StreamCommand>(message);
            
            switch (command?.Type)
            {
                case "input":
                    // Forward input to emulator
                    await HandleInputAsync(vmId, command.Data);
                    break;
                case "request-frame":
                    // Send frame to client
                    await SendFrameAsync(webSocket, vmId);
                    break;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error processing stream message: {message}");
        }
    }

    private async Task HandleInputAsync(string vmId, JsonElement data)
    {
        // Process input and forward to emulator
        _logger.LogDebug($"Handling input for VM {vmId}");
    }

    private async Task SendFrameAsync(WebSocket webSocket, string vmId)
    {
        // In production, this would capture frames from the emulator
        // and send them via WebSocket
        var frame = new
        {
            type = "frame",
            vmId = vmId,
            timestamp = DateTime.UtcNow,
            data = "" // Base64 encoded frame data
        };

        var json = JsonSerializer.Serialize(frame);
        var bytes = Encoding.UTF8.GetBytes(json);
        
        await webSocket.SendAsync(
            new ArraySegment<byte>(bytes),
            WebSocketMessageType.Text,
            true,
            CancellationToken.None
        );
    }
}

public class StreamSession
{
    public string StreamId { get; set; } = string.Empty;
    public string VmId { get; set; } = string.Empty;
    public Dictionary<string, object> Config { get; set; } = new();
    public DateTime StartedAt { get; set; }
}

public class StreamCommand
{
    public string Type { get; set; } = string.Empty;
    public JsonElement Data { get; set; }
}

