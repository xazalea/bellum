using Bellum.Backend.Models;
using Bellum.Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Bellum.Backend.Controllers;

[ApiController]
[Route("api/cluster")]
public class ClusterController : ControllerBase
{
    private readonly ClusterPresenceService _presence;

    public ClusterController(ClusterPresenceService presence)
    {
        _presence = presence;
    }

    private string RequireUserId()
    {
        var uid = User?.FindFirst("user_id")?.Value
                  ?? User?.FindFirst("sub")?.Value
                  ?? Request.Headers["X-Nacho-UserId"].ToString();
        if (string.IsNullOrWhiteSpace(uid)) throw new UnauthorizedAccessException("Missing user id");
        return uid;
    }

    [HttpPost("heartbeat")]
    public IActionResult Heartbeat([FromBody] ClusterHeartbeatRequest req)
    {
        try
        {
            var userId = RequireUserId();
            _presence.Heartbeat(userId, req);
            return Ok(new { ok = true });
        }
        catch (UnauthorizedAccessException e)
        {
            return Unauthorized(new { error = e.Message });
        }
        catch (Exception e)
        {
            return BadRequest(new { error = e.Message });
        }
    }

    [HttpGet("peers")]
    public IActionResult Peers()
    {
        try
        {
            _ = RequireUserId(); // require auth to view peers
            return Ok(_presence.ListOnline());
        }
        catch (UnauthorizedAccessException e)
        {
            return Unauthorized(new { error = e.Message });
        }
    }
}

