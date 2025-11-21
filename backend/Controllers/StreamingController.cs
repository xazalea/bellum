using Microsoft.AspNetCore.Mvc;
using Bellum.Backend.Services;
using System.Net.WebSockets;

namespace Bellum.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StreamingController : ControllerBase
{
    private readonly StreamingService _streamingService;
    private readonly ILogger<StreamingController> _logger;

    public StreamingController(
        StreamingService streamingService,
        ILogger<StreamingController> logger)
    {
        _streamingService = streamingService;
        _logger = logger;
    }

    [HttpGet("stream/{vmId}")]
    public async Task StreamVM(string vmId)
    {
        if (HttpContext.WebSockets.IsWebSocketRequest)
        {
            var webSocket = await HttpContext.WebSockets.AcceptWebSocketAsync();
            await _streamingService.HandleStreamAsync(webSocket, vmId);
        }
        else
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
        }
    }

    [HttpPost("start-stream")]
    public async Task<IActionResult> StartStream([FromBody] StreamRequest request)
    {
        try
        {
            var streamId = await _streamingService.StartStreamAsync(
                request.VmId,
                request.Config
            );
            return Ok(new { streamId, wsUrl = $"/api/streaming/stream/{request.VmId}" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting stream");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("stop-stream")]
    public async Task<IActionResult> StopStream([FromBody] StopStreamRequest request)
    {
        try
        {
            await _streamingService.StopStreamAsync(request.StreamId);
            return Ok(new { message = "Stream stopped" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error stopping stream");
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

